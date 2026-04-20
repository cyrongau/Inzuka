import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Users, 
  Search, 
  Globe, 
  Lock, 
  Plus, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Tag
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, where, limit } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { motion } from 'motion/react';

export default function HubGroups({ user, profile, onSelect }: { user: User, profile: any, onSelect: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show all public communities or communities user is in
    const q = query(collection(db, 'communities'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setCommunities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = communities.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header section with Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <h1 className="text-4xl font-black italic serif tracking-tight">Networks & Groups</h1>
            <p className="text-gray-400 font-medium max-w-xl">Discover new communities, industry networks, and social collectives within the Inzuka ecosystem.</p>
            
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-black/5 max-w-md">
               <div className="pl-4 text-gray-400">
                  <Search className="w-5 h-5" />
               </div>
               <input 
                  type="text" 
                  placeholder="Search networks..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 bg-transparent font-medium focus:outline-none"
               />
            </div>
         </div>

         <div className="bg-black text-white p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Network Growth</p>
               <h3 className="text-3xl font-black italic serif underline decoration-orange-500 underline-offset-8">+2.4k</h3>
               <p className="text-xs text-white/60">New members joined Inzuka networks this week.</p>
            </div>
            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5" />
         </div>
      </div>

      {/* Grid of Networks */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {filtered.map((community, i) => (
            <motion.div 
               key={community.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               onClick={() => onSelect(community.id)}
               className="group bg-white rounded-[2.5rem] border border-black/5 p-8 shadow-sm hover:shadow-xl hover:border-black/10 transition-all cursor-pointer flex flex-col justify-between"
            >
               <div className="space-y-6">
                  <div className="flex items-start justify-between">
                     <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                        <Globe className="w-8 h-8" />
                     </div>
                     <div className="px-3 py-1 bg-gray-100 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400">
                        {community.type}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <h3 className="text-xl font-bold italic serif tracking-tight group-hover:underline underline-offset-4">{community.name}</h3>
                     <p className="text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed">
                        {community.description || "A dynamic collective focused on communal growth and shared prosperity."}
                     </p>
                  </div>
               </div>

               <div className="pt-8 border-t border-black/[0.03] mt-8 flex items-center justify-between">
                  <div className="flex -space-x-2">
                     {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold">
                           {String.fromCharCode(65 + i)}
                        </div>
                     ))}
                     <div className="w-8 h-8 rounded-full border-2 border-white bg-black text-white flex items-center justify-center text-[8px] font-black">
                        +{community.memberIds?.length || 0}
                     </div>
                  </div>
                  <div className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-widest group-hover:gap-4 transition-all">
                     Enter <ArrowRight className="w-4 h-4" />
                  </div>
               </div>
            </motion.div>
         ))}

         {/* Create New network CTA */}
         <div className="border-2 border-dashed border-black/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-black/20 transition-all group">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-all">
               <Plus className="w-8 h-8" />
            </div>
            <div>
               <h3 className="text-lg font-bold italic serif">Start a Network</h3>
               <p className="text-xs text-gray-400 font-medium">Build your own community, association, or investment group.</p>
            </div>
            <button className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
               Initialize Group
            </button>
         </div>
      </div>
    </div>
  );
}
