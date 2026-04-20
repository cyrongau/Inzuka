import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { extractTransactionFromText, extractTransactionFromImage, TransactionExtraction } from '../../../../services/aiService';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  Plus,
  ArrowRight,
  PieChart,
  Calendar,
  History,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User as UserIcon,
  ChevronRight,
  ArrowRightCircle,
  Scan,
  MessageSquareQuote,
  Loader2,
  FileSearch,
  Upload
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function CommunityFinanceModule({ community, user }: { community: any, user: User }) {
  const [activeSubTab, setActiveSubTab] = useState<'treasury' | 'loans' | 'merry-go-round'>('treasury');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loanRequests, setLoanRequests] = useState<any[]>([]);
  const [merryGoRound, setMerryGoRound] = useState<any>(null);
  const [showContribute, setShowContribute] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // AI Smart Entry State
  const [showSmartEntry, setShowSmartEntry] = useState(false);
  const [smartInputType, setSmartInputType] = useState<'text' | 'image'>('text');
  const [smartText, setSmartText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [extractedData, setExtractedData] = useState<TransactionExtraction | null>(null);
  
  // Editable states for smart entry
  const [editSmartName, setEditSmartName] = useState('');
  const [editSmartAmount, setEditSmartAmount] = useState('');
  const [editSmartRef, setEditSmartRef] = useState('');
  const [editSmartDate, setEditSmartDate] = useState('');

  // Loan specific state
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [repaymentDate, setRepaymentDate] = useState('');

  const isModerator = community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid;

  useEffect(() => {
    const unsubTrans = onSnapshot(query(
      collection(db, 'communities', community.id, 'transactions'),
      orderBy('createdAt', 'desc')
    ), (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubLoans = onSnapshot(query(
      collection(db, 'communities', community.id, 'loan_requests'),
      orderBy('createdAt', 'desc')
    ), (snap) => setLoanRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubMGR = onSnapshot(doc(db, 'communities', community.id, 'merryGoRound', 'config'), (doc) => {
      if (doc.exists()) setMerryGoRound(doc.data());
    });

    return () => {
      unsubTrans();
      unsubLoans();
      unsubMGR();
    };
  }, [community.id]);

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    try {
      await addDoc(collection(db, 'communities', community.id, 'transactions'), {
        type: 'contribution',
        amount: val,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        note: note || 'Group contribution',
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'communities', community.id), {
        poolBalance: increment(val)
      });

      toast.success(`Successfully contributed KES ${val.toLocaleString()}`);
      setAmount('');
      setNote('');
      setShowContribute(false);
    } catch (e) {
      console.error(e);
      toast.error("Contribution failed.");
    }
  };

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(loanAmount);
    if (isNaN(val) || val <= 0) return;

    try {
      await addDoc(collection(db, 'communities', community.id, 'loan_requests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        amount: val,
        purpose: loanPurpose,
        repaymentDate: repaymentDate,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("Loan application submitted for review.");
      setLoanAmount(''); setLoanPurpose(''); setRepaymentDate('');
      setShowLoanForm(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit loan request.");
    }
  };

  const handleLoanAction = async (loanId: string, status: 'approved' | 'rejected', loanAmt: number) => {
    try {
      if (status === 'approved') {
        if ((community.poolBalance || 0) < loanAmt) {
          toast.error("Insufficient group pool funds.");
          return;
        }
        await updateDoc(doc(db, 'communities', community.id, 'loan_requests', loanId), { status: 'approved' });
        await updateDoc(doc(db, 'communities', community.id), { poolBalance: increment(-loanAmt) });
        await addDoc(collection(db, 'communities', community.id, 'transactions'), {
          type: 'loan_disbursement',
          amount: loanAmt,
          userId: user.uid,
          note: `Loan disbursement approved by officials`,
          createdAt: serverTimestamp()
        });
        toast.success("Loan approved.");
      } else {
        await updateDoc(doc(db, 'communities', community.id, 'loan_requests', loanId), { status: 'rejected' });
        toast.info("Loan rejected.");
      }
    } catch (e) {
      toast.error("Action failed.");
    }
  };

  const handleMGRPayout = async () => {
    if (!merryGoRound || !isModerator) return;
    const { sequence, currentIndex, payoutAmount } = merryGoRound;
    const recipientId = sequence[currentIndex];
    
    try {
      // 1. Record transaction
      await addDoc(collection(db, 'communities', community.id, 'transactions'), {
        type: 'mgr_payout',
        amount: payoutAmount,
        recipientId,
        note: `Merry-Go-Round payout to cycle recipient`,
        createdAt: serverTimestamp()
      });

      // 2. Update index
      const nextIndex = (currentIndex + 1) % sequence.length;
      await updateDoc(doc(db, 'communities', community.id, 'merryGoRound', 'config'), {
        currentIndex: nextIndex,
        lastPayoutDate: serverTimestamp()
      });

      toast.success("Payout cycle advanced successfully.");
    } catch (e) {
      toast.error("Cycle update failed.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Sub-Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
         {[
           { id: 'treasury', label: 'Treasury', icon: DollarSign },
           { id: 'loans', label: 'Loans', icon: Clock },
           { id: 'merry-go-round', label: 'Merry-Go-Round', icon: RefreshCw }
         ].map(t => (
           <button 
             key={t.id}
             onClick={() => setActiveSubTab(t.id as any)}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
               activeSubTab === t.id ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-black"
             )}
           >
             <t.icon className="w-3.5 h-3.5" />
             {t.label}
           </button>
         ))}
      </div>

      {activeSubTab === 'treasury' && (
        <>
          {/* Treasury Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                <div className="relative z-10">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                      <DollarSign className="w-6 h-6" />
                   </div>
                   <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Total Pool Balance</p>
                   <h3 className="text-4xl font-black italic serif">KES {(community.poolBalance || 0).toLocaleString()}</h3>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                   <PieChart className="w-6 h-6" />
                </div>
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">My Contribution</p>
                <h3 className="text-3xl font-black italic serif">KES {transactions.filter(t => t.userId === user.uid && t.type === 'contribution').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</h3>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col justify-center gap-4">
                <button onClick={() => setShowContribute(true)} className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                   <Plus className="w-4 h-4" /> Contribute Funds
                </button>
                {isModerator && (
                  <button onClick={() => setShowSmartEntry(true)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                     <Scan className="w-4 h-4" /> Smart Entry (SMS/NLP)
                  </button>
                )}
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm">
             <h2 className="text-xl font-bold italic serif flex items-center gap-2 mb-8">
               <History className="w-5 h-5 text-gray-400" /> Transaction Ledger
             </h2>
             <div className="space-y-4">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-black/[0.02]">
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          t.type === 'contribution' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                           {t.type === 'contribution' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                           <p className="text-sm font-bold">{t.userName || 'System Auto'}</p>
                           <p className="text-[10px] text-gray-400 font-medium">{t.note}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={cn("text-sm font-black", t.type === 'contribution' ? "text-green-600" : "text-red-600")}>
                           {t.type === 'contribution' ? '+' : '-'} {t.amount?.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                           {t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleDateString() : '...'}
                        </p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </>
      )}

      {activeSubTab === 'loans' && (
         <div className="space-y-8">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold italic serif flex items-center gap-2">
                 <Clock className="w-5 h-5 text-blue-500" /> Loan Management
               </h2>
               <button onClick={() => setShowLoanForm(true)} className="px-6 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                  Request Loan
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {loanRequests.map(l => (
                 <div key={l.id} className="p-6 bg-white rounded-[2rem] border border-black/5 shadow-xs">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">{l.userName}</p>
                          <h4 className="text-lg font-black italic serif">KES {l.amount?.toLocaleString()}</h4>
                          <p className="text-xs text-gray-500 mt-1">{l.purpose}</p>
                       </div>
                       <span className={cn(
                          "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                          l.status === 'pending' ? "bg-orange-100 text-orange-700" :
                          l.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                       )}>{l.status}</span>
                    </div>

                    {isModerator && l.status === 'pending' && (
                      <div className="flex gap-2 pt-4 border-t border-black/5">
                        <button onClick={() => handleLoanAction(l.id, 'approved', l.amount)} className="flex-1 py-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase transition-all">Approve</button>
                        <button onClick={() => handleLoanAction(l.id, 'rejected', l.amount)} className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-bold uppercase border border-black/5 transition-all">Reject</button>
                      </div>
                    )}
                 </div>
               ))}
               {loanRequests.length === 0 && <p className="text-center text-gray-400 py-12 text-xs italic bg-gray-50 rounded-[2rem] border border-black/5 border-dashed">No loan applications found.</p>}
            </div>
         </div>
      )}

      {activeSubTab === 'merry-go-round' && (
         <div className="space-y-8 max-w-4xl">
            <h2 className="text-xl font-bold italic serif flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" /> Merry-Go-Round Cycle (Table Banking)
            </h2>
            
            {merryGoRound ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                     <div className="bg-orange-500 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute -right-4 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                           <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest">Next in Line to Receive</p>
                           <h3 className="text-3xl font-black italic serif mt-2">Member {merryGoRound.sequence[merryGoRound.currentIndex].slice(-4)}</h3>
                           <p className="text-4xl font-black mt-4 tracking-tighter">KES {merryGoRound.payoutAmount?.toLocaleString()}</p>
                           <div className="mt-6 flex items-center gap-2 text-orange-100 font-bold text-xs">
                              <Calendar className="w-4 h-4" /> Next Payout: {merryGoRound.nextPayoutDate?.toDate ? new Date(merryGoRound.nextPayoutDate.toDate()).toLocaleDateString() : 'Scheduled'}
                           </div>
                        </div>
                     </div>

                     {isModerator && (
                        <button 
                          onClick={handleMGRPayout}
                          className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-all hover:scale-[1.02]"
                        >
                           <ArrowRightCircle className="w-4 h-4" /> Finalize Cycle & Payout
                        </button>
                     )}
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Cycle Sequence</h4>
                     <div className="space-y-3">
                        {merryGoRound.sequence.map((mid: string, i: number) => (
                           <div key={mid} className={cn(
                             "p-4 rounded-2xl flex items-center justify-between border transition-all",
                             merryGoRound.currentIndex === i ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-transparent opacity-60"
                           )}>
                              <div className="flex items-center gap-3">
                                 <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", merryGoRound.currentIndex === i ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400")}>{i + 1}</span>
                                 <p className="font-bold text-sm">Member {mid.slice(-4)}</p>
                              </div>
                              {merryGoRound.currentIndex === i && <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest">Collecting Next</span>}
                              {merryGoRound.currentIndex > i && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            ) : (
               <div className="p-12 bg-gray-50 rounded-[3rem] border border-black/5 border-dashed text-center">
                  <Info className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-gray-400 italic">No Merry-Go-Round cycle configured for this hub yet.</p>
                  {isModerator && (
                     <p className="text-xs text-blue-500 mt-2 font-bold cursor-pointer hover:underline" onClick={() => {
                        setDoc(doc(db, 'communities', community.id, 'merryGoRound', 'config'), {
                           sequence: community.memberIds,
                           currentIndex: 0,
                           payoutAmount: 5000,
                           frequency: 'monthly',
                           createdAt: serverTimestamp()
                        });
                        toast.success("Initial cycle bootstrapped successfully.");
                     }}>Initialize Default Cycle</p>
                  )}
               </div>
            )}
         </div>
      )}

      {showSmartEntry && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative my-8">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black serif italic flex items-center gap-3">
                    <Scan className="w-8 h-8 text-blue-500" /> Smart Deposit Entry
                  </h2>
                  <button onClick={() => { setShowSmartEntry(false); setExtractedData(null); setSmartText(''); }} className="p-2 hover:bg-gray-100 rounded-full">
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </button>
               </div>

               {!extractedData ? (
                 <div className="space-y-8">
                    <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl w-fit">
                       <button 
                         onClick={() => setSmartInputType('text')}
                         className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", smartInputType === 'text' ? "bg-white shadow-sm text-blue-600" : "text-gray-400")}
                       >SMS Text NLP</button>
                       <button 
                         onClick={() => setSmartInputType('image')}
                         className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", smartInputType === 'image' ? "bg-white shadow-sm text-blue-600" : "text-gray-400")}
                       >Receipt Scan</button>
                    </div>

                    {smartInputType === 'text' ? (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                           <MessageSquareQuote className="w-3 h-3" /> Paste Transaction SMS
                        </label>
                        <textarea 
                          placeholder="Paste M-Pesa, Bank, or payment SMS here..."
                          value={smartText}
                          onChange={e => setSmartText(e.target.value)}
                          className="w-full bg-gray-50 rounded-2xl p-6 font-medium text-sm outline-none border border-black/5 h-48 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button 
                          onClick={async () => {
                            if (!smartText.trim()) return;
                            setIsProcessingAI(true);
                            const result = await extractTransactionFromText(smartText);
                            if (result) {
                              setExtractedData(result);
                              setEditSmartName(result.name);
                              setEditSmartAmount(result.amount.toString());
                              setEditSmartRef(result.reference);
                              setEditSmartDate(result.date);
                            }
                            setIsProcessingAI(false);
                          }}
                          disabled={!smartText.trim() || isProcessingAI}
                          className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                           {isProcessingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze Transaction Text"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="border-4 border-dashed border-gray-100 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center gap-4 bg-gray-50/50 hover:bg-gray-50 transition-colors group relative overflow-hidden">
                           <Upload className="w-12 h-12 text-gray-300 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                           <div>
                              <p className="font-bold text-gray-400">Click to upload or drag receipt image</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-1">JPEG, PNG supported</p>
                           </div>
                           <input 
                             type="file" 
                             accept="image/*" 
                             className="absolute inset-0 opacity-0 cursor-pointer"
                             onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (!file) return;
                               setIsProcessingAI(true);
                               const reader = new FileReader();
                               reader.onloadend = async () => {
                                 const base64 = (reader.result as string).split(',')[1];
                                 const result = await extractTransactionFromImage(base64, file.type);
                                 if (result) {
                                   setExtractedData(result);
                                   setEditSmartName(result.name);
                                   setEditSmartAmount(result.amount.toString());
                                   setEditSmartRef(result.reference);
                                   setEditSmartDate(result.date);
                                 }
                                 setIsProcessingAI(false);
                               };
                               reader.readAsDataURL(file);
                             }}
                           />
                        </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4">
                       <CheckCircle2 className="w-8 h-8 text-blue-600" />
                       <div>
                          <h4 className="font-black italic serif text-blue-900">Analysis Complete</h4>
                          <p className="text-xs font-medium text-blue-700">Verified transaction details from {smartInputType === 'text' ? 'SMS NLP' : 'Receipt OCR'}.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 px-2">Sender Identity</label>
                          <input 
                            type="text"
                            value={editSmartName}
                            onChange={e => setEditSmartName(e.target.value)}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-black/5 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 px-2">Transaction Ref</label>
                          <input 
                            type="text"
                            value={editSmartRef}
                            onChange={e => setEditSmartRef(e.target.value)}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-black/5 font-bold font-mono outline-none focus:ring-2 focus:ring-blue-100"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 px-2">Value ({extractedData.currency || 'KES'})</label>
                          <input 
                            type="number"
                            value={editSmartAmount}
                            onChange={e => setEditSmartAmount(e.target.value)}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-black/5 font-black text-xl italic serif outline-none focus:ring-2 focus:ring-blue-100"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 px-2">Timestamp Detected</label>
                          <input 
                            type="text"
                            value={editSmartDate}
                            onChange={e => setEditSmartDate(e.target.value)}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-black/5 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                          />
                       </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button 
                         onClick={() => setExtractedData(null)}
                         className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-[10px]"
                       >Discard</button>
                       <button 
                         onClick={async () => {
                            if (!extractedData) return;
                            const finalAmount = parseFloat(editSmartAmount);
                            if (isNaN(finalAmount)) {
                              toast.error("Invalid amount.");
                              return;
                            }
                            try {
                              await addDoc(collection(db, 'communities', community.id, 'transactions'), {
                                type: 'contribution',
                                amount: finalAmount,
                                userId: 'external_ai_entry',
                                userName: editSmartName,
                                note: `Smart Entry via ${editSmartRef}`,
                                reference: editSmartRef,
                                createdAt: serverTimestamp(),
                                metadata: { 
                                  ...extractedData, 
                                  name: editSmartName,
                                  amount: finalAmount,
                                  reference: editSmartRef,
                                  date: editSmartDate,
                                  smartType: smartInputType 
                                }
                              });
                              await updateDoc(doc(db, 'communities', community.id), {
                                poolBalance: increment(finalAmount)
                              });
                              toast.success(`Smart Entry: KES ${finalAmount.toLocaleString()} recorded.`);
                              setShowSmartEntry(false);
                              setExtractedData(null);
                            } catch (e) {
                              toast.error("Failed to save entry.");
                            }
                         }}
                         className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                       >Confirm & Record Transaction</button>
                    </div>
                 </div>
               )}
            </div>
         </div>
      )}

      {/* Modals... (omitted for brevity but kept functional in code) */}
      {showContribute && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
               <h2 className="text-2xl font-black serif italic mb-8">Group Contribution</h2>
               <form onSubmit={handleContribute} className="space-y-6">
                  <input type="number" required placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none border border-black/5" />
                  <input type="text" placeholder="Note" value={note} onChange={e => setNote(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-4 outline-none border border-black/5" />
                  <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase">Send Funds</button>
                  <button type="button" onClick={() => setShowContribute(false)} className="w-full py-4 text-gray-400 font-bold">Cancel</button>
               </form>
            </div>
         </div>
      )}

      {showLoanForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
               <h2 className="text-2xl font-black serif italic mb-8">Loan Application</h2>
               <form onSubmit={handleApplyLoan} className="space-y-6">
                  <input type="number" required placeholder="Requested Amount" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none border border-black/5" />
                  <textarea placeholder="Purpose" value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-4 outline-none border border-black/5 h-24" />
                  <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase">Submit Application</button>
                  <button type="button" onClick={() => setShowLoanForm(false)} className="w-full py-4 text-gray-400 font-bold">Cancel</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
