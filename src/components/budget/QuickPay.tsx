import React, { useState } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { initiateStkPush } from '../../services/mpesaService';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface QuickPayProps {
  userId: string;
}

export const QuickPay: React.FC<QuickPayProps> = ({ userId }) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleMpesaPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !amount) return;
    setPaying(true);
    setStatus(null);
    try {
      let formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
      if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;
      
      await initiateStkPush(formattedPhone, parseInt(amount), 'InzukaPay');
      setStatus({ type: 'success', message: 'Payment initiated! Check your phone.' });
      
      await addDoc(collection(db, 'expenses'), {
        userId,
        amount: parseInt(amount),
        category: 'utility',
        description: `M-Pesa payment: ${phoneNumber}`,
        date: new Date().toISOString(),
        isPaid: false
      });
      
      setAmount('');
      setPhoneNumber('');
    } catch (error: any) {
      setStatus({ type: 'error', message: 'Payment failed to initiate.' });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-white/10 transition-all"></div>
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-green-400" />
          <h4 className="text-xl font-bold italic serif tracking-tight">Express Pay</h4>
        </div>
        <p className="text-xs text-white/40 font-medium leading-relaxed">Push a direct M-Pesa STK request to a phone number for instant expense logging.</p>
        
        <form onSubmit={handleMpesaPay} className="space-y-4">
          <div className="space-y-2">
            <input 
              type="tel" placeholder="Phone 07..." 
              value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
              className="w-full bg-white/10 border-0 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-white/30 placeholder:text-white/20" 
            />
          </div>
          <div className="space-y-2">
            <input 
              type="number" placeholder="Amount (KES)" 
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/10 border-0 rounded-2xl p-4 text-lg font-black italic serif focus:ring-1 focus:ring-white/30 placeholder:text-white/20" 
            />
          </div>
          
          <button 
            disabled={paying} 
            className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Engage M-Pesa'}
          </button>
        </form>

        {status && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${status.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <p className="text-[10px] font-bold uppercase tracking-tight">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
