import React, { useState } from 'react';
import { FileSearch, Zap, Smartphone, MessageSquareText, ShieldCheck, CheckCircle2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { scanReceipt, parseTransactionText } from '../../services/geminiService';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';

interface WalletIntelligenceProps {
  userId: string;
  familyId?: string;
  walletId: string;
}

export const WalletIntelligence: React.FC<WalletIntelligenceProps> = ({
  userId,
  familyId,
  walletId
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [reviewData, setReviewData] = useState<any>(null);

  const handleOcrScan = async (file: File) => {
    setIsProcessing(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const data = await scanReceipt(base64, file.type);
            setReviewData({ ...data, source: 'receipt_scan' });
        };
    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSmsParse = async () => {
    if (!smsText.trim()) return;
    setIsProcessing(true);
    setShowSmsModal(false);
    try {
        const data = await parseTransactionText(smsText);
        setReviewData({ ...data, source: 'sms_parse' });
        setSmsText('');
    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  const finalizeTransaction = async () => {
    if (!reviewData || !walletId) return;
    setIsProcessing(true);
    try {
        const amount = reviewData.amount;
        const type = reviewData.transactionType || 'payment';
        
        await runTransaction(db, async (txn) => {
            const walletRef = doc(db, 'wallets', walletId);
            const wSnap = await txn.get(walletRef);
            const currentBalance = wSnap.data()?.balance || 0;
            
            let newBalance = currentBalance;
            if (type === 'deposit') {
                newBalance += amount;
            } else {
                newBalance -= amount;
            }

            txn.update(walletRef, { 
                balance: newBalance,
                updatedAt: serverTimestamp()
            });

            txn.set(doc(collection(db, 'transactions')), {
                fromUserId: type === 'deposit' ? 'external_party' : userId,
                toUserId: type === 'deposit' ? userId : 'external_party',
                amount,
                type: type,
                status: 'completed',
                description: reviewData.description || reviewData.merchant || 'AI Logged Transaction',
                category: reviewData.category || 'misc',
                familyId: familyId || null,
                createdAt: serverTimestamp()
            });
        });
        setReviewData(null);
    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-white/10 transition-all duration-700"></div>
        
        <div className="flex items-center justify-between">
           <h4 className="font-bold text-xs tracking-[0.25em] uppercase text-white/50 italic serif flex items-center gap-3">
               <Zap className="w-5 h-5 text-orange-400" /> AI Smart Entry
           </h4>
           {isProcessing && <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />}
        </div>

        <div className="space-y-4">
          <p className="text-[11px] font-bold text-white/40 leading-relaxed uppercase tracking-wider">Automate transaction logging by scanning your receipts or pasting SMS notifications.</p>
          
          <div className="grid grid-cols-2 gap-4 relative z-10">
              <label className="block w-full cursor-pointer">
                  <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleOcrScan(e.target.files[0])} disabled={isProcessing} />
                  <div className="bg-white text-black py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center hover:bg-gray-100 transition-all cursor-pointer shadow-xl shadow-white/5">
                      Scan Receipt
                  </div>
              </label>
              <button 
                  onClick={() => setShowSmsModal(true)} 
                  disabled={isProcessing}
                  className="bg-white/10 text-white backdrop-blur-md border border-white/20 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center hover:bg-white/20 transition-all"
              >
                  Paste SMS
              </button>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-4 text-white/20">
           <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-white/10 border border-black backdrop-blur-sm" />
              <div className="w-6 h-6 rounded-full bg-white/5 border border-black backdrop-blur-sm" />
           </div>
           <span className="text-[9px] font-black uppercase tracking-widest italic serif">Resilience AI Active</span>
        </div>
      </div>

      <AnimatePresence>
        {showSmsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[110] flex items-center justify-center p-6">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 30 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 30 }}
               className="bg-white dark:bg-zinc-900 rounded-[4rem] p-12 max-w-lg w-full shadow-2xl space-y-10 relative overflow-hidden border border-black/5 dark:border-white/5"
            >
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-4xl font-black italic serif tracking-tight text-black dark:text-white">Paste SMS</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 italic">Enter transaction text from your messages</p>
                    </div>
                    <button onClick={() => setShowSmsModal(false)} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                      <X className="w-7 h-7 text-black dark:text-white" />
                    </button>
                </div>

                <div className="space-y-6">
                    <textarea 
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-[2rem] p-10 text-lg font-bold outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 min-h-[300px] shadow-inner text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        placeholder="Paste M-Pesa, Bank, or App notification message here..."
                        value={smsText}
                        onChange={e => setSmsText(e.target.value)}
                    />
                    <button 
                        onClick={handleSmsParse}
                        disabled={!smsText.trim() || isProcessing}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        Extract Transaction Details
                    </button>
                </div>
            </motion.div>
          </div>
        )}

        {reviewData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[110] flex items-center justify-center p-6">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white dark:bg-zinc-900 rounded-[4rem] p-12 max-w-md w-full shadow-2xl space-y-12 relative overflow-hidden border border-black/5 dark:border-white/5"
            >
                <div className="space-y-2 text-center text-black dark:text-white">
                    <h3 className="text-4xl font-black italic serif tracking-tight">Sync Review</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Validate AI Extraction</p>
                </div>

                <div className="space-y-8 bg-gray-50/50 dark:bg-zinc-800/50 p-10 rounded-[3rem] border border-black/[0.02] dark:border-white/[0.02]">
                    <div className="space-y-1 text-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-500 italic serif">Amount</label>
                        <p className="text-6xl font-black italic serif text-black dark:text-white">KES {reviewData.amount.toLocaleString()}</p>
                        <p className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] mt-2",
                            reviewData.transactionType === 'deposit' ? "text-green-500" : "text-red-500"
                        )}>
                            {reviewData.transactionType === 'deposit' ? 'Income' : 'Expense'}
                        </p>
                    </div>
                    
                    <div className="h-px bg-black/[0.05] dark:bg-white/[0.05] w-full" />

                    <div className="space-y-6">
                        <div className="flex justify-between items-center group">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 italic serif">Party</span>
                            <span className="text-sm font-black italic serif text-black dark:text-white">{reviewData.merchant || reviewData.description || 'Unidentified'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 italic serif">Category</span>
                            <span className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">
                                {reviewData.category || 'Misc'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={finalizeTransaction}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                    > Confirm Sync </button>
                    <button 
                        onClick={() => setReviewData(null)}
                        className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-[10px] hover:text-black dark:hover:text-white transition-colors"
                    > Discard artifact </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
