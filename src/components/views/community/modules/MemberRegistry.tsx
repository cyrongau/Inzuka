import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  MoreVertical, 
  Mail, 
  Copy,
  User as UserIcon,
  LayoutGrid,
  List as ListIcon,
  MessageCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info,
  Smartphone,
  MapPin,
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import DirectMessageModal from './DirectMessageModal';
import SmartSearch from '../../../ui/SmartSearch';

export default function MemberRegistry({ community, user }: { community: any, user: any }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'moderator' | 'official'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [messagingMember, setMessagingMember] = useState<any>(null);
  
  const itemsPerPage = 8;

  const currentUserIsAdmin = community.ownerId === user?.uid || community.memberRoles?.[user?.uid] === 'admin';

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!community.memberIds) return;
      const profiles: Record<string, any> = {};
      const idsToFetch = community.memberIds.filter((mid: string) => !userProfiles[mid]);
      
      if (idsToFetch.length === 0) return;

      for (const mid of idsToFetch) {
        try {
           const d = await getDoc(doc(db, 'users', mid));
           if (d.exists()) {
             profiles[mid] = d.data();
           }
        } catch(e) { console.error('fetch profile error', e); }
      }
      
      if (Object.keys(profiles).length > 0) {
        setUserProfiles(prev => ({ ...prev, ...profiles }));
      }
    };
    fetchProfiles();
  }, [community.memberIds]);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Member ID copied to clipboard.");
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
       const updates: any = { [`memberRoles.${memberId}`]: newRole };
       if (['moderator', 'chairman', 'treasurer', 'secretary', 'admin'].includes(newRole)) {
          updates.moderatorIds = community.moderatorIds?.includes(memberId) 
             ? community.moderatorIds 
             : [...(community.moderatorIds || []), memberId];
       }
       await updateDoc(doc(db, 'communities', community.id), updates);
       toast.success("Role updated");
       setOpenMenuId(null);
    } catch (e) {
       toast.error("Failed to update role");
    }
  };

  const handleTierChange = async (memberId: string, newTier: string) => {
    try {
       await updateDoc(doc(db, 'communities', community.id), {
          [`memberTiers.${memberId}`]: newTier
       });
       toast.success("Membership tier updated");
       setOpenMenuId(null);
    } catch (e) {
       toast.error("Failed to update tier");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === user?.uid) {
      toast.error("You cannot remove yourself.");
      return;
    }
    try {
      const newMembers = community.memberIds.filter((id: string) => id !== memberId);
      const roles = { ...community.memberRoles };
       delete roles[memberId];
       await updateDoc(doc(db, 'communities', community.id), { 
         memberIds: newMembers,
         memberRoles: roles 
       });
       toast.success("Member removed");
       setOpenMenuId(null);
    } catch (e) {
       toast.error("Failed to remove member");
    }
  };

  const filteredMembers = (community.memberIds || []).filter((mid: string) => {
    const profile = userProfiles[mid];
    const role = community.memberRoles?.[mid] || (community.ownerId === mid ? 'admin' : 'member');
    
    const nameMatch = (profile?.displayName || `Member ${mid.slice(-4)}`).toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = mid.toLowerCase().includes(searchQuery.toLowerCase());
    
    let roleMatch = true;
    if (roleFilter === 'official') {
       roleMatch = ['chairman', 'treasurer', 'secretary', 'admin'].includes(role);
    } else if (roleFilter === 'moderator') {
       roleMatch = role === 'moderator';
    } else if (roleFilter === 'member') {
       roleMatch = role === 'member';
    }

    return (nameMatch || idMatch) && roleMatch;
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  const toggleMemberProfile = (mid: string) => {
    const profile = userProfiles[mid];
    const role = community.memberRoles?.[mid] || (community.ownerId === mid ? 'admin' : 'member');
    setSelectedMember({ mid, profile, role });
  };

  const searchData = (community.memberIds || []).map((mid: string) => {
    const profile = userProfiles[mid];
    const role = community.memberRoles?.[mid] || (community.ownerId === mid ? 'admin' : 'member');
    return {
       id: mid,
       name: profile?.displayName || `Member ${mid.slice(-4)}`,
       subtitle: role,
       imageUrl: profile?.photoURL,
       icon: !profile?.photoURL ? <UserIcon className="w-5 h-5" /> : undefined
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in transition-all pb-24">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
         <div>
              <h2 className="text-xl font-bold italic serif flex items-center gap-2 text-black dark:text-white">
                <Users className="w-6 h-6 text-blue-500" /> Member Directory
             </h2>
             <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mt-1">Found {filteredMembers.length} members in {community.name}.</p>
         </div>

         <div className="flex flex-wrap items-center gap-3">
            <div className="w-64">
               <SmartSearch 
                  data={searchData}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={(item) => toggleMemberProfile(item.id)}
                  placeholder="Search name or ID..."
                  className="relative flex items-center pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all"
                  inputClassName="w-full bg-transparent text-xs font-bold outline-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
               />
            </div>

            <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl">
               <button 
                 onClick={() => setRoleFilter('all')}
                 className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", roleFilter === 'all' ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-gray-400 font-bold")}
               >All</button>
               <button 
                 onClick={() => setRoleFilter('official')}
                 className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", roleFilter === 'official' ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-500" : "text-gray-400 font-bold")}
               >Officials</button>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl shrink-0">
               <button 
                 onClick={() => setViewMode('list')}
                 className={cn("p-2 rounded-lg transition-colors", viewMode === 'list' ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600")}
               >
                 <ListIcon className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('grid')}
                 className={cn("p-2 rounded-lg transition-colors", viewMode === 'grid' ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600")}
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      <div className={cn(
         viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" 
            : "flex flex-col gap-4"
      )}>
         {paginatedMembers.map((mid: string) => {
            const role = community.memberRoles?.[mid] || (community.ownerId === mid ? 'admin' : 'member');
            const isAdmin = community.ownerId === mid || role === 'admin';
            const isModerator = community.moderatorIds?.includes(mid) || ['chairman', 'treasurer', 'secretary'].includes(role);
            const profile = userProfiles[mid];
            const displayName = profile?.displayName || `Member ${mid.slice(-4)}`;
            
            const renderMenu = () => {
              if (!currentUserIsAdmin) return null;
              return (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-black/5 dark:border-white/5 py-2 z-50">
                   <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-black/5 dark:border-white/5 mb-1">Actions</div>
                   <button onClick={() => handleRoleChange(mid, 'member')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Set as Member</button>
                   <button onClick={() => handleRoleChange(mid, 'moderator')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Set as Moderator</button>
                   <button onClick={() => handleRoleChange(mid, 'treasurer')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Set as Treasurer</button>
                   <button onClick={() => handleRoleChange(mid, 'secretary')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Set as Secretary</button>
                   <button onClick={() => handleRoleChange(mid, 'chairman')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Set as Chairman</button>
                   
                   <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-black/5 dark:border-white/5 my-1">Tiers / Groups</div>
                   <button onClick={() => handleTierChange(mid, 'Full Member')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Full Member</button>
                   <button onClick={() => handleTierChange(mid, 'Associate')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Associate</button>
                   <button onClick={() => handleTierChange(mid, 'Extended Family')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Extended Family</button>
                   <button onClick={() => handleTierChange(mid, 'Youth')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors font-bold">Youth Group</button>
                   {mid !== user?.uid && (
                     <>
                       <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
                       <button onClick={() => handleRemoveMember(mid)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-bold">Remove Member</button>
                     </>
                   )}
                </div>
              );
            };

            if (viewMode === 'list') {
               return (
                  <div 
                    key={mid}
                    onClick={() => toggleMemberProfile(mid)}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm hover:border-blue-200 dark:hover:border-blue-500/50 transition-all group flex items-center justify-between cursor-pointer"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-black/5 dark:border-white/5 shrink-0 relative overflow-hidden">
                           {profile?.photoURL ? (
                              <img src={profile.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           ) : (
                              <UserIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                           )}
                           {(isAdmin || isModerator) && (
                             <div className={cn(
                               "absolute -top-1 -right-1 w-6 h-6 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center shadow-lg",
                               isAdmin ? "bg-red-500" : "bg-blue-500"
                             )}>
                                <ShieldCheck className="w-3 h-3 text-white" />
                             </div>
                           )}
                        </div>
                        <div>
                           <h4 className="font-bold text-gray-900 dark:text-gray-100">{displayName}</h4>
                           <p className={cn(
                             "text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                             isAdmin ? "text-red-500" : isModerator ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                           )}>
                              <span>{role}</span>
                              {community.memberTiers?.[mid] && (
                                <span className="bg-gray-100 dark:bg-zinc-800 px-1 rounded text-[8px] text-gray-500 border border-black/5">{community.memberTiers[mid]}</span>
                              )}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <div className="hidden md:flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                           <code className="text-[9px] font-mono text-gray-500 dark:text-gray-400">{mid.slice(-8)}</code>
                           <button onClick={() => copyId(mid)} className="text-gray-300 hover:text-blue-500 transition-colors">
                              <Copy className="w-3 h-3" />
                           </button>
                        </div>
                        <div className="relative">
                           <button 
                             onClick={() => setOpenMenuId(openMenuId === mid ? null : mid)}
                             className="w-10 h-10 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors"
                           >
                              <MoreVertical className="w-4 h-4" />
                           </button>
                           {openMenuId === mid && renderMenu()}
                        </div>
                     </div>
                  </div>
               );
            }
            
            return (
              <div 
                key={mid}
                onClick={() => toggleMemberProfile(mid)}
                className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm hover:border-blue-200 dark:hover:border-blue-500/50 transition-all group cursor-pointer text-center"
              >
                 <div className="relative inline-block mb-4 mx-auto">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center border border-black/5 dark:border-white/5 overflow-hidden">
                       {profile?.photoURL ? (
                          <img src={profile.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       ) : (
                          <UserIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                       )}
                    </div>
                    {(isAdmin || isModerator) && (
                      <div className={cn(
                        "absolute -top-1 -right-1 w-8 h-8 border-4 border-white dark:border-zinc-900 rounded-full flex items-center justify-center shadow-lg",
                        isAdmin ? "bg-red-500" : "bg-blue-500"
                      )}>
                         <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                 </div>
                 
                 <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{displayName}</h4>
                 <p className={cn(
                   "text-[10px] font-black uppercase tracking-widest mt-1",
                   isAdmin ? "text-red-500" : isModerator ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                 )}>
                    {role}
                 </p>
                 
                 {community.memberTiers?.[mid] && (
                   <span className="inline-block mt-2 bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-500 border border-black/5">{community.memberTiers[mid]}</span>
                 )}
              </div>
            );
         })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-12 bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm inline-flex mx-auto">
           <button 
             disabled={currentPage === 1}
             onClick={() => setCurrentPage(prev => prev - 1)}
             className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-500 disabled:opacity-30 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
           >
              <ChevronLeft className="w-6 h-6" />
           </button>
           <div className="flex items-center gap-2 px-6">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Page</span>
              <span className="text-sm font-black italic serif text-black dark:text-white">{currentPage}</span>
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">of {totalPages}</span>
           </div>
           <button 
             disabled={currentPage === totalPages}
             onClick={() => setCurrentPage(prev => prev + 1)}
             className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-500 disabled:opacity-30 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
           >
              <ChevronRight className="w-6 h-6" />
           </button>
        </div>
      )}

      {/* Profile Modal */}
      <AnimatePresence>
         {selectedMember && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-[#fcfcfc] dark:bg-zinc-950 w-full max-w-lg rounded-[3rem] p-8 overflow-y-auto relative shadow-2xl border border-black/5 dark:border-white/5 max-h-[90vh]"
             >
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-600 to-indigo-600 opacity-10" />
                
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white dark:bg-zinc-900 rounded-full shadow border border-black/5 dark:border-white/5 flex items-center justify-center text-gray-400 hover:text-black dark:hover:text-white transition-all z-10"
                >
                   <X className="w-5 h-5" />
                </button>

                <div className="relative text-center mb-6 pt-6">
                   <div className="w-24 h-24 md:w-32 md:h-32 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-4 border-[#fcfcfc] dark:border-zinc-950 mx-auto overflow-hidden shadow-xl relative group mb-4">
                      {selectedMember.profile?.photoURL ? (
                         <img src={selectedMember.profile.photoURL} alt={selectedMember.profile?.displayName} className="w-full h-full object-cover" />
                      ) : (
                         <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-200 dark:text-zinc-800 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      )}
                      
                      <div className={cn(
                        "absolute -top-1 -right-1 w-8 h-8 md:w-10 md:h-10 border-2 border-[#fcfcfc] dark:border-zinc-950 rounded-full flex items-center justify-center shadow-lg",
                        selectedMember.role === 'admin' ? "bg-red-500" : "bg-blue-500"
                      )}>
                         <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                   </div>
                   
                   <h3 className="text-2xl md:text-3xl font-black italic serif text-black dark:text-white leading-tight">
                     {selectedMember.profile?.displayName || 'Anonymous'}
                   </h3>
                   {selectedMember.profile?.familyName && (
                     <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest italic">{selectedMember.profile.familyName} Family</p>
                   )}
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mt-2">{selectedMember.role}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                   <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-black/5 dark:border-white/5 text-center flex flex-col justify-center">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Member ID</p>
                      <code className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300">{selectedMember.mid.slice(0, 8)}...</code>
                   </div>
                   <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-black/5 dark:border-white/5 text-center flex flex-col justify-center">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Membership Status</p>
                      <p className="text-[10px] font-black italic serif text-green-600">Active Delegate</p>
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-[1.5rem] border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                         <Mail className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Email Address</p>
                         <p className="text-xs font-bold truncate text-black dark:text-white">{selectedMember.profile?.email || 'Not Provided'}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-[1.5rem] border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                         <Smartphone className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Phone Number</p>
                         <p className="text-xs font-bold truncate text-black dark:text-white">{selectedMember.profile?.phoneNumber || 'Not Provided'}</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-[1.5rem] border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                         <MapPin className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Registered Location</p>
                         <p className="text-xs font-bold truncate text-black dark:text-white">{selectedMember.profile?.location || 'Unknown'}</p>
                      </div>
                   </div>
                </div>

                <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex gap-3">
                   <button 
                     onClick={() => setMessagingMember(selectedMember)}
                     className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105"
                   >
                      Send Message
                   </button>
                   {currentUserIsAdmin && (
                     <button className="w-12 h-12 bg-gray-100 dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-all">
                        <MoreVertical className="w-5 h-5" />
                     </button>
                   )}
                </div>
             </motion.div>
           </div>
         )}
      </AnimatePresence>

      <AnimatePresence>
         {messagingMember && (
           <DirectMessageModal 
             currentUser={user}
             targetMember={{ uid: messagingMember.mid }}
             targetProfile={messagingMember.profile}
             onClose={() => setMessagingMember(null)}
           />
         )}
      </AnimatePresence>
    </div>
  );
}
