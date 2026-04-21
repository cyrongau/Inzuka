import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, doc, runTransaction, serverTimestamp, addDoc } from 'firebase/firestore';

export default function TransactionReviewModal({ 
  onClose, 
  data, 
  wallet,
  user,
  profile
}: { 
  onClose: () => void, 
  data: any,
  wallet?: any,
  user: any,
  profile: any
}) {
  const [amount, setAmount] = useState(data.amount || 0);
  const [merchant, setMerchant] = useState(data.merchant || '');
  const [description, setDescription] = useState(data.description || '');
  const [category, setCategory] = useState(data.category === 'misc' ? '' : (data.category || 'misc'));
  const [customCategory, setCustomCategory] = useState('');
  const [transactionType, setTransactionType] = useState(data.transactionType || 'payment');
  const [paymentMethod, setPaymentMethod] = useState(data.paymentMethod || 'm-pesa');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalCategory = category === 'custom' ? customCategory : (category || 'misc');
      const finalData = { 
        ...data, 
        amount, 
        merchant, 
        description: description || merchant,
        category: finalCategory, 
        transactionType,
        paymentMethod
      };
      
      if (wallet) {
          await runTransaction(db, async (txn) => {
              const wRef = doc(db, 'wallets', wallet.id);
              const wSnap = await txn.get(wRef);
              const currentBalance = wSnap.data()?.balance || 0;
              
              let newBalance = currentBalance;
              if (finalData.transactionType === 'deposit') {
                  newBalance += finalData.amount;
              } else if (finalData.transactionType === 'payment' || finalData.transactionType === 'withdrawal') {
                  newBalance -= finalData.amount;
              }

              txn.update(wRef, { balance: newBalance, updatedAt: serverTimestamp() });
              
              const txRef = doc(collection(db, 'transactions'));
              txn.set(txRef, {
                  fromUserId: finalData.transactionType === 'deposit' ? finalData.merchant : user.uid,
                  toUserId: finalData.transactionType === 'deposit' ? user.uid : finalData.merchant,
                  amount: finalData.amount,
                  type: finalData.transactionType,
                  status: 'completed',
                  description: finalData.description,
                  category: finalData.category,
                  paymentMethod: finalData.paymentMethod,
                  metadata: { ...finalData, source: data.source || 'ai_parse' },
                  familyId: profile?.familyId || null,
                  createdAt: serverTimestamp()
              });
          });
      } else {
          await addDoc(collection(db, 'transactions'), {
              fromUserId: finalData.transactionType === 'deposit' ? finalData.merchant : user.uid,
              toUserId: finalData.transactionType === 'deposit' ? user.uid : finalData.merchant,
              amount: finalData.amount,
              type: finalData.transactionType,
              status: 'completed',
              description: finalData.description,
              category: finalData.category,
              paymentMethod: finalData.paymentMethod,
              metadata: { ...finalData, source: data.source || 'ai_parse' },
              familyId: profile?.familyId || null,
              createdAt: serverTimestamp()
          });
      }
      onClose();
    } catch(e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-black/5 dark:border-white/5">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-gray-50 dark:bg-zinc-800 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
          <X className="w-5 h-5 text-black dark:text-white" />
        </button>
        <h2 className="text-3xl font-black tracking-tight italic serif mb-2 text-black dark:text-white">Verify Transaction</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 max-w-[80%]">Confirm the details extracted by AI for perfect bookkeeping.</p>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Amount</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-black text-xl outline-none text-black dark:text-white focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Log As</label>
                <select value={transactionType} onChange={e => setTransactionType(e.target.value as any)} className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-sm text-black dark:text-white">
                   <option value="payment">Expense</option>
                   <option value="deposit">Income</option>
                   <option value="withdrawal">Withdrawal</option>
                </select>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Merchant / From</label>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} required className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-black dark:text-white" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Detailed Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-black dark:text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-sm text-black dark:text-white">
                   <option value="m-pesa">M-Pesa</option>
                   <option value="airtel-money">Airtel</option>
                   <option value="cash">Cash</option>
                   <option value="bank">Bank</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full bg-orange-50/20 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-500/50 dark:border-orange-500/30 font-medium outline-none text-sm text-black dark:text-white">
                   <option value="rent">Rent</option>
                   <option value="school_fees">School Fees</option>
                   <option value="utility">Utility</option>
                   <option value="medical">Medical</option>
                   <option value="food">Groceries</option>
                   <option value="shopping">Shopping</option>
                   <option value="transport">Transport</option>
                   <option value="business">Business</option>
                   <option value="misc">Misc</option>
                   <option value="custom">-- Custom --</option>
                </select>
             </div>
          </div>

          {category === 'custom' && (
            <div className="space-y-2 animate-in slide-in-from-top duration-200">
               <label className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Enter Custom Category</label>
               <input value={customCategory} onChange={e => setCustomCategory(e.target.value)} required placeholder="e.g. Donation, Refund..." className="w-full bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-500/30 font-medium outline-none text-black dark:text-white" />
            </div>
          )}

          <button disabled={saving} type="submit" className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all text-sm mt-4 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Reserving Log...' : 'Confirm for Ledger'}
          </button>
        </form>
      </div>
    </div>
  );
}
