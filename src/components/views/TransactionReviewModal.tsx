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
  const [category, setCategory] = useState(data.category === 'misc' ? '' : (data.category || 'misc'));
  const [transactionType, setTransactionType] = useState(data.transactionType || 'payment');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalCategory = category || 'misc';
      const finalData = { ...data, amount, merchant, category: finalCategory, transactionType };
      
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
                  description: `${finalData.merchant}`,
                  category: finalData.category,
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
              description: `${finalData.merchant}`,
              category: finalData.category,
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
      <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-black tracking-tight italic serif mb-2">Review Log</h2>
        <p className="text-xs text-gray-500 mb-8 max-w-[80%]">The AI needs help classifying this transaction perfectly.</p>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Amount</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-black text-xl outline-none" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Merchant / Party</label>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} required className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</label>
                <select value={transactionType} onChange={e => setTransactionType(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none text-sm">
                   <option value="payment">Payment</option>
                   <option value="deposit">Deposit</option>
                   <option value="withdrawal">Withdrawal</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category / Reason</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none text-sm border-orange-500/50 bg-orange-50/20">
                   <option value="" disabled>Select Reason</option>
                   <option value="rent">Rent</option>
                   <option value="school_fees">School Fees</option>
                   <option value="utility">Utility</option>
                   <option value="medical">Medical</option>
                   <option value="food">Groceries / Food</option>
                   <option value="shopping">Shopping</option>
                   <option value="transport">Transport</option>
                   <option value="business">Pochi / Business</option>
                   <option value="misc">Miscellaneous</option>
                </select>
             </div>
          </div>

          <button disabled={saving} type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all text-sm mt-4 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Logging...' : 'Confirm & Log'}
          </button>
        </form>
      </div>
    </div>
  );
}
