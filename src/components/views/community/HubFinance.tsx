import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  ShieldCheck,
  CreditCard,
  Building2,
  Table
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, where, orderBy, limit } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';

export default function HubFinance({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch communities the user is in to aggregate finances
    const q = query(collection(db, 'communities'), where('memberIds', 'array-contains', user.uid));
    const unsubComm = onSnapshot(q, (snap) => {
      setCommunities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubComm();
  }, [user.uid]);

  const totalBalance = communities.reduce((acc, curr) => acc + (curr.treasuryBalance || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black italic serif tracking-tight">Table Banking</h1>
           <p className="text-gray-400 font-medium mt-2">Aggregated financial intelligence across all your communal hubs.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-6 py-4 bg-white rounded-3xl border border-black/5 shadow-sm text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Pooled Wealth</p>
              <p className="text-2xl font-black text-black">KES {totalBalance.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Summary Card */}
         <div className="lg:col-span-2 bg-black text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="relative z-10 flex justify-between items-start">
               <div className="space-y-2">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                     <Building2 className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 pt-4">Global Treasury Status</h3>
                  <h2 className="text-5xl font-black italic serif tracking-tight">KES {totalBalance.toLocaleString()}</h2>
               </div>
               <TrendingUp className="w-12 h-12 text-green-400" />
            </div>

            <div className="relative z-10 flex gap-12 pt-12 border-t border-white/10">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Active Hubs</p>
                  <p className="text-xl font-bold">{communities.length}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Growth Forecast</p>
                  <p className="text-xl font-bold text-green-400">+12.5%</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Integrity Score</p>
                  <p className="text-xl font-bold text-blue-400">98%</p>
               </div>
            </div>
         </div>

         {/* Quick Actions / Insights */}
         <div className="bg-white p-10 rounded-[3.5rem] border border-black/5 shadow-sm space-y-8">
            <h3 className="text-xl font-bold italic serif">Hub Contributions</h3>
            <div className="space-y-6">
               {communities.map((comm, idx) => (
                  <div key={comm.id} className="flex items-center justify-between group cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                           <Table className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-sm font-bold">{comm.name}</p>
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Yielding 4.2% APY</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black">KES {(comm.treasuryBalance || 0).toLocaleString()}</p>
                        <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                           <div className="h-full bg-black rounded-full" style={{ width: `${(comm.treasuryBalance / (totalBalance || 1)) * 100}%` }}></div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Transaction Feed View */}
      <div className="bg-white rounded-[3.5rem] border border-black/5 shadow-sm overflow-hidden">
         <div className="p-10 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <History className="w-6 h-6 text-gray-400" />
               <h3 className="text-2xl font-black italic serif">Unified Settlement Feed</h3>
            </div>
            <button className="px-6 py-3 bg-gray-50 hover:bg-black hover:text-white transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest">
               Load More Archives
            </button>
         </div>
         <div className="divide-y divide-black/[0.02]">
            {communities.length === 0 ? (
               <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                     <CreditCard className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium">No transactions identified across networks.</p>
               </div>
            ) : (
               <div className="p-10">
                  <p className="text-xs text-gray-400 font-medium italic">Unified feed across hubs coming in next synchronization cycle.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
