import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  ArrowLeft, 
  Settings, 
  MessageCircle, 
  Wallet, 
  CheckSquare, 
  Calendar,
  Users,
  Shield,
  Plus,
  BarChart3,
  X,
  Layout,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Module Components (stubs or small versions for now)
import CommunityChatModule from './modules/ChatModule';
import CommunityFinanceModule from './modules/FinanceModule';
import CommunityTaskModule from './modules/TaskModule';
import CommunityCalendarModule from './modules/CalendarModule';
import MemberRegistry from './modules/MemberRegistry';
import CommunitySecretaryModule from './modules/SecretaryModule';
import ReportsModule from './modules/ReportsModule';

export default function CommunityDetail({ 
  user, 
  profile, 
  communityId, 
  onBack 
}: { 
  user: User, 
  profile: any, 
  communityId: string, 
  onBack: () => void 
}) {
  const [community, setCommunity] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<string>('chat');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'communities', communityId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCommunity({ id: doc.id, ...data });
        // Set default module if not set, ensuring it exists in community modules
        if (!activeModule && data.modules?.length > 0) {
           setActiveModule(data.modules[0]);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [communityId, activeModule]);

  if (loading) return <div className="p-20 text-center font-black uppercase text-[10px] tracking-widest text-gray-400">Loading Group...</div>;
  if (!community) return <div className="p-20 text-center">Group not found.</div>;

  const isModerator = community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid;
  const isMember = community.memberIds?.includes(user.uid) || isModerator;

  const handleJoin = async () => {
    try {
      await updateDoc(doc(db, 'communities', communityId), {
        memberIds: arrayUnion(user.uid)
      });
      toast.success("Joined group successfully!");
    } catch (e) {
      toast.error("Failed to join group.");
    }
  };

  if (!isMember) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 pb-24 flex items-center justify-center p-6">
         <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 p-12 rounded-[3.5rem] max-w-lg text-center shadow-xl space-y-6">
            <Layout className="w-16 h-16 text-black/10 dark:text-white/10 mx-auto" />
            <h2 className="text-3xl font-black italic serif text-black dark:text-white">{community.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{community.description}</p>
            
            <button 
              onClick={handleJoin}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
               Join Group
            </button>
            <button 
              onClick={onBack}
              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white pt-4 transition-colors"
             >
               Return to Groups
            </button>
         </div>
      </div>
    );
  }

  const allModules = [
    { id: 'chat', label: 'Group Chat', icon: MessageCircle, color: 'text-blue-500' },
    { id: 'wallet', label: 'Finance & Banking', icon: Wallet, color: 'text-green-500' },
    { id: 'tasks', label: 'Projects', icon: CheckSquare, color: 'text-orange-500' },
    { id: 'calendar', label: 'Events', icon: Calendar, color: 'text-purple-500' },
    { id: 'secretary', label: 'News & Updates', icon: Shield, color: 'text-indigo-500' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-orange-500' },
    { id: 'members', label: 'Members', icon: Users, color: 'text-pink-500' }
  ];

  const modules = allModules.filter(m => 
    community.modules?.includes(m.id) || 
    m.id === 'chat' || 
    m.id === 'members' ||
    (isModerator && (m.id === 'reports' || m.id === 'wallet'))
  );

  const toggleModule = async (moduleId: string) => {
    if (!isModerator) return;
    const isEnabled = community.modules?.includes(moduleId);
    const newModules = isEnabled 
      ? community.modules.filter((id: string) => id !== moduleId)
      : [...(community.modules || []), moduleId];
    
    try {
      await updateDoc(doc(db, 'communities', communityId), {
        modules: newModules
      });
      toast.success(`${moduleId} updated.`);
    } catch (e) {
      toast.error("Failed to update module.");
    }
  };

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'banner' | 'logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = async () => {
      // Calculate dimensions maintaining aspect ratio
      const MAX_WIDTH = type === 'banner' ? 1200 : 400;
      const MAX_HEIGHT = type === 'banner' ? 600 : 400;
      
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG to save space
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      try {
        await updateDoc(doc(db, 'communities', communityId), {
           [type === 'banner' ? 'bannerUrl' : 'logoUrl']: compressedBase64
        });
        toast.success(`${type === 'banner' ? 'Cover image' : 'Logo'} updated successfully`);
      } catch (err) {
        toast.error("Failed to update image");
      }
    };
    
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 pb-24">
      {/* Dynamic Banner Header */}
      <div className="relative">
         {/* Cover Image */}
         <div className="h-64 md:h-[22rem] w-full relative bg-gray-200 dark:bg-zinc-900 flex items-center justify-center overflow-hidden group">
            {community.bannerUrl ? (
               <img src={community.bannerUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
               <ImageIcon className="w-20 h-20 text-black/10 dark:text-white/10" />
            )}
            {/* Dark gradient overlay at bottom for text contrast */}
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            
            {isModerator && (
               <label className="absolute top-6 right-6 md:right-12 bg-white/20 hover:bg-white/40 backdrop-blur-md p-3.5 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, 'banner')} />
               </label>
            )}

            {/* Overlaid text */}
            <div className="absolute left-6 md:left-12 bottom-6 md:bottom-8 right-6 md:right-12 flex items-end justify-between">
               <div className="flex flex-col md:flex-row items-center md:items-end gap-6 w-full md:w-auto">
                  {/* Group Logo */}
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2rem] bg-white dark:bg-zinc-950 border-4 border-[#fcfcfc] dark:border-zinc-950 flex items-center justify-center relative shadow-2xl shrink-0 group/logo">
                     {community.logoUrl ? (
                         <img src={community.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-[1.75rem]" />
                     ) : (
                         <Users className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                     )}
                     {isModerator && (
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white transition-opacity rounded-[1.75rem] cursor-pointer">
                           <Upload className="w-6 h-6" />
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, 'logo')} />
                        </label>
                     )}
                  </div>
                  <div className="text-white text-center md:text-left flex-1 md:flex-none">
                     <p className="text-white/80 text-sm font-bold mb-1.5 hidden md:block">Welcome back, {profile?.displayName || 'Member'}</p>
                     <h1 className="text-3xl md:text-5xl font-black italic serif tracking-tight drop-shadow-lg mb-4">{community.name}</h1>
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest">{community.type}</span>
                        <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest">{community.memberIds?.length || 0} Members</span>
                        {isModerator && (
                           <span className="px-3 py-1.5 bg-blue-500/80 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-[#fcfcfc]">Moderator</span>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
         
         <button 
            onClick={onBack} 
            className="absolute top-6 left-6 md:left-12 bg-black/30 hover:bg-black/50 backdrop-blur-md p-3.5 rounded-full text-white transition-all hover:scale-105 active:scale-95 z-10"
         >
            <ArrowLeft className="w-5 h-5" />
         </button>
      </div>

      <div className="border-b border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 sticky top-0 z-30 shadow-sm">
         <div className="max-w-7xl mx-auto px-4 md:px-12 flex items-center justify-between gap-4">
            {/* Scrollable Nav wrapper */}
            <div className="flex-1 overflow-hidden relative">
               <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pt-4 pb-0 snap-x relative h-[4.5rem] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {modules.map(m => (
                     <button
                        key={m.id}
                        onClick={() => setActiveModule(m.id)}
                        className={cn(
                          "px-5 h-12 rounded-t-2xl flex items-center gap-2.5 text-sm font-bold transition-all whitespace-nowrap snap-start shrink-0 relative mt-2",
                          activeModule === m.id ? "text-black dark:text-white bg-gray-50 dark:bg-zinc-800" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        )}
                     >
                       <m.icon className={cn("w-4 h-4", activeModule === m.id ? m.color : "")} />
                       {m.label}
                       {activeModule === m.id && (
                          <motion.div layoutId="activeModTab" className="absolute bottom-0 left-0 right-0 h-1 bg-black dark:bg-white" />
                       )}
                     </button>
                  ))}
               </div>
            </div>
         
            {isModerator && (
               <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-12 h-12 shrink-0 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm text-black dark:text-white relative z-10"
                  title="Configure Group Modules"
               >
                  <Settings className="w-6 h-6" />
               </button>
            )}
         </div>
      </div>

      {/* Module Content */}
      <div className="max-w-7xl mx-auto p-6 md:p-8">
         <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
               {activeModule === 'chat' && <CommunityChatModule community={community} user={user} />}
               {activeModule === 'wallet' && <CommunityFinanceModule community={community} user={user} />}
               {activeModule === 'tasks' && <CommunityTaskModule community={community} user={user} />}
               {activeModule === 'calendar' && <CommunityCalendarModule community={community} user={user} />}
               {activeModule === 'secretary' && <CommunitySecretaryModule community={community} user={user} />}
               {activeModule === 'reports' && <ReportsModule community={community} user={user} />}
               {activeModule === 'members' && <MemberRegistry community={community} user={user} />}
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
         {showSettings && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/20 dark:bg-black/60"
            >
               <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative border border-black/5 dark:border-white/5"
               >
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="absolute top-8 right-8 p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                  >
                     <X className="w-6 h-6" />
                  </button>

                  <div className="space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-black dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black shadow-xl">
                           <Layout className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black italic serif text-black dark:text-white">Configure Group Modules</h3>
                           <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Activate or deactivate specialized tools for this group.</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allModules.map(m => {
                           const isEnabled = community.modules?.includes(m.id);
                           const isCore = ['chat', 'members'].includes(m.id);
                           return (
                              <button 
                                 key={m.id}
                                 disabled={isCore}
                                 onClick={() => toggleModule(m.id)}
                                 className={cn(
                                    "p-6 rounded-3xl border flex items-center justify-between transition-all text-left",
                                    isEnabled ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-xl" : "bg-white dark:bg-zinc-800 border-black/5 dark:border-white/5 text-black dark:text-white hover:border-black/20 dark:hover:border-white/20",
                                    isCore && "opacity-50 cursor-not-allowed"
                                 )}
                              >
                                 <div className="flex items-center gap-4">
                                    <m.icon className={cn("w-6 h-6", isEnabled ? "text-white dark:text-black" : m.color)} />
                                    <div>
                                       <p className="font-bold text-sm">{m.label}</p>
                                       <p className={cn("text-[10px] uppercase font-black tracking-widest", isEnabled ? "text-white/60 dark:text-black/60" : "text-gray-400 dark:text-gray-500")}>
                                          {isEnabled ? 'Active' : 'Inactive'}
                                       </p>
                                    </div>
                                 </div>
                                 <div className={cn("w-10 h-6 rounded-full relative transition-colors", isEnabled ? "bg-orange-500 dark:bg-orange-600" : "bg-gray-200 dark:bg-zinc-700")}>
                                    <div className={cn("absolute top-1 w-4 h-4 rounded-full transition-all shadow-sm", isEnabled ? "right-1 bg-white" : "left-1 bg-white dark:bg-gray-400")} />
                                 </div>
                              </button>
                           );
                        })}
                     </div>

                     <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-black/5 dark:border-white/5">
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed italic">
                           Note: Core modules like Group Chat and Members are vital for group operations and cannot be deactivated.
                        </p>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
