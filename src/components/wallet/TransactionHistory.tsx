import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, ArrowUpRight, ArrowDownLeft, Edit2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface TransactionHistoryProps {
  transactions: any[];
  userUid: string;
  onEdit?: (tx: any) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  userUid,
  onEdit
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm min-h-[500px]">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-bold italic serif tracking-tight flex items-center gap-3 text-black dark:text-white">
          <History className="w-6 h-6" /> Transaction History
        </h3>
        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors">View All Transactions</button>
      </div>
      
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {transactions.length === 0 ? (
            <div className="py-20 text-center opacity-20 italic serif text-xl dark:text-white">The ledger is silent.</div>
          ) : transactions.map((tx) => {
              const type = (tx.type || '').toLowerCase();
              // Simplified and more robust outgoing logic
              // A transaction is outgoing if:
              // 1. It is explicitly a payment, withdrawal, or expense
              // 2. OR it's a transfer where the current user is the sender
              // 3. OR the current user is the sender (fromUserId) AND it's NOT a deposit, income, or funding type
              const isOutgoing = ['payment', 'withdrawal', 'expense', 'bill'].includes(type) || 
                               (type === 'transfer' && tx.fromUserId === userUid) ||
                               (tx.fromUserId === userUid && !['deposit', 'income', 'funding', 'top-up', 'savings'].includes(type));
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={tx.id} 
                  className="flex items-center justify-between p-6 rounded-[2rem] border border-black/[0.03] dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:shadow-lg transition-all group relative overflow-hidden"
                >
                   <div className="flex items-center gap-6">
                     <div className={cn(
                       "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                       isOutgoing ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm border border-red-100 dark:border-red-500/20" : "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 shadow-sm border border-green-100 dark:border-green-500/20"
                     )}>
                       {isOutgoing ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownLeft className="w-7 h-7" />}
                     </div>
                     <div>
                       <p className="font-black text-lg tracking-tight text-gray-900 dark:text-white italic serif">{tx.description}</p>
                       <div className="flex flex-col gap-1 mt-1">
                         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black dark:text-white">
                           <span className="text-gray-400 dark:text-gray-500">Transacted:</span> {tx.transactionDate ? format(new Date(tx.transactionDate), 'MMM d, yyyy') : (tx.createdAt ? (
                             typeof tx.createdAt.toDate === 'function' 
                               ? format(tx.createdAt.toDate(), 'MMM d, yyyy') 
                               : format(new Date(tx.createdAt), 'MMM d, yyyy')
                           ) : 'Date Unknown')}
                         </p>
                         <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
                           Logged: {tx.createdAt ? (
                             typeof tx.createdAt.toDate === 'function' 
                               ? format(tx.createdAt.toDate(), 'MMM d, h:mm a') 
                               : format(new Date(tx.createdAt), 'MMM d, h:mm a')
                           ) : 'Pending Resonance'} • <span className="uppercase">{tx.type}</span>
                         </p>
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                     <div className="text-right">
                       <p className={cn(
                         "text-2xl font-black italic serif",
                         isOutgoing ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                       )}>
                         {isOutgoing ? '-' : '+'} KES {(tx.amount || 0).toLocaleString()}
                       </p>
                       <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300 dark:text-gray-600">{tx.status}</span>
                     </div>
                     
                     {onEdit && (
                       <button 
                         onClick={() => onEdit(tx)}
                         className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                     )}
                   </div>
                </motion.div>
              );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
