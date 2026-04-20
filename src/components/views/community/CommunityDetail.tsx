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
  Layout
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
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

  if (loading) return <div className="p-20 text-center font-black uppercase text-[10px] tracking-widest text-gray-400">Syncing Network...</div>;
  if (!community) return <div className="p-20 text-center">Community not found.</div>;

  const isModerator = community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid;

  const allModules = [
    { id: 'chat', label: 'Communal Chat', icon: MessageCircle, color: 'text-blue-500' },
    { id: 'wallet', label: 'Treasury & Finance', icon: Wallet, color: 'text-green-500' },
    { id: 'tasks', label: 'Active Projects', icon: CheckSquare, color: 'text-orange-500' },
    { id: 'calendar', label: 'Event Schedule', icon: Calendar, color: 'text-purple-500' },
    { id: 'secretary', label: 'Bureau & News', icon: Shield, color: 'text-indigo-500' },
    { id: 'reports', label: 'Intelligence & Reports', icon: BarChart3, color: 'text-orange-500' },
    { id: 'members', label: 'Member Registry', icon: Users, color: 'text-pink-500' }
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

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-24">
      {/* Community Header */}
      <div className="bg-white border-b border-black/5 p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-black serif italic tracking-tight">{community.name}</h1>
                    {isModerator && (
                       <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-100">
                          Moderator
                       </span>
                    )}
                 </div>
                 <p className="text-xs text-gray-400 font-medium">{community.type} • {community.memberIds?.length || 0} Members</p>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl overflow-x-auto">
                 {modules.map(m => (
                    <button 
                      key={m.id}
                      onClick={() => setActiveModule(m.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap",
                        activeModule === m.id ? "bg-white shadow-sm " + m.color : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                 ))}
              </div>

              {isModerator && (
                 <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"
                    title="Configure Hub Modules"
                 >
                    <Settings className="w-5 h-5" />
                 </button>
              )}
           </div>
        </div>

        {/* Mobile Module Selector */}
        <div className="lg:hidden flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl mt-4 overflow-x-auto">
           {modules.map(m => (
              <button 
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={cn(
                  "px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap",
                  activeModule === m.id ? "bg-white shadow-sm " + m.color : "text-gray-400 hover:text-gray-600"
                )}
              >
                <m.icon className="w-4 h-4" />
                {m.label}
              </button>
           ))}
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
               {activeModule === 'members' && <MemberRegistry community={community} />}
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
               className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/20"
            >
               <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative border border-black/5"
               >
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="absolute top-8 right-8 p-2 text-gray-400 hover:bg-gray-100 rounded-full"
                  >
                     <X className="w-6 h-6" />
                  </button>

                  <div className="space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white">
                           <Layout className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black italic serif">Configure Hub Modules</h3>
                           <p className="text-gray-400 text-sm font-medium">Activate or deactivate specialized tools for this network.</p>
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
                                    isEnabled ? "bg-black border-black text-white" : "bg-white border-black/5 text-black hover:border-black/20",
                                    isCore && "opacity-50 cursor-not-allowed"
                                 )}
                              >
                                 <div className="flex items-center gap-4">
                                    <m.icon className={cn("w-6 h-6", isEnabled ? "text-white" : m.color)} />
                                    <div>
                                       <p className="font-bold text-sm">{m.label}</p>
                                       <p className={cn("text-[10px] uppercase font-black tracking-widest", isEnabled ? "text-white/40" : "text-gray-400")}>
                                          {isEnabled ? 'Active' : 'Inactive'}
                                       </p>
                                    </div>
                                 </div>
                                 <div className={cn("w-10 h-6 rounded-full relative transition-colors", isEnabled ? "bg-orange-500" : "bg-gray-200")}>
                                    <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", isEnabled ? "right-1" : "left-1")} />
                                 </div>
                              </button>
                           );
                        })}
                     </div>

                     <div className="bg-gray-50 p-6 rounded-3xl border border-black/5">
                        <p className="text-[10px] font-medium text-gray-500 leading-relaxed italic">
                           Note: Core modules like Communal Chat and Member Registry are vital for network operations and cannot be deactivated.
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
