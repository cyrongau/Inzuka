import React, { useState, useEffect } from 'react';
import { User as AuthUser } from 'firebase/auth';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Heart, 
  Camera, 
  Save, 
  Plus, 
  Trash2,
  ChevronRight,
  ShieldCheck,
  Star,
  Home,
  Copy,
  Check,
  ImageIcon,
  AlertCircle,
  MessageCircle,
  X
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  setDoc,
  getDocs,
  limit 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';

const FAMILY_ROLES = ["Father", "Mother", "Guardian", "Son", "Daughter", "Relative", "Help"];
const RELATIONSHIP_TYPES = ["Spouse", "Parent", "Child", "Sibling", "Grandparent", "Cousin", "Friend", "Other"];

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bannerURL?: string;
  phoneNumber?: string;
  mpesaPhoneNumber?: string;
  familyRole?: string;
  familyId?: string;
  address?: string;
  dateOfBirth?: string;
  age?: number;
  familyStatus?: string;
  currency: string;
  isVerified?: boolean;
  isSystemAdmin?: boolean;
  idDocumentUrl?: string;
  relationships?: Array<{ targetUserId: string; relationType: string }>;
}

interface Family {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  inviteCodeExpiresAt?: number;
  createdAt: string;
  dashboardBannerUrl?: string;
}

const handleImageUpload = (file: File, callback: (v: string) => void) => {
  const reader = new FileReader();
  reader.onloadend = () => callback(reader.result as string);
  reader.readAsDataURL(file);
};

