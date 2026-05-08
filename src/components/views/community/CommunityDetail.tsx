import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  ArrowLeft,
  Briefcase, 
  Settings, 
  MessageCircle, 
  Wallet, 
  CheckSquare, 
  Calendar,
  Users,
  Shield,
  ChevronDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Package,
  BookOpen,
  Gavel,
  BarChart3,
  Upload,
  X,
  Layout,
  Image as ImageIcon,
  Link
} from 'lucide-react';
import { db, storage } from '../../../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// Module Components (stubs or small versions for now)
import CommunityChatModule from './modules/ChatModule';
import CommunityFinanceModule from './modules/FinanceModule';
import CommunityProjectsModule from './modules/ProjectsModule';
import CommunityCalendarModule from './modules/CalendarModule';
import MemberRegistry from './modules/MemberRegistry';
import CommunitySecretaryModule from './modules/SecretaryModule';
import ReportsModule from './modules/ReportsModule';
import AssetsModule from './modules/AssetsModule';
import DisputeModule from './modules/DisputeModule';
import RecordsModule from './modules/RecordsModule';

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'communities', communityId), (snapshot) => {
      if (snapshot.exists()) {
        setCommunity({ id: snapshot.id, ...snapshot.data() });
      } else {
        toast.error("Community not found.");
        onBack();
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching community:", error);
      toast.error("Failed to load community details.");
      setLoading(false);
    });
    return () => unsub();
  }, [communityId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin rounded-full" />
           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Community Data</p>
        </div>
      </div>
    );
  }

  if (!community) return null;

  const isModerator = community?.ownerId === user.uid || community?.moderatorIds?.includes(user.uid);

  // Group modules into visible and hidden
  const allModules = [
    { id: 'chat', label: 'Group Chat', icon: MessageCircle, color: 'text-blue-500', priority: 100 },
    { id: 'wallet', label: 'Finance', icon: Wallet, color: 'text-green-500', priority: 90 },
    { id: 'tasks', label: 'Impact Projects', icon: Briefcase, color: 'text-orange-500', priority: 80 },
    { id: 'calendar', label: 'Events', icon: Calendar, color: 'text-purple-500', priority: 70 },
    { id: 'secretary', label: 'Updates', icon: Shield, color: 'text-indigo-500', priority: 60 },
    { id: 'assets', label: 'Inventory', icon: Package, color: 'text-orange-500', priority: 50 },
    { id: 'records', label: 'Records', icon: BookOpen, color: 'text-blue-600', priority: 40 },
    { id: 'disputes', label: 'Resolutions', icon: Gavel, color: 'text-red-500', priority: 30 },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-orange-500', priority: 20 },
    { id: 'members', label: 'Members', icon: Users, color: 'text-pink-500', priority: 10 }
  ];

  const enabledModules = allModules.filter(m => 
    community?.modules?.includes(m.id) || 
    m.id === 'chat' || 
    m.id === 'members' ||
    (isModerator && (m.id === 'reports' || m.id === 'wallet'))
  ).sort((a, b) => b.priority - a.priority);

  // Split into top 4 and overflow
  const visibleModules = enabledModules.slice(0, 4);
  const hiddenModules = enabledModules.slice(4);

  // If active module is in hidden, we should swap or highlight?
  // Let's just make sure active is accessible.
  const isActiveHidden = hiddenModules.some(m => m.id === activeModule);
  const activeHiddenMod = hiddenModules.find(m => m.id === activeModule);

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

  const handleUrlSubmit = async (type: 'banner' | 'logo') => {
    const url = window.prompt(`Enter URL for the ${type}:`);
    if (!url) return;

    try {
      await updateDoc(doc(db, 'communities', communityId), {
         [type === 'banner' ? 'bannerUrl' : 'logoUrl']: url
      });
      toast.success(`${type === 'banner' ? 'Cover image' : 'Logo'} updated successfully`);
    } catch (err) {
      toast.error("Failed to update image");
    }
  };

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'banner' | 'logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const toastId = toast.loading(`Uploading ${type}...`);
    try {
      const extension = file.name.split('.').pop();
      const storageRef = ref(storage, `communities/${communityId}/${type}-${Date.now()}.${extension}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'communities', communityId), {
         [type === 'banner' ? 'bannerUrl' : 'logoUrl']: downloadUrl
      });
      toast.success(`${type === 'banner' ? 'Cover image' : 'Logo'} updated successfully`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image", { id: toastId });
    }
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
               <div className="absolute top-6 right-6 md:right-12 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button 
                   onClick={() => handleUrlSubmit('banner')}
                   className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-3.5 rounded-full text-white transition-colors"
                 >
                    <Link className="w-5 h-5" />
                 </button>
                 <label className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-3.5 rounded-full text-white transition-colors cursor-pointer">
                    <Upload className="w-5 h-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, 'banner')} />
                 </label>
               </div>
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
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center gap-4 text-white transition-opacity rounded-[1.75rem]">
                           <button 
                              onClick={() => handleUrlSubmit('logo')}
                              className="hover:scale-110 transition-transform p-2 bg-white/20 rounded-full"
                           >
                              <Link className="w-5 h-5" />
                           </button>
                           <label className="hover:scale-110 transition-transform p-2 bg-white/20 rounded-full cursor-pointer">
                              <Upload className="w-5 h-5" />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, 'logo')} />
                           </label>
                        </div>
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
            <div className="flex-1">
               <div className="flex items-center gap-1 h-[4.5rem]">
                  {visibleModules.map(m => (
                     <button
                        key={m.id}
                        onClick={() => setActiveModule(m.id)}
                        className={cn(
                          "px-4 h-12 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 relative",
                          activeModule === m.id ? "text-black dark:text-white bg-gray-50 dark:bg-zinc-800 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        )}
                     >
                       <m.icon className={cn("w-4 h-4", activeModule === m.id ? m.color : "")} />
                       <span className="hidden sm:inline">{m.label}</span>
                       {activeModule === m.id && (
                          <motion.div layoutId="activeModTab" className="absolute bottom-0 left-4 right-4 h-0.5 bg-black dark:bg-white" />
                       )}
                     </button>
                  ))}

                  {hiddenModules.length > 0 && (
                    <div className="relative">
                       <button
                          onClick={() => setShowMoreMenu(!showMoreMenu)}
                          className={cn(
                            "px-4 h-12 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition-all whitespace-nowrap shrink-0",
                            isActiveHidden ? "text-black dark:text-white bg-gray-50 dark:bg-zinc-800 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
                          )}
                       >
                          {isActiveHidden && activeHiddenMod ? (
                            <>
                               <activeHiddenMod.icon className={cn("w-4 h-4", activeHiddenMod.color)} />
                               <span className="hidden sm:inline">{activeHiddenMod.label}</span>
                            </>
                          ) : (
                            <>
                               <MoreHorizontal className="w-4 h-4" />
                               <span className="hidden sm:inline">More</span>
                            </>
                          )}
                          <ChevronDown className={cn("w-3 h-3 transition-transform", showMoreMenu ? "rotate-180" : "")} />
                       </button>

                       <AnimatePresence>
                          {showMoreMenu && (
                            <>
                               <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                               <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 shadow-2xl p-2 z-50 overflow-hidden"
                               >
                                  {hiddenModules.map(m => (
                                     <button
                                        key={m.id}
                                        onClick={() => {
                                          setActiveModule(m.id);
                                          setShowMoreMenu(false);
                                        }}
                                        className={cn(
                                          "w-full px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all text-left",
                                          activeModule === m.id ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                        )}
                                     >
                                        <m.icon className={cn("w-4 h-4", activeModule === m.id ? "" : m.color)} />
                                        {m.label}
                                     </button>
                                  ))}
                               </motion.div>
                            </>
                          )}
                       </AnimatePresence>
                    </div>
                  )}
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
               {activeModule === 'tasks' && <CommunityProjectsModule community={community} user={user} />}
               {activeModule === 'calendar' && <CommunityCalendarModule community={community} user={user} />}
               {activeModule === 'secretary' && <CommunitySecretaryModule community={community} user={user} />}
               {activeModule === 'assets' && <AssetsModule community={community} user={user} />}
               {activeModule === 'records' && <RecordsModule community={community} user={user} />}
               {activeModule === 'disputes' && <DisputeModule community={community} user={user} />}
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
