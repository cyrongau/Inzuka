import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface TransactionHistoryProps {
  transactions: any[];
  userUid: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  userUid
}) => {
  return (
    <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm min-h-[500px]">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-bold italic serif tracking-tight flex items-center gap-3">
          <History className="w-6 h-6" /> Capital Flow Ledger
        </h3>
        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors">Manifest All</button>
      </div>
      
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {transactions.length === 0 ? (
            <div className="py-20 text-center opacity-20 italic serif text-xl">The ledger is silent.</div>
          ) : transactions.map((tx) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={tx.id} 
              className="flex items-center justify-between p-6 rounded-[2rem] border border-black/[0.03] hover:bg-gray-50 hover:shadow-lg transition-all group"
            >
               <div className="flex items-center gap-6">
                 <div className={cn(
                   "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                   tx.fromUserId === userUid ? "bg-red-50 text-red-600 shadow-sm border border-red-100" : "bg-green-50 text-green-600 shadow-sm border border-green-100"
                 )}>
                   {tx.fromUserId === userUid ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownLeft className="w-7 h-7" />}
                 </div>
                 <div>
                   <p className="font-black text-lg tracking-tight text-gray-900 italic serif">{tx.description}</p>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">
                     {tx.createdAt ? (
                       typeof tx.createdAt.toDate === 'function' 
                         ? format(tx.createdAt.toDate(), 'MMM d, h:mm a') 
                         : (typeof tx.createdAt === 'string' || typeof tx.createdAt === 'number' 
                             ? format(new Date(tx.createdAt), 'MMM d, h:mm a') 
                             : 'Pending Resonance')
                     ) : 'Pending Resonance'} • {tx.type}
                   </p>
                 </div>
               </div>
               <div className="text-right">
                 <p className={cn(
                   "text-2xl font-black italic serif",
                   tx.fromUserId === userUid ? "text-red-600" : "text-green-600"
                 )}>
                   {tx.fromUserId === userUid ? '-' : '+'} KES {(tx.amount || 0).toLocaleString()}
                 </p>
                 <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300">{tx.status}</span>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