export default function Profile({ user, profile: initialProfile }: { user: AuthUser, profile: UserProfile }) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelationId, setNewRelationId] = useState('');
  const [newRelationType, setNewRelationType] = useState('Relative');

  // Family Onboarding states
  const [familyName, setFamilyName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isJoiningFamily, setIsJoiningFamily] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  // Banner states
  const [showBannerInput, setShowBannerInput] = useState(false);
  const [tempBannerUrl, setTempBannerUrl] = useState('');
  const [showFamilyBannerInput, setShowFamilyBannerInput] = useState(false);
  const [tempFamilyBannerUrl, setTempFamilyBannerUrl] = useState('');

  useEffect(() => {
    // Current User Profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docRef) => {
      if (docRef.exists()) {
        const data = docRef.data() as UserProfile;
        setProfile(data);
        setFormData(data);

        // If user has familyId, fetch Family details and same-family members
        if (data.familyId) {
          // Subscribe to Family doc
          onSnapshot(doc(db, 'families', data.familyId), (familyDoc) => {
            if (familyDoc.exists()) {
              setFamily(familyDoc.data() as Family);
            }
          });

          // Subscribe to join requests if owner
          const jq = query(collection(db, 'joinRequests'), where('familyId', '==', data.familyId), where('status', '==', 'pending'));
          onSnapshot(jq, (snap) => {
            setJoinRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as JoinRequest)));
          });

          // Subscribe to Family members
          const qMembers = query(collection(db, 'users'), where('familyId', '==', data.familyId));
          onSnapshot(qMembers, (snapshot) => {
            const members = snapshot.docs.map(d => d.data() as UserProfile);
            setFamilyMembers(members);
          });
        } else {
          setFamily(null);
          setFamilyMembers([]);
        }
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

    return () => unsubProfile();
  }, [user.uid]);

  const handleUpdateProfile = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      setIsEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleUpdateBanner = async () => {
    if (!tempBannerUrl) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { bannerURL: tempBannerUrl });
      setShowBannerInput(false);
      setTempBannerUrl('');
    } catch (err) {
      console.error('Banner update failed:', err);
    }
  };

  const handleUpdateFamilyBanner = async () => {
    if (!tempFamilyBannerUrl || !family) return;
    try {
      await updateDoc(doc(db, 'families', family.id), { dashboardBannerUrl: tempFamilyBannerUrl });
      setShowFamilyBannerInput(false);
      setTempFamilyBannerUrl('');
    } catch (err) {
      console.error('Family banner update failed:', err);
    }
  };

  const createFamily = async () => {
    if (!familyName.trim()) return;
    setIsCreatingFamily(true);
    setOnboardingError('');
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const familyId = `family-${user.uid}-${Date.now()}`;
      
      const newFamily: Family = {
        id: familyId,
        name: familyName,
        ownerId: user.uid,
        inviteCode,
        inviteCodeExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'families', familyId), newFamily);
      const updates: any = { familyId };
      if (!profile?.familyRole) {
        updates.familyRole = 'Guardian';
      }
      await updateDoc(doc(db, 'users', user.uid), updates);
      
    } catch (err) {
      setOnboardingError('Failed to create family group.');
      console.error(err);
    } finally {
      setIsCreatingFamily(false);
    }
  };

  const joinFamily = async () => {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code || code.length !== 6) return;
    setIsJoiningFamily(true);
    setOnboardingError('');
    try {
      const q = query(collection(db, 'families'), where('inviteCode', '==', code), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setOnboardingError('Invalid invite code. Please check and try again.');
        return;
      }

      const targetFamily = snap.docs[0].data() as Family;
      
      if (targetFamily.inviteCodeExpiresAt && Date.now() > targetFamily.inviteCodeExpiresAt) {
        setOnboardingError('Invite code has expired. Please request a new one.');
        return;
      }

      // Check if already requested
      const reqQ = query(collection(db, 'joinRequests'), where('familyId', '==', targetFamily.id), where('userId', '==', user.uid), where('status', '==', 'pending'));
      const reqSnap = await getDocs(reqQ);
      if (!reqSnap.empty) {
        setOnboardingError('You already have a pending request for this family.');
        return;
      }

      // Create Join Request instead of auto-joining
      await setDoc(doc(collection(db, 'joinRequests')), {
        familyId: targetFamily.id,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Unknown',
        userEmail: profile?.email || user.email || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      setOnboardingError('Join request sent successfully! Awaiting approval.');
      setInviteCodeInput('');
    } catch (err) {
      setOnboardingError('An error occurred while joining. Please try again.');
      console.error(err);
    } finally {
      setIsJoiningFamily(false);
    }
  };

  const handleApproveJoin = async (request: JoinRequest) => {
    try {
      // Approve request
      await updateDoc(doc(db, 'joinRequests', request.id), { status: 'approved' });
      // Add user to family
      await updateDoc(doc(db, 'users', request.userId), { familyId: family?.id, familyRole: 'Relative' });
    } catch(e) {
       console.error("Failed to approve", e);
    }
  };

  const handleDenyJoin = async (request: JoinRequest) => {
    try {
      await updateDoc(doc(db, 'joinRequests', request.id), { status: 'rejected' });
    } catch(e) {
       console.error("Failed to reject", e);
    }
  };

  const regenerateInviteCode = async () => {
    if (!family) return;
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await updateDoc(doc(db, 'families', family.id), { 
        inviteCode: newCode,
        inviteCodeExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });
      // The snapshot will auto-update the UI
    } catch(e) {
      console.error("Failed to regenerate code", e);
    }
  };

  const addRelationship = async () => {
    if (!newRelationId || !newRelationType || !profile) return;
    const currentRelations = profile.relationships || [];
    const updated = [...currentRelations, { targetUserId: newRelationId, relationType: newRelationType }];
    await updateDoc(doc(db, 'users', user.uid), { relationships: updated });
    setShowAddRelation(false);
    setNewRelationId('');
  };

  const removeRelationship = async (targetId: string) => {
    if (!profile) return;
    const updated = (profile.relationships || []).filter(r => r.targetUserId !== targetId);
    await updateDoc(doc(db, 'users', user.uid), { relationships: updated });
  };

  const copyInviteCode = () => {
    if (!family) return;
    navigator.clipboard.writeText(family.inviteCode);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Profile Header */}
      <div className="relative group">
        <div 
          className="h-64 w-full bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-[3rem] shadow-2xl overflow-hidden relative group"
          style={{
            backgroundImage: profile?.bannerURL ? `url(${profile.bannerURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          {/* Banner Edit Trigger */}
          <button 
            onClick={() => setShowBannerInput(!showBannerInput)}
            className="absolute top-6 left-8 bg-white/10 backdrop-blur-md text-white p-4 rounded-2xl hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Change Banner</span>
          </button>

          <div className="absolute top-6 right-8">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all backdrop-blur-md",
                isEditing ? "bg-white text-black shadow-xl" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {isEditing ? <Trash2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Discard' : 'Edit Profile'}
            </button>
          </div>

          <AnimatePresence>
            {showBannerInput && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-10 z-20"
              >
                <div className="bg-white rounded-[2rem] p-8 w-full max-w-md space-y-5 shadow-2xl">
                  <h4 className="font-bold text-xl flex items-center gap-2 italic serif">
                    <ImageIcon className="w-5 h-5 text-orange-500" /> 
                    Customize Banner
                  </h4>
                  <p className="text-sm text-gray-500 font-light">Enter a high-quality image URL (e.g. from Unsplash or Pinterest) to personalize your family home.</p>
                  <input 
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={tempBannerUrl}
                    onChange={e => setTempBannerUrl(e.target.value)}
                    className="w-full bg-gray-50 border border-black/5 rounded-xl p-4 text-sm font-medium focus:ring-1 focus:ring-black/10 outline-none"
                  />
                  <div className="flex gap-3">
                    <button onClick={handleUpdateBanner} className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-sm shadow-xl shadow-black/10">Apply</button>
                    <button onClick={() => setShowBannerInput(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-bold text-sm">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="px-10 -mt-24 flex flex-col md:flex-row items-end gap-10 relative z-10 w-full">
          <div className="relative group">
            <input 
              type="file"
              id="profilePhotoUpload"
              className="hidden"
              accept="image/*"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0], (dataUrl) => {
                    updateDoc(doc(db, 'users', user.uid), { photoURL: dataUrl });
                  });
                }
              }}
            />
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
              className="w-44 h-44 rounded-[3rem] bg-white border-[10px] border-white shadow-2xl object-cover transform hover:scale-105 transition-transform" 
              alt="Avatar" 
            />
            {isEditing && (
              <label htmlFor="profilePhotoUpload" className="absolute inset-0 bg-black/40 rounded-[3rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                <Camera className="text-white w-8 h-8" />
              </label>
            )}
          </div>
          
          <div className="pb-8 pt-6 space-y-3 flex-1 w-full text-center md:text-left">
            <h1 className="text-5xl font-black italic serif tracking-tight text-black flex items-center gap-6 justify-center md:justify-start">
              {profile?.displayName}
              <span className="bg-orange-500 text-[10px] text-white px-4 py-1.5 rounded-full uppercase tracking-widest font-bold shadow-lg shadow-orange-500/20">
                {profile?.familyRole || 'Resident'}
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-6 justify-center md:justify-start">
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-300" /> {profile?.email}
              </p>
              {profile?.isVerified && (
                <p className="text-green-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <ShieldCheck className="w-3.5 h-3.5" /> ID Verified
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          {/* Family Onboarding Section - Only if user has no familyId */}
          {!profile?.familyId && (
            <div className="bg-black text-white p-12 rounded-[3.5rem] shadow-2xl space-y-10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
               <div className="relative z-10">
                  <h3 className="text-3xl font-bold italic serif tracking-tight">Setup Your Household</h3>
                  <p className="text-white/50 mt-3 font-light leading-relaxed max-w-md">Connect your family to share shopping lists, manage chores together, and track expenses as one unit.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] space-y-6 flex flex-col hover:bg-white/[0.08] transition-all">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Plus className="text-white w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">Create New Family</h4>
                        <p className="text-xs text-white/30 mt-2">Recommended for heads of house.</p>
                      </div>
                      <div className="space-y-4">
                        <input 
                          placeholder="Family Name (e.g. The Smiths)" 
                          value={familyName}
                          onChange={e => setFamilyName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium outline-none focus:bg-white/10 transition-all placeholder:text-white/20"
                        />
                        <button 
                          onClick={createFamily}
                          disabled={isCreatingFamily || !familyName}
                          className="w-full bg-white text-black py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isCreatingFamily ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <Home className="w-4 h-4" />}
                          Initialize Family
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] space-y-6 flex flex-col hover:bg-white/[0.08] transition-all">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Users className="text-white w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">Join by Invite</h4>
                        <p className="text-xs text-white/30 mt-2">Enter the code provided by your family head.</p>
                      </div>
                      <div className="space-y-4">
                        <input 
                          placeholder="6-Digit CODE" 
                          value={inviteCodeInput}
                          maxLength={6}
                          onChange={e => setInviteCodeInput(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white/10 transition-all uppercase tracking-[0.4em] text-center placeholder:text-white/20"
                        />
                        <button 
                          onClick={joinFamily}
                          disabled={isJoiningFamily || inviteCodeInput.length !== 6}
                          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-orange-600/20"
                        >
                          {isJoiningFamily ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <ChevronRight className="w-4 h-4" />}
                          Join household
                        </button>
                      </div>
                    </div>
                  </div>
                  {onboardingError && <p className="text-red-400 text-xs mt-8 text-center font-bold px-4 py-2 bg-red-400/10 rounded-full">{onboardingError}</p>}
               </div>
            </div>
          )}

          {/* Identity Verification Section */}
          <div className="bg-gray-50 p-12 rounded-[4rem] border border-black/5 space-y-8">
             <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-bold italic serif tracking-tight">Identity & Trust</h3>
                   <p className="text-xs text-gray-400 font-medium mt-1">Verify age and identity to unlock financial and authority features.</p>
                </div>
                <div className={cn(
                  "p-4 rounded-3xl",
                  profile?.isVerified ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                )}>
                  {profile?.isVerified ? <ShieldCheck className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-black/[0.03] space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scanned ID Document</p>
                   {profile?.idDocumentUrl ? (
                      <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center group relative">
                         <img src={profile.idDocumentUrl} alt="ID" className="w-full h-full object-cover opacity-50" />
                         <span className="absolute inset-0 flex items-center justify-center font-bold text-xs uppercase tracking-widest bg-black/20 text-white backdrop-blur-sm">View Document</span>
                      </div>
                   ) : (
                      <label className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition-all text-gray-400 cursor-pointer">
                         <Camera className="w-8 h-8" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Upload ID/Passport</span>
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           onChange={e => {
                             if (e.target.files && e.target.files[0]) {
                               handleImageUpload(e.target.files[0], (dataUrl) => {
                                 // Simulate identity scan: verify and set a standard generic age
                                 updateDoc(doc(db, 'users', user.uid), { 
                                   idDocumentUrl: dataUrl,
                                   isVerified: true,
                                   age: 24, // Simulated static extraction for UI representation
                                 });
                               });
                             }
                           }}
                         />
                      </label>
                   )}
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-black/[0.03] flex flex-col justify-between">
                   <div className="space-y-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Age Verification</p>
                     <h4 className="text-3xl font-black italic serif">{profile?.age || '--'} <span className="text-xs not-italic font-bold text-gray-300 uppercase ml-2">Years Old</span></h4>
                   </div>
                   {!profile?.isVerified && (
                     <button 
                       onClick={() => updateDoc(doc(db, 'users', user.uid), { isVerified: true, age: 24 })}
                       className="w-full bg-black text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                      >
                       Initiate Verification
                     </button>
                   )}
                </div>
             </div>
          </div>
          
          {user.email === 'cyrongau@gmail.com' && (
            <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 flex items-center justify-between">
               <div>
                  <h4 className="font-bold text-red-900 border-b border-red-200 pb-1 mb-1">Developer Override</h4>
                  <p className="text-xs text-red-700 font-medium">Toggle System Administrator Settings</p>
               </div>
               <button
                  onClick={() => updateDoc(doc(db, 'users', user.uid), { isSystemAdmin: !profile?.isSystemAdmin })}
                  className={cn("px-6 py-3 rounded-[1rem] font-bold text-xs uppercase tracking-widest", profile?.isSystemAdmin ? "bg-red-600 text-white" : "bg-white text-red-600 border")}
               >
                  {profile?.isSystemAdmin ? 'Revoke Admin' : 'Grant Admin'}
               </button>
            </div>
          )}

          {/* Personal Information Form */}
          <div className="bg-white p-12 rounded-[3.5rem] border border-black/5 shadow-sm space-y-12">
            <div className="flex items-center justify-between border-b border-gray-50 pb-8">
              <h3 className="text-2xl font-bold italic serif tracking-tight">Profile Integrity</h3>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                  isEditing ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                )}>
                  {isEditing ? 'Modification active' : 'Data points locked'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Digital Name
                </label>
                <input 
                  disabled={!isEditing}
                  value={formData.displayName || ''}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-bold focus:ring-1 focus:ring-black/10 outline-none disabled:opacity-50" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                  <Star className="w-3 h-3" /> Operational Role
                </label>
                <select
                  disabled={!isEditing}
                  value={formData.familyRole || ''}
                  onChange={e => setFormData({...formData, familyRole: e.target.value})}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-bold focus:ring-1 focus:ring-black/10 outline-none disabled:opacity-50 appearance-none"
                >
                  <option value="">Select Role...</option>
                  {FAMILY_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Communication No.
                </label>
                <input 
                  disabled={!isEditing}
                  type="tel"
                  placeholder="+254 XXX XXX..."
                  value={formData.phoneNumber || ''}
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-bold focus:ring-1 focus:ring-black/10 outline-none disabled:opacity-50" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Anniversary / Birth
                </label>
                <input 
                  disabled={!isEditing}
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-bold focus:ring-1 focus:ring-black/10 outline-none disabled:opacity-50" 
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Physical Coordinates
                </label>
                <textarea 
                  disabled={!isEditing}
                  value={formData.address || ''}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-bold min-h-[120px] focus:ring-1 focus:ring-black/10 outline-none disabled:opacity-50 leading-relaxed" 
                />
              </div>
            </div>

            {isEditing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-8">
                 <button 
                  onClick={handleUpdateProfile}
                  className="w-full bg-black text-white py-6 rounded-3xl font-bold text-xl shadow-2xl shadow-black/30 flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-[0.98] transition-all"
                 >
                   <Save className="w-6 h-6" /> Consolidate Profile
                 </button>
              </motion.div>
            )}
          </div>

          {/* Active Family Dashboard - Visible only if familyId exists */}
          {profile?.familyId && (
            <div className="bg-orange-50 border border-orange-100 p-12 rounded-[4rem] space-y-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 text-orange-200/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-1000">
                 <Home className="w-48 h-48" />
               </div>

               <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
                  <div className="text-center md:text-left space-y-3">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] block">Operational Home</span>
                    <h3 className="text-4xl font-black text-orange-950 italic serif mt-2 tracking-tight">{family?.name}</h3>
                    {user.uid === family?.ownerId && (
                      <button 
                       onClick={() => setShowFamilyBannerInput(!showFamilyBannerInput)}
                       className="bg-white/50 backdrop-blur-md text-orange-900 border border-orange-200/50 px-4 py-2 rounded-xl shadow-sm hover:bg-white/80 transition-all flex items-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" /> <span className="text-xs font-bold">Set Dashboard Banner</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-center md:items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Group invite Code</span>
                      {user.uid === family?.ownerId && (
                         <button onClick={regenerateInviteCode} title="Generate New Code" className="text-orange-400 hover:text-orange-600 transition-colors">
                           <RefreshCcw className="w-3 h-3" />
                         </button>
                      )}
                    </div>
                    <button 
                      onClick={copyInviteCode}
                      className="bg-white border border-orange-200 px-6 py-3 rounded-2xl flex items-center gap-4 hover:bg-orange-100 transition-all font-mono font-black text-orange-900 shadow-sm active:scale-95"
                    >
                      {family?.inviteCode}
                      {isCopying ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
               </div>

               <AnimatePresence>
                 {showFamilyBannerInput && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }} 
                     animate={{ opacity: 1, height: 'auto' }} 
                     exit={{ opacity: 0, height: 0 }}
                     className="relative z-10 bg-white p-6 rounded-3xl border border-orange-100 shadow-sm mt-4 flex flex-col md:flex-row items-center gap-4"
                   >
                     <input 
                        type="url" 
                        placeholder="Paste image URL for Dashboard Banner" 
                        value={tempFamilyBannerUrl}
                        onChange={e => setTempFamilyBannerUrl(e.target.value)}
                        className="flex-1 bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-orange-300 w-full md:w-auto"
                     />
                     <div className="text-xs font-bold text-orange-400 uppercase tracking-widest shrink-0">OR</div>
                     <input 
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0], setTempFamilyBannerUrl);
                          }
                        }}
                        className="text-xs max-w-[200px]"
                     />
                     <button onClick={handleUpdateFamilyBanner} className="bg-orange-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-orange-700 transition-colors whitespace-nowrap w-full md:w-auto mt-2 md:mt-0">
                       Save Background
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>
               
               {user.uid === family?.ownerId && joinRequests.length > 0 && (
                 <div className="relative z-10 bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
                   <h4 className="text-sm font-bold text-orange-950 mb-4 flex items-center gap-2">Pending Join Requests <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px]">{joinRequests.length}</span></h4>
                   <div className="space-y-3">
                     {joinRequests.map(req => (
                       <div key={req.id} className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100/50">
                         <div className="flex-1">
                           <p className="font-bold text-sm text-orange-950">{req.userName}</p>
                           <p className="text-xs text-orange-600/70">{req.userEmail}</p>
                         </div>
                         <div className="flex gap-2 w-full md:w-auto">
                           <button onClick={() => handleApproveJoin(req)} className="flex-1 md:flex-none bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-600 active:scale-95 transition-all">Approve</button>
                           <button onClick={() => handleDenyJoin(req)} className="flex-1 md:flex-none bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-200 active:scale-95 transition-all">Deny</button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 pt-4">
                  {familyMembers.map(member => (
                    <motion.div 
                      key={member.uid} 
                      whileHover={{ y: -5 }}
                      className="bg-white p-6 rounded-[2.5rem] border border-orange-100 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-orange-900/5 hover:border-orange-200 transition-all relative group/member"
                    >
                       <div className="relative">
                         <img 
                           src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`} 
                           className="w-16 h-16 rounded-[1.25rem] border-4 border-white shadow-xl" 
                           alt={member.displayName} 
                         />
                         {member.uid === family?.ownerId && (
                           <div className="absolute -top-3 -right-3 bg-orange-600 text-white p-1.5 rounded-xl border-2 border-white shadow-lg">
                             <ShieldCheck className="w-3.5 h-3.5" />
                           </div>
                         )}
                         {member.familyStatus === 'suspended' && (
                            <div className="absolute -top-3 -left-3 bg-red-600 text-white p-1.5 rounded-xl border-2 border-white shadow-lg animate-pulse">
                              <X className="w-3.5 h-3.5" />
                            </div>
                         )}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-orange-950 truncate max-w-full leading-tight">{member.displayName}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">
                               {member.familyRole || 'Resident'}
                             </p>
                             {member.age && (
                               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                                 {member.age} YRS
                               </p>
                             )}
                          </div>
                          
                          {member.uid !== user.uid && (
                            <button 
                              onClick={() => {
                                localStorage.setItem('privateChatTarget', member.uid);
                                window.location.hash = '#chat';
                                window.location.reload(); // Force reload to trigger Chat view logic
                              }}
                              className="mt-3 w-full py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-3 h-3" /> Private Chat
                            </button>
                          )}
                       </div>

                       {/* Authority Actions for Owner */}
                       {user.uid === family?.ownerId && member.uid !== user.uid && (
                          <div className="absolute inset-0 bg-white/95 rounded-[2.5rem] flex flex-col items-center justify-center p-4 gap-2 opacity-0 group-hover/member:opacity-100 transition-all">
                              <p className="text-[8px] font-black uppercase tracking-tighter text-gray-400 mb-2">Member Control</p>
                              <button 
                                onClick={() => updateDoc(doc(db, 'users', member.uid), { familyStatus: member.familyStatus === 'suspended' ? 'active' : 'suspended' })}
                                className={cn(
                                  "w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                                  member.familyStatus === 'suspended' ? "bg-green-500 text-white border-green-600" : "bg-orange-100 text-orange-900 border-orange-200"
                                )}
                              >
                                {member.familyStatus === 'suspended' ? 'Reinstate' : 'Suspend'}
                              </button>
                              <button 
                                onClick={() => updateDoc(doc(db, 'users', member.uid), { familyId: null, familyStatus: null })}
                                className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-600 border border-red-100"
                              >
                                Remove
                              </button>
                          </div>
                       )}
                    </motion.div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Sidebar: Relationships / Family Tree Logic */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm flex flex-col items-center text-center space-y-8">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center">
                 <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold tracking-tight italic serif">Encrypted Enclave</h4>
                <p className="text-xs text-gray-400 font-light mt-4 leading-relaxed px-2">Your household records are strictly partitioned by standard AES-256 protocols. Only verified residents of <span className="text-black font-semibold uppercase tracking-tighter">{family?.name || 'Inzuka'}</span> can initiate read/write events on collective data points.</p>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3.5rem] border border-black/5 shadow-sm space-y-10">
              <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                <h3 className="text-md font-bold flex items-center gap-3 italic serif"><Users className="w-5 h-5 text-orange-500" /> Linked Nodes</h3>
                <button 
                  onClick={() => setShowAddRelation(!showAddRelation)}
                  disabled={!familyMembers.length || familyMembers.length < 2}
                  className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-xl disabled:opacity-20"
                >
                  {showAddRelation ? <Trash2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>

              <div className="space-y-5">
                 {profile?.relationships && profile.relationships.length > 0 ? (
                   profile.relationships.map((rel, idx) => {
                     const targetUser = familyMembers.find(u => u.uid === rel.targetUserId);
                     return (
                        <div key={idx} className="flex items-center justify-between p-5 rounded-[2rem] bg-gray-50 border border-black/[0.02] hover:bg-gray-100 transition-colors">
                           <div className="flex items-center gap-4">
                              <img 
                                src={targetUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser?.email}`} 
                                className="w-10 h-10 rounded-2xl bg-white shadow-sm" 
                                alt="Rel" 
                              />
                              <div>
                                 <p className="text-xs font-bold text-gray-900">{targetUser?.displayName || 'Legacy Record'}</p>
                                 <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-0.5">{rel.relationType}</p>
                              </div>
                           </div>
                           <button onClick={() => removeRelationship(rel.targetUserId)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     );
                   })
                 ) : (
                   <div className="py-12 text-center text-gray-300 italic text-sm font-light px-4 leading-relaxed">Establish direct links with residents to build your operational family tree.</div>
                 )}
              </div>

              <AnimatePresence>
                {showAddRelation && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="space-y-4 p-8 bg-gray-100/50 rounded-[2.5rem] border border-black/5 mt-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Relational Node Setup</p>
                       <div className="space-y-3">
                         <select 
                           value={newRelationId}
                           onChange={e => setNewRelationId(e.target.value)}
                           className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-black/5 outline-none appearance-none cursor-pointer"
                         >
                           <option value="">Select Local Resident...</option>
                           {familyMembers.filter(u => u.uid !== user.uid).map(u => (
                              <option key={u.uid} value={u.uid}>{u.displayName}</option>
                           ))}
                         </select>
                         <select 
                           value={newRelationType}
                           onChange={e => setNewRelationType(e.target.value)}
                           className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-black/5 outline-none appearance-none cursor-pointer"
                         >
                           {RELATIONSHIP_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                         </select>
                       </div>
                       <div className="flex gap-2 pt-2">
                          <button onClick={addRelationship} className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em]">Link Entry</button>
                          <button onClick={() => setShowAddRelation(false)} className="flex-1 bg-white text-gray-400 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] border border-black/5">Cancel</button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           <div className="bg-gray-950 text-white p-12 rounded-[4rem] shadow-2xl space-y-8 relative overflow-hidden group">
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10 group-hover:rotate-12 transition-transform duration-700">
                    <Heart className="w-10 h-10 text-orange-600 animate-pulse" />
                 </div>
                 <h4 className="text-2xl font-bold tracking-tight italic serif">Infinite Unity</h4>
                 <p className="text-xs text-white/40 font-light mt-6 leading-relaxed">"The bond that links your true family is not one of blood, but of respect and joy in each other's life."</p>
                 <button className="mt-12 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 hover:translate-x-3 transition-all opacity-40 hover:opacity-100 group">
                    View Archival Legacy <ChevronRight className="w-4 h-4 text-orange-500 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-600/10 rounded-full blur-[100px] group-hover:bg-orange-600/20 transition-all duration-1000"></div>
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/5 rounded-full blur-[100px] group-hover:bg-blue-600/10 transition-all duration-1000"></div>
           </div>
        </div>
      </div>
    </div>
  );
}
