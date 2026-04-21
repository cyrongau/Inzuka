import React, { useState } from 'react';
import { Landmark, Plus, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface VaultManagementProps {
  userId: string;
  bankAccounts: any[];
  currency: string;
}

export const VaultManagement: React.FC<VaultManagementProps> = ({
  userId,
  bankAccounts,
  currency
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newBank, setNewBank] = useState({ name: '', account: '', balance: '' });

  const handleAdd = async () => {
    if (!newBank.name || !newBank.balance) return;
    try {
        await addDoc(collection(db, 'bankAccounts'), {
            userId,
            bankName: newBank.name,
            accountNumber: newBank.account,
            balance: parseFloat(newBank.balance),
            updatedAt: serverTimestamp()
        });
        setNewBank({ name: '', account: '', balance: '' });
        setIsAdding(false);
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-[10px] tracking-[0.25em] uppercase text-gray-400 dark:text-gray-500 italic serif">Linked Bank Accounts</h4>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="bg-black dark:bg-white text-white dark:text-black p-2.5 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-xl shadow-black/10 dark:shadow-white/10"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-[2rem] border border-black/[0.02] dark:border-white/[0.02]">
               <input 
                 type="text" placeholder="Institution Name"
                 className="w-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-black/20 dark:focus:border-white/20"
                 value={newBank.name} onChange={e => setNewBank({...newBank, name: e.target.value})}
               />
               <input 
                 type="text" placeholder="Account Number (Optional)"
                 className="w-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-black/20 dark:focus:border-white/20"
                 value={newBank.account} onChange={e => setNewBank({...newBank, account: e.target.value})}
               />
               <input 
                 type="number" placeholder="Current Balance"
                 className="w-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-black/20 dark:focus:border-white/20"
                 value={newBank.balance} onChange={e => setNewBank({...newBank, balance: e.target.value})}
               />
               <button 
                 onClick={handleAdd}
                 className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform"
               > Link Node </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {bankAccounts.length === 0 ? (
            <div className="text-center py-10 grayscale opacity-30 space-y-4">
                <Landmark className="w-12 h-12 mx-auto dark:text-white" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] italic serif dark:text-white">No external vaults linked</p>
            </div>
        ) : bankAccounts.map(b => (
            <motion.div 
              layout
              key={b.id} 
              className="p-6 bg-gray-50/50 dark:bg-zinc-800/50 rounded-3xl border border-black/[0.03] dark:border-white/[0.03] group hover:border-black/10 dark:hover:border-white/10 transition-all relative overflow-hidden"
            >
                 <div className="absolute top-0 left-0 w-1 h-full bg-black/10 dark:bg-white/10 group-hover:bg-black dark:group-hover:bg-white transition-colors"></div>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-black/[0.05] dark:border-white/[0.05] flex items-center justify-center">
                        <Landmark className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                        <p className="text-sm font-black italic serif underline decoration-black/5 dark:decoration-white/5 underline-offset-4 text-black dark:text-white">{b.bankName}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-1">{b.accountNumber || 'Primary Stream'}</p>
                    </div>
                 </div>
                 <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-green-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-green-600/50 dark:text-green-400/50">Secured Node</span>
                    </div>
                    <p className="font-black italic serif text-lg text-black dark:text-white">{currency} {(b.balance || 0).toLocaleString()}</p>
                 </div>
                 <button 
                    onClick={() => deleteDoc(doc(db, 'bankAccounts', b.id))} 
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                 >
                    <X className="w-4 h-4" />
                 </button>
            </motion.div>
        ))}
      </div>
    </div>
  );
};
