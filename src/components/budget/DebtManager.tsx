import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandCoins, ArrowUpRight, ArrowDownLeft, Plus, Trash2, CheckCircle2, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface DebtManagerProps {
  userId: string;
  loans: any[];
}

export const DebtManager: React.FC<DebtManagerProps> = ({
  userId,
  loans
}) => {
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState('');
  const [debtType, setDebtType] = useState<'lent' | 'borrowed'>('lent');

  const handleAddEntry = async () => {
    if (!amount || !person) return;
    try {
      await addDoc(collection(db, 'loans'), {
        userId,
        amount: parseInt(amount),
        person,
        type: debtType,
        isSettled: false,
        date: new Date().toISOString()
      });
      setPerson('');
      setAmount('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2 italic serif text-black dark:text-white">
            <HandCoins className="w-5 h-5" /> Manage Obligations
          </h3>
          <div className="space-y-6">
            <div className="flex gap-2">
              <button 
                onClick={() => setDebtType('lent')}
                className={cn(
                  "flex-1 p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex flex-col items-center",
                  debtType === 'lent' ? "bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105 border-transparent" : "bg-gray-50 dark:bg-zinc-800 text-gray-400 border-black/5 dark:border-white/5"
                )}
              >
                <ArrowUpRight className="w-4 h-4" />
                Lent Out
              </button>
              <button 
                onClick={() => setDebtType('borrowed')}
                className={cn(
                  "flex-1 p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex flex-col items-center",
                  debtType === 'borrowed' ? "bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105 border-transparent" : "bg-gray-50 dark:bg-zinc-800 text-gray-400 border-black/5 dark:border-white/5"
                )}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Borrowed
              </button>
            </div>
            
            <div className="space-y-4">
              <input 
                type="text" placeholder="Entity Name (e.g. Aunt J, Shop)" 
                value={person} onChange={e => setPerson(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
              <input 
                type="number" placeholder="KES 0.00" 
                value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-5 text-2xl font-black italic serif outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
              <button 
                onClick={handleAddEntry}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-2xl font-bold text-sm tracking-widest uppercase shadow-xl hover:shadow-black/20 transition-all mt-4 outline-none"
              >
                Sync Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm min-h-[500px]">
        <h3 className="text-2xl font-bold tracking-tight mb-8 italic serif text-black dark:text-white">Obligation Ledger</h3>
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {loans.map((loan) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={loan.id} 
                className={cn(
                  "flex items-center justify-between p-7 rounded-[2.5rem] border border-black/[0.03] dark:border-white/[0.03] transition-all group",
                  loan.isSettled ? "opacity-50 grayscale bg-gray-50 dark:bg-white/5" : "bg-white dark:bg-zinc-800/50 hover:shadow-xl dark:hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-12",
                    loan.type === 'lent' ? "bg-blue-600" : "bg-red-600"
                  )}>
                    {loan.type === 'lent' ? <ArrowUpRight className="w-8 h-8" /> : <ArrowDownLeft className="w-8 h-8" />}
                  </div>
                  <div>
                    <p className="font-black text-xl italic serif text-black dark:text-white">{loan.person}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {loan.type === 'lent' ? 'Resource Lent' : 'Resource Borrowed'} • {format(new Date(loan.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-2xl font-black text-black dark:text-white">KES {loan.amount.toLocaleString()}</p>
                    <button 
                      onClick={() => updateDoc(doc(db, 'loans', loan.id), { isSettled: !loan.isSettled })}
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest mt-2 flex items-center justify-end gap-2",
                        loan.isSettled ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-600 hover:text-black dark:hover:text-white"
                      )}
                    >
                      {loan.isSettled ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                      {loan.isSettled ? 'Settled' : 'Mark Settled'}
                    </button>
                  </div>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'loans', loan.id))}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loans.length === 0 && (
            <div className="text-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-black/5 dark:border-white/5">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic serif text-black dark:text-white">Your ledger is clear of debt.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
