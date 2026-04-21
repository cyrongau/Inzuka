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
           <h1 className="text-4xl font-black italic serif tracking-tight text-black dark:text-white">Table Banking</h1>
           <p className="text-gray-400 dark:text-gray-500 font-medium mt-2">Combined finances from all your groups.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-6 py-4 bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Total Group Funds</p>
              <p className="text-2xl font-black text-black dark:text-white">KES {totalBalance.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Summary Card */}
         <div className="lg:col-span-2 bg-black dark:bg-zinc-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px] border border-transparent dark:border-white/5">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 dark:opacity-5"></div>
            <div className="relative z-10 flex justify-between items-start">
               <div className="space-y-2">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                     <Building2 className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 dark:text-white/60 pt-4">Total Funds Available</h3>
                  <h2 className="text-5xl font-black italic serif tracking-tight">KES {totalBalance.toLocaleString()}</h2>
               </div>
               <TrendingUp className="w-12 h-12 text-green-400" />
            </div>

            <div className="relative z-10 flex gap-12 pt-12 border-t border-white/10">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 dark:text-gray-400 mb-1">Active Groups</p>
                  <p className="text-xl font-bold">{communities.length}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 dark:text-gray-400 mb-1">Monthly Growth</p>
                  <p className="text-xl font-bold text-green-400">+12.5%</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 dark:text-gray-400 mb-1">Trust Score</p>
                  <p className="text-xl font-bold text-blue-400">98%</p>
               </div>
            </div>
         </div>

         {/* Quick Actions / Insights */}
         <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-8">
            <h3 className="text-xl font-bold italic serif text-black dark:text-white">Group Funds</h3>
            <div className="space-y-6">
               {communities.map((comm, idx) => (
                  <div key={comm.id} className="flex items-center justify-between group cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all">
                           <Table className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-black dark:text-white">{comm.name}</p>
                           <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest leading-none">Growing steadily</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-black dark:text-white">KES {(comm.treasuryBalance || 0).toLocaleString()}</p>
                        <div className="w-16 h-1 bg-gray-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                           <div className="h-full bg-black dark:bg-white rounded-full" style={{ width: `${(comm.treasuryBalance / (totalBalance || 1)) * 100}%` }}></div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Transaction Feed View */}
      <div className="bg-white dark:bg-zinc-900 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
         <div className="p-10 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <History className="w-6 h-6 text-gray-400 dark:text-gray-500" />
               <h3 className="text-2xl font-black italic serif text-black dark:text-white">Recent Transactions</h3>
            </div>
            <button className="px-6 py-3 bg-gray-50 dark:bg-zinc-800 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest text-black dark:text-white">
               Load More
            </button>
         </div>
         <div className="divide-y divide-black/[0.02] dark:divide-white/[0.05]">
            {communities.length === 0 ? (
               <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-gray-300 dark:text-gray-600">
                     <CreditCard className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">No transactions found in your groups yet.</p>
               </div>
            ) : (
               <div className="p-10">
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium italic">Recent transactions across your groups will appear here.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
