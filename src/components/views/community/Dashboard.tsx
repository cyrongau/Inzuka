import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Users, 
  HandHeart, 
  PiggyBank, 
  Globe2, 
  ArrowUpRight,
  TrendingUp,
  MessageCircle,
  Plus
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import CreateCommunityWizard from './CreateCommunityWizard';

export default function CommunityDashboard({ 
  user, 
  profile, 
  onSelectCommunity,
  onOpenForum
}: { 
  user: User, 
  profile: any,
  onSelectCommunity: (id: string) => void,
  onOpenForum: (threadId: string) => void
}) {
  const [communities, setCommunities] = useState<any[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [unreadForums, setUnreadForums] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'communities'),
      where('memberIds', 'array-contains', user.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setCommunities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, 'forumThreads'), where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)));
    const unsub = onSnapshot(q, (snap) => {
      setUnreadForums(snap.size);
    });
    return () => unsub();
  }, []);

  const totalPool = communities.reduce((acc, curr) => acc + (curr.poolBalance || 0), 0);

  const stats = [
    { label: 'Active Groups', value: communities.length.toString(), icon: Globe2, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Fundraising Goals', value: 'KES 0', icon: HandHeart, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Table Banking', value: `KES ${totalPool.toLocaleString()}`, icon: PiggyBank, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Recent Wisdom', value: unreadForums.toString(), icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8 p-6 lg:p-10 pt-0">
      <div className="relative group">
        <div className="h-64 md:h-80 bg-gray-950 rounded-[3rem] overflow-hidden relative flex flex-col justify-end p-8 md:p-12 shadow-2xl">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 space-y-4">
             <div className="space-y-1">
                <h1 className="text-4xl md:text-6xl font-black italic serif text-white tracking-tighter leading-none animate-in slide-in-from-left-4 duration-500">
                   Community Hub
                </h1>
                <p className="text-white/60 font-medium text-lg max-w-2xl">
                   Connect beyond your household. Manage fundraisers, table banking groups, and extended family groups seamlessly.
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-2xl", stat.bg, stat.color, "dark:bg-opacity-20")}>
                <stat.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white transition-colors" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-semibold tracking-tight text-black dark:text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-black/5 dark:border-white/5 shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-semibold flex items-center gap-2 italic serif text-black dark:text-white">
                  <Users className="w-5 h-5" /> My Groups
               </h3>
               <button 
                 onClick={() => setShowWizard(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
               >
                 <Plus className="w-4 h-4" /> Create Group
               </button>
             </div>
             
             {communities.length === 0 ? (
               <div className="text-center py-16 px-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-700">
                 <Globe2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                 <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No Groups Yet</h4>
                 <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    You haven't joined or created any groups. Set up a Table Banking group, a Fundraiser, or an Extended Family Hub to get started.
                 </p>
               </div>
             ) : (
               <div className="space-y-4">
                 {communities.map(comm => (
                   <div 
                     key={comm.id} 
                     onClick={() => onSelectCommunity(comm.id)}
                     className="p-5 bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 rounded-2xl flex items-center gap-4 hover:border-black/20 dark:hover:border-white/20 transition-colors cursor-pointer group"
                    >
                       <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-center shrink-0 text-xl shadow-sm">
                         {comm.type === 'Fundraising' ? '🤲' : comm.type === 'Table Banking' ? '🏦' : '👥'}
                       </div>
                       <div className="flex-1">
                         <h4 className="font-bold text-gray-900 dark:text-gray-100">{comm.name}</h4>
                         <p className="text-[10px] font-black uppercase text-blue-500 dark:text-blue-400 tracking-widest mt-0.5">{comm.type} • {comm.memberIds.length} Members</p>
                       </div>
                       <ArrowUpRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white transition-colors" />
                     </div>
                   ))}
               </div>
             )}
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
              <div className="relative z-10">
                 <h3 className="text-xl font-bold italic serif mb-4">Join an Existing Group</h3>
                 <p className="text-white/80 text-sm mb-6 leading-relaxed">
                    Have an invite code from a colleague or a family member for a specific group?
                 </p>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter Invite Code" 
                      className="flex-1 w-full min-w-0 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white placeholder:text-white/40 font-mono tracking-widest"
                    />
                    <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-transform whitespace-nowrap">
                       Join
                    </button>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-black/5 dark:border-white/5 shadow-sm">
              <h3 className="text-lg font-bold italic serif mb-4 text-black dark:text-white">Trending Scenarios</h3>
              <div className="space-y-3">
                 <div onClick={() => onOpenForum('funeral-planning-guide')} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors border border-transparent dark:border-orange-500/10">
                    <p className="text-xs font-bold text-orange-900 dark:text-orange-200 leading-relaxed mb-1">Funeral Committee</p>
                    <p className="text-[10px] text-orange-600/70 dark:text-orange-400/80 uppercase tracking-widest font-black">Plan & Fundraise</p>
                 </div>
                 <div onClick={() => onOpenForum('chama-governance-101')} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-transparent dark:border-green-500/10">
                    <p className="text-xs font-bold text-green-900 dark:text-green-200 leading-relaxed mb-1">Chama / Table Banking</p>
                    <p className="text-[10px] text-green-600/70 dark:text-green-400/80 uppercase tracking-widest font-black">Manage Group Savings</p>
                 </div>
                 <div onClick={() => onOpenForum('family-reunion-funding')} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-transparent dark:border-blue-500/10">
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-200 leading-relaxed mb-1">Extended Family Reunion</p>
                    <p className="text-[10px] text-blue-600/70 dark:text-blue-400/80 uppercase tracking-widest font-black">Organize & Pool Funds</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
      {showWizard && <CreateCommunityWizard user={user} onClose={() => setShowWizard(false)} />}
    </div>
  );
}
