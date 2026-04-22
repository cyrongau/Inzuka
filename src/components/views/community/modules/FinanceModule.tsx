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
  Upload,
  Tags,
  AlertCircle
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { format, addMonths, addWeeks, addDays } from 'date-fns';

export default function CommunityFinanceModule({ community, user }: { community: any, user: User }) {
  const [activeSubTab, setActiveSubTab] = useState<'treasury' | 'loans' | 'table-banking'>('treasury');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loanRequests, setLoanRequests] = useState<any[]>([]);
  const [merryGoRound, setMerryGoRound] = useState<any>(null);
  const [showContribute, setShowContribute] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showLoanSettings, setShowLoanSettings] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showMGRSettings, setShowMGRSettings] = useState(false);

  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});

  // Settings states
  const [interestRate, setInterestRate] = useState(community.loanSettings?.interestRate || '');
  const [maxTerm, setMaxTerm] = useState(community.loanSettings?.maxTerm || '');
  const [interestType, setInterestType] = useState<'simple' | 'reducing'> (community.loanSettings?.interestType || 'simple');

  // Calculator states
  const [calcAmount, setCalcAmount] = useState('');
  const [calcTerm, setCalcTerm] = useState('');

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [transactionType, setTransactionType] = useState<'contribution' | 'savings'>('contribution');
  const [cyclePeriod, setCyclePeriod] = useState('');

  const generateCyclePeriods = () => {
    if (!merryGoRound || !merryGoRound.sequence) return [];
    
    const periods: string[] = [];
    const baseDate = merryGoRound.createdAt?.toDate ? merryGoRound.createdAt.toDate() : new Date();
    const frequency = merryGoRound.frequency || 'monthly';
    
    for (let i = 0; i < merryGoRound.sequence.length; i++) {
       const mid = merryGoRound.sequence[i];
       const name = userProfiles[mid]?.displayName || `Member ${mid.slice(-4)}`;
       
       let cycleDate = new Date(baseDate);
       if (frequency === 'monthly') cycleDate = addMonths(baseDate, i);
       else if (frequency === 'weekly') cycleDate = addWeeks(baseDate, i);
       else if (frequency === 'fortnightly') cycleDate = addWeeks(baseDate, i * 2);
       else if (frequency === 'daily') cycleDate = addDays(baseDate, i);
       else if (frequency === '3-days') cycleDate = addDays(baseDate, i * 3);
       else if (frequency === 'bi-weekly') cycleDate = addDays(baseDate, i * 3.5); // approx
       
       const dateStr = format(cycleDate, frequency === 'monthly' ? 'MMM yyyy' : 'MMM do, yyyy');
       periods.push(`${dateStr} - ${name}`);
    }
    
    return periods;
  };

  const getContributionsForCurrentCycle = () => {
    if (!merryGoRound) return [];
    const currentPeriod = generateCyclePeriods()[merryGoRound.currentIndex];
    return transactions.filter(t => t.cyclePeriod === currentPeriod && t.type === 'contribution');
  };

  // MGR Edit state
  const [mgrEditSequence, setMgrEditSequence] = useState<string[]>([]);
  const [mgrPayoutAmt, setMgrPayoutAmt] = useState('');
  const [mgrSlotSelection, setMgrSlotSelection] = useState('');
  const [mgrFrequency, setMgrFrequency] = useState('');

  // AI Smart Entry State
  const [showSmartEntry, setShowSmartEntry] = useState(false);
  const [smartContext, setSmartContext] = useState<{tag: string, refId?: string}>({tag: 'general'});
  const [smartInputType, setSmartInputType] = useState<'text' | 'image'>('text');
  const [smartText, setSmartText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [extractedData, setExtractedData] = useState<TransactionExtraction | null>(null);
  
  // Editable states for smart entry
  const [editSmartName, setEditSmartName] = useState('');
  const [editSmartAmount, setEditSmartAmount] = useState('');
  const [editSmartRef, setEditSmartRef] = useState('');
  const [editSmartDate, setEditSmartDate] = useState('');
  const [editSmartCategory, setEditSmartCategory] = useState('');

  const TRANSACTION_CATEGORIES = [
    'Contribution', 
    'Savings', 
    'Loan Repayment', 
    'Loan Disbursement', 
    'MGR Cycle Payout', 
    'Fines/Penalties',
    'Emergency Fund',
    'Welfare Fund'
  ];

  // Loan specific state
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [repaymentTerm, setRepaymentTerm] = useState(''); // in months

  // Reject / Appeal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectLoanId, setRejectLoanId] = useState<string | null>(null);
  const [rejectReasonType, setRejectReasonType] = useState('Insufficient Savings');
  const [rejectReasonCustom, setRejectReasonCustom] = useState('');

  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealLoanId, setAppealLoanId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');

  const isModerator = community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid || community.ownerId === user.uid || community.memberRoles?.[user.uid] === 'admin';

  useEffect(() => {
    if (!community.memberIds?.length) return;
    const fetchProfiles = async () => {
       const profiles: Record<string, any> = {};
       await Promise.all(community.memberIds.map(async (mid: string) => {
          try {
             const snap = await getDoc(doc(db, 'users', mid));
             if (snap.exists()) profiles[mid] = snap.data();
          } catch(e) {}
       }));
       setUserProfiles(profiles);
    };
    fetchProfiles();
  }, [community.memberIds]);

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
      const finalNote = cyclePeriod 
        ? `${cyclePeriod} contribution${note ? `: ${note}` : ''}`
        : (note || (transactionType === 'savings' ? 'Personal savings deposit' : 'Group contribution'));

      await addDoc(collection(db, 'communities', community.id, 'transactions'), {
        type: transactionType,
        amount: val,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        note: finalNote,
        cyclePeriod: cyclePeriod || null,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'communities', community.id), {
        poolBalance: increment(val)
      });

      toast.success(`Successfully deposited KES ${val.toLocaleString()} as ${transactionType}`);
      setAmount('');
      setNote('');
      setCyclePeriod('');
      setShowContribute(false);
    } catch (e) {
      console.error(e);
      toast.error("Transaction failed.");
    }
  };

  const calculateLoanDetails = (principal: number, rate: number, term: number, type: 'simple' | 'reducing') => {
    if (isNaN(principal) || isNaN(rate) || isNaN(term) || term <= 0) return { interest: 0, total: principal || 0 };
    
    if (type === 'simple') {
      const interest = principal * (rate / 100) * term;
      return { interest, total: principal + interest };
    } else {
      const i = rate / 100;
      if (i === 0) return { interest: 0, total: principal };
      const numerator = i * Math.pow(1 + i, term);
      const denominator = Math.pow(1 + i, term) - 1;
      const monthlyPmt = principal * (numerator / denominator);
      const total = monthlyPmt * term;
      return { interest: total - principal, total };
    }
  };

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(loanAmount);
    const term = parseInt(repaymentTerm);
    if (isNaN(val) || val <= 0 || isNaN(term) || term <= 0) return;

    const userSavings = transactions.filter(t => t.userId === user.uid && t.type === 'savings').reduce((acc, curr) => acc + curr.amount, 0);
    const maxLoan = userSavings * 3;
    
    if (val > maxLoan && maxLoan > 0) {
      toast.error(`Amount exceeds maximum limit of KES ${maxLoan.toLocaleString()}`);
      return;
    }

    try {
      const currentRate = community.loanSettings?.interestRate || 0;
      const calcType = community.loanSettings?.interestType || 'simple';
      const { interest: expectedInterest, total: totalRepayment } = calculateLoanDetails(val, currentRate, term, calcType);

      await addDoc(collection(db, 'communities', community.id, 'loan_requests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        amount: val,
        purpose: loanPurpose,
        repaymentTerm: term,
        interestRateApplied: currentRate,
        expectedInterest,
        totalRepayment,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("Loan application submitted for review.");
      setLoanAmount(''); setLoanPurpose(''); setRepaymentTerm('');
      setShowLoanForm(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit loan request.");
    }
  };

  const handleSaveLoanSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(interestRate as string);
    const term = parseInt(maxTerm as string);
    if (isNaN(rate) || isNaN(term)) return;

    try {
      await updateDoc(doc(db, 'communities', community.id), {
        loanSettings: { interestRate: rate, maxTerm: term, interestType }
      });
      toast.success("Loan settings updated.");
      setShowLoanSettings(false);
    } catch(e) {
      toast.error("Failed to update settings.");
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
        // Trigger modal instead of rejecting immediately
        setRejectLoanId(loanId);
        setShowRejectModal(true);
      }
    } catch (e) {
      toast.error("Action failed.");
    }
  };

  const submitRejectLoan = async () => {
    if (!rejectLoanId) return;
    try {
      const finalReason = rejectReasonType === 'Custom' ? rejectReasonCustom : rejectReasonType;
      await updateDoc(doc(db, 'communities', community.id, 'loan_requests', rejectLoanId), {
        status: 'rejected',
        rejectionReason: finalReason
      });
      toast.info("Loan application rejected.");
      setShowRejectModal(false);
      setRejectLoanId(null);
      setRejectReasonCustom('');
    } catch (e) {
      toast.error("Failed to reject loan.");
    }
  };

  const submitAppealLoan = async () => {
    if (!appealLoanId || !appealReason.trim()) return;
    try {
      await updateDoc(doc(db, 'communities', community.id, 'loan_requests', appealLoanId), {
        status: 'pending',
        appealReason: appealReason.trim()
      });
      toast.success("Appeal submitted successfully. Application is pending review.");
      setShowAppealModal(false);
      setAppealLoanId(null);
      setAppealReason('');
    } catch (e) {
      toast.error("Failed to submit appeal.");
    }
  };

  const handleMGRPayout = async () => {
    if (!merryGoRound || !isModerator) return;
    const { sequence, currentIndex, payoutAmount } = merryGoRound;
    const recipientId = sequence[currentIndex];
    
    // Gap closing: No payout if full cycle not raised
    if ((community.poolBalance || 0) < payoutAmount) {
       toast.error(`Cannot release payout! Ensure all members have submitted their cycle contributions. Short by KES ${(payoutAmount - (community.poolBalance || 0)).toLocaleString()}. Sending reminders...`);
       // Note: System could trigger SMS NLP reminder here natively
       return;
    }
    
    try {
      // 1. Record transaction
      await addDoc(collection(db, 'communities', community.id, 'transactions'), {
        type: 'mgr_payout',
        amount: payoutAmount,
        recipientId,
        note: `Table Banking payout to cycle recipient`,
        createdAt: serverTimestamp()
      });

      // 2. Update index
      const nextIndex = (currentIndex + 1) % sequence.length;
      await updateDoc(doc(db, 'communities', community.id, 'merryGoRound', 'config'), {
        currentIndex: nextIndex,
        lastPayoutDate: serverTimestamp()
      });
      await updateDoc(doc(db, 'communities', community.id), {
        poolBalance: increment(-Number(payoutAmount))
      });

      toast.success("Payout cycle advanced and disbursed successfully.");
    } catch (e) {
      toast.error("Cycle update failed.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Sub-Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl w-fit">
         {[
           { id: 'treasury', label: 'Treasury', icon: DollarSign },
           { id: 'loans', label: 'Loans', icon: Clock },
           { id: 'table-banking', label: 'Table Banking', icon: RefreshCw }
         ].map(t => (
           <button 
             key={t.id}
             onClick={() => setActiveSubTab(t.id as any)}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
               activeSubTab === t.id ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
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
             <div className="bg-black dark:bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group border border-transparent dark:border-white/5">
                <div className="absolute -right-4 -top-12 w-48 h-48 bg-white/10 dark:bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                <div className="relative z-10">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10 dark:border-white/5">
                      <DollarSign className="w-6 h-6" />
                   </div>
                   <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Total Pool Balance</p>
                   <h3 className="text-4xl font-black italic serif">KES {(community.poolBalance || 0).toLocaleString()}</h3>
                </div>
             </div>

             <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                   <PieChart className="w-6 h-6" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">My Contributions</p>
                    <h3 className="text-xl font-black italic serif text-black dark:text-white">KES {transactions.filter(t => t.userId === user.uid && t.type === 'contribution').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</h3>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">My Savings/Shares</p>
                    <h3 className="text-xl font-black italic serif text-blue-600 dark:text-blue-400">KES {transactions.filter(t => t.userId === user.uid && t.type === 'savings').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</h3>
                  </div>
                </div>
             </div>

             <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm flex flex-col justify-center gap-4">
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

          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-black/5 dark:border-white/5 shadow-sm">
             <h2 className="text-xl font-bold italic serif flex items-center gap-2 mb-8 text-black dark:text-white">
               <History className="w-5 h-5 text-gray-400 dark:text-gray-500" /> Transaction Ledger
             </h2>
             <div className="space-y-4">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-zinc-800/50 rounded-2xl border border-black/[0.02] dark:border-white/[0.02]">
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          t.type === 'contribution' || t.type === 'savings' ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        )}>
                           {t.type === 'contribution' || t.type === 'savings' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-black dark:text-white">{t.userName || 'System Auto'}</p>
                           <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                              {t.type === 'savings' ? <span className="text-blue-500 font-bold uppercase mr-1">[SAVINGS]</span> : null}
                              {t.type === 'loan_disbursement' ? <span className="text-orange-500 font-bold uppercase mr-1">[LOAN]</span> : null}
                              {t.type === 'mgr_payout' ? <span className="text-purple-500 font-bold uppercase mr-1">[CYCLE PAYOUT]</span> : null}
                              {t.note}
                           </p>
                        </div>
                     </div>
                        <div className="text-right">
                           <p className={cn("text-sm font-black", t.type === 'contribution' || t.type === 'savings' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                              {t.type === 'contribution' || t.type === 'savings' ? '+' : '-'} {t.amount?.toLocaleString()}
                           </p>
                           <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                              {t.createdAt?.toDate ? format(t.createdAt.toDate(), 'MMM dd, HH:mm') : '...'}
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
            <div className="flex flex-wrap items-center justify-between gap-4">
               <div>
                  <h2 className="text-xl font-bold italic serif flex items-center gap-2 text-black dark:text-white">
                    <Clock className="w-5 h-5 text-blue-500" /> Loan Management
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">Interest Rate: {community.loanSettings?.interestRate || 0}%/mo • Max Term: {community.loanSettings?.maxTerm || 0} mos</p>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={() => setShowCalculator(true)} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all border border-blue-100 dark:border-blue-900/50">
                     Calculator
                  </button>
                  {isModerator && (
                    <button onClick={() => setShowLoanSettings(true)} className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all border border-black/5 dark:border-white/5">
                       Settings
                    </button>
                  )}
                  <button onClick={() => setShowLoanForm(true)} className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                     Request Loan
                  </button>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {loanRequests.map(l => (
                 <div key={l.id} className="p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-xs flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <p className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">{l.userName}</p>
                             <h4 className="text-xl font-black italic serif text-black dark:text-white">KES {l.amount?.toLocaleString()}</h4>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{l.purpose}</p>
                          </div>
                          <span className={cn(
                             "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                             l.status === 'pending' ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400" :
                             l.status === 'approved' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" :
                             l.status === 'active' ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" :
                             l.status === 'completed' ? "bg-gray-100 dark:bg-zinc-800 text-gray-500" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                          )}>{l.status}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-black/5 dark:border-white/5">
                          <div>
                             <p className="text-[8px] font-black tracking-widest uppercase text-gray-400">Term</p>
                             <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{l.repaymentTerm} months</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-black tracking-widest uppercase text-gray-400">Total Repayment</p>
                             <p className="text-xs font-bold text-gray-800 dark:text-gray-200">KES {l.totalRepayment?.toLocaleString()}</p>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-black/5 dark:border-white/5">
                             <p className="text-[8px] font-medium text-gray-400">Interest ({l.interestRateApplied}%/mo): KES {l.expectedInterest?.toLocaleString()}</p>
                          </div>
                       </div>
                    </div>

                    {l.rejectionReason && l.status === 'rejected' && (
                       <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                          <p className="text-[10px] font-bold text-red-600 dark:text-red-400">Reason for Rejection</p>
                          <p className="text-[10px] text-red-500 dark:text-red-300 mt-1">{l.rejectionReason}</p>
                       </div>
                    )}
                    {l.appealReason && l.status === 'pending' && (
                       <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                          <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400">Member Appeal</p>
                          <p className="text-[10px] text-orange-500 dark:text-orange-300 mt-1">"{l.appealReason}"</p>
                       </div>
                    )}

                    {l.status === 'rejected' && user.uid === l.userId && (
                      <div className="pt-4 border-t border-black/5 dark:border-white/5 mt-4">
                        <button onClick={() => { setAppealLoanId(l.id); setShowAppealModal(true); }} className="w-full py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl text-[10px] font-bold uppercase transition-all">Appeal Decision</button>
                      </div>
                    )}

                    {isModerator && l.status === 'approved' && (
                      <div className="pt-4 border-t border-black/5 dark:border-white/5 mt-4">
                        <button onClick={() => {
                           setSmartContext({ tag: 'loan_disbursement', refId: l.id });
                           setShowSmartEntry(true);
                        }} className="w-full py-2 bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-md">Record Disbursement (Scan)</button>
                      </div>
                    )}

                    {l.status === 'active' && user.uid === l.userId && (
                      <div className="pt-4 border-t border-black/5 dark:border-white/5 mt-4">
                        <button onClick={() => {
                           setSmartContext({ tag: 'loan_repayment', refId: l.id });
                           setShowSmartEntry(true);
                        }} className="w-full py-2 bg-green-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-md">Make Repayment (Proof)</button>
                      </div>
                    )}

                    {isModerator && l.status === 'pending' && (
                      <div className="flex gap-2 pt-4 border-t border-black/5 dark:border-white/5">
                        <button onClick={() => handleLoanAction(l.id, 'approved', l.amount)} className="flex-1 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase transition-all">Approve</button>
                        <button onClick={() => handleLoanAction(l.id, 'rejected', l.amount)} className="px-4 py-2 bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 rounded-xl text-[10px] font-bold uppercase border border-black/5 dark:border-white/5 transition-all">Reject</button>
                      </div>
                    )}
                 </div>
               ))}
               {loanRequests.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-xs italic bg-gray-50 dark:bg-zinc-900/50 rounded-[2rem] border border-black/5 dark:border-zinc-800 border-dashed">No loan applications found.</p>}
            </div>
         </div>
      )}

      {activeSubTab === 'table-banking' && (
         <div className="space-y-8 max-w-4xl">
            <h2 className="text-xl font-bold italic serif flex items-center gap-2 text-black dark:text-white">
              <RefreshCw className="w-5 h-5 text-orange-500" /> Table Banking Cycle
            </h2>
            
            {merryGoRound ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                     <div className="bg-orange-500 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute -right-4 -top-8 w-32 h-32 bg-white/20 dark:bg-white/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                           <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest">Next in Line to Receive</p>
                           <h3 className="text-3xl font-black italic serif mt-2">{userProfiles[merryGoRound.sequence[merryGoRound.currentIndex]]?.displayName || `Member ${merryGoRound.sequence[merryGoRound.currentIndex]?.slice(-4)}`}</h3>
                           <p className="text-4xl font-black mt-4 tracking-tighter">KES {merryGoRound.payoutAmount?.toLocaleString()}</p>
                           <div className="mt-6 flex items-center gap-2 text-orange-100 font-bold text-xs">
                              <Calendar className="w-4 h-4" /> Next Payout: {merryGoRound.nextPayoutDate?.toDate ? new Date(merryGoRound.nextPayoutDate.toDate()).toLocaleDateString() : 'Scheduled'}
                           </div>
                        </div>
                     </div>

                     {isModerator && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                               setMgrEditSequence(merryGoRound?.sequence || []);
                               setMgrPayoutAmt(merryGoRound?.payoutAmount || '');
                               setMgrFrequency(merryGoRound?.frequency || 'monthly');
                               setShowMGRSettings(true);
                            }}
                            className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all border border-black/5 dark:border-white/5"
                          >
                             Manage Slots
                          </button>
                          <button 
                            onClick={handleMGRPayout}
                            className="flex-2 py-4 px-6 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all"
                          >
                             <ArrowRightCircle className="w-4 h-4" /> Finalize Payout
                          </button>
                        </div>
                     )}
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm overflow-y-auto max-h-[500px]">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6 flex justify-between items-center">
                        <span>Cycle Sequence ({merryGoRound.sequence?.length || 0} Slots)</span>
                     </h4>
                     <div className="space-y-3">
                        {merryGoRound.sequence?.map((mid: string, i: number) => (
                           <div key={`${mid}-${i}`} className={cn(
                             "p-4 rounded-2xl border transition-all",
                             merryGoRound.currentIndex === i ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50" : "bg-gray-50 dark:bg-zinc-800 border-transparent opacity-60"
                           )}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", merryGoRound.currentIndex === i ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-gray-500")}>{i + 1}</span>
                                   <p className="font-bold text-sm text-black dark:text-white">{userProfiles[mid]?.displayName || `Member ${mid.slice(-4)}`}</p>
                                </div>
                                {merryGoRound.currentIndex === i && <span className="text-[8px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-widest">Collecting Next</span>}
                                {merryGoRound.currentIndex > i && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              </div>
                              
                              {/* Cycle Progress Tracker */}
                              {merryGoRound.currentIndex === i && (
                                <div className="mt-4 pt-4 border-t border-orange-100 dark:border-orange-900/40">
                                   <div className="flex justify-between items-center mb-2">
                                      <span className="text-[8px] font-black uppercase text-orange-400 tracking-widest">Cycle Progress</span>
                                      <span className="text-[8px] font-black text-orange-600 dark:text-orange-300">
                                        KES {getContributionsForCurrentCycle().reduce((a, b) => a + b.amount, 0).toLocaleString()} / {merryGoRound.payoutAmount.toLocaleString()}
                                      </span>
                                   </div>
                                   <div className="w-full h-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (getContributionsForCurrentCycle().reduce((a, b) => a + b.amount, 0) / merryGoRound.payoutAmount) * 100)}%` }}
                                        className="h-full bg-orange-500"
                                      />
                                   </div>
                                   {getContributionsForCurrentCycle().reduce((a, b) => a + b.amount, 0) < merryGoRound.payoutAmount && (
                                      <div className="flex items-center gap-1 mt-2 text-orange-400">
                                         <AlertCircle className="w-2.5 h-2.5" />
                                         <span className="text-[8px] font-medium italic">Pending full collection...</span>
                                      </div>
                                   )}
                                </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            ) : (
               <div className="p-12 bg-gray-50 dark:bg-zinc-900/50 rounded-[3rem] border border-black/5 dark:border-zinc-800 border-dashed text-center">
                  <Info className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-sm font-bold text-gray-400 dark:text-gray-500 italic">No Table Banking cycle configured for this group yet.</p>
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
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3rem] p-10 relative my-8 border border-white/10 dark:border-white/5">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black serif italic flex items-center gap-3 text-black dark:text-white">
                    <Scan className="w-8 h-8 text-blue-500" /> Smart Deposit Entry
                  </h2>
                  <button onClick={() => { setShowSmartEntry(false); setExtractedData(null); setSmartText(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <XCircle className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </button>
               </div>

               {!extractedData ? (
                 <div className="space-y-8">
                    <div className="flex gap-4 p-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl w-fit">
                       <button 
                         onClick={() => setSmartInputType('text')}
                         className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", smartInputType === 'text' ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
                       >SMS Text NLP</button>
                       <button 
                         onClick={() => setSmartInputType('image')}
                         className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", smartInputType === 'image' ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
                       >Receipt Scan</button>
                    </div>

                    {smartInputType === 'text' ? (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 flex items-center gap-2">
                           <MessageSquareQuote className="w-3 h-3" /> Paste Transaction SMS
                        </label>
                        <textarea 
                          placeholder="Paste M-Pesa, Bank, or payment SMS here..."
                          value={smartText}
                          onChange={e => setSmartText(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-6 font-medium text-sm outline-none border border-black/5 dark:border-white/5 h-48 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
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
                              setEditSmartCategory(result.category || 'Contribution');
                            }
                            setIsProcessingAI(false);
                          }}
                          disabled={!smartText.trim() || isProcessingAI}
                          className="w-full py-5 bg-blue-600 dark:bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 dark:shadow-blue-500/10 disabled:opacity-50 transition-all"
                        >
                           {isProcessingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze Transaction Text"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="border-4 border-dashed border-gray-100 dark:border-zinc-800 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center gap-4 bg-gray-50/50 dark:bg-zinc-800/20 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors group relative overflow-hidden">
                           <Upload className="w-12 h-12 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                           <div>
                              <p className="font-bold text-gray-400 dark:text-gray-500">Click to upload or drag receipt image</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-600 mt-1">JPEG, PNG supported</p>
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
                                   setEditSmartCategory(result.category || 'Contribution');
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
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/30 flex items-center gap-4">
                       <CheckCircle2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                       <div>
                          <h4 className="font-black italic serif text-blue-900 dark:text-blue-200">Analysis Complete</h4>
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Verified transaction details from {smartInputType === 'text' ? 'SMS NLP' : 'Receipt OCR'}.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Sender Identity</label>
                          <input 
                            type="text"
                            value={editSmartName}
                            onChange={e => setEditSmartName(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 text-black dark:text-white transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Transaction Ref</label>
                          <input 
                            type="text"
                            value={editSmartRef}
                            onChange={e => setEditSmartRef(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 font-bold font-mono outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 text-black dark:text-white transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Value ({extractedData.currency || 'KES'})</label>
                          <input 
                            type="number"
                            value={editSmartAmount}
                            onChange={e => setEditSmartAmount(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 font-black text-xl italic serif outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 text-black dark:text-white transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Category Confirmation</label>
                          <select 
                            value={editSmartCategory}
                            onChange={e => setEditSmartCategory(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 text-black dark:text-white transition-all"
                          >
                            {TRANSACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2 md:col-span-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Timestamp Detected</label>
                          <input 
                            type="text"
                            value={editSmartDate}
                            onChange={e => setEditSmartDate(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 text-black dark:text-white transition-all"
                          />
                       </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button 
                         onClick={() => setExtractedData(null)}
                         className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all hover:bg-gray-200 dark:hover:bg-zinc-700"
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
                              if (smartContext.tag === 'loan_disbursement' && smartContext.refId) {
                                  await updateDoc(doc(db, 'communities', community.id, 'loan_requests', smartContext.refId), {
                                     status: 'active',
                                     balanceRemaining: finalAmount // Could set to expected totalRepayment in prod but this will initialize balance
                                  });
                                  await updateDoc(doc(db, 'communities', community.id), {
                                    poolBalance: increment(-finalAmount)
                                  });
                                  await addDoc(collection(db, 'communities', community.id, 'transactions'), {
                                    type: 'loan_disbursement',
                                    amount: finalAmount,
                                    userId: 'external_ai_entry',
                                    userName: editSmartName,
                                    note: `Loan disbursement via ${editSmartRef}`,
                                    reference: editSmartRef,
                                    createdAt: serverTimestamp(),
                                  });
                                  toast.success(`Loan Disbursement: KES ${finalAmount.toLocaleString()} recorded.`);
                              } else if (smartContext.tag === 'loan_repayment' && smartContext.refId) {
                                  const loanRef = doc(db, 'communities', community.id, 'loan_requests', smartContext.refId);
                                  const loanSnap = await getDoc(loanRef);
                                  
                                  if (loanSnap.exists()) {
                                     const currentBal = loanSnap.data().balanceRemaining || loanSnap.data().totalRepayment || 0;
                                     const newBal = Math.max(0, currentBal - finalAmount);
                                     
                                     await updateDoc(loanRef, {
                                        balanceRemaining: newBal,
                                        status: newBal <= 0 ? 'completed' : 'active'
                                     });
                                     await updateDoc(doc(db, 'communities', community.id), {
                                        poolBalance: increment(finalAmount)
                                     });
                                     await addDoc(collection(db, 'communities', community.id, 'transactions'), {
                                        type: 'contribution', // count repayments generically back to pool
                                        amount: finalAmount,
                                        userId: 'external_ai_entry',
                                        userName: editSmartName,
                                        note: `Loan Repayment via ${editSmartRef}`,
                                        reference: editSmartRef,
                                        category: editSmartCategory,
                                        createdAt: serverTimestamp(),
                                     });
                                     toast.success(`Loan Repayment: KES ${finalAmount.toLocaleString()} recorded.`);
                                  }
                              } else {
                                await addDoc(collection(db, 'communities', community.id, 'transactions'), {
                                  type: editSmartCategory === 'Savings' ? 'savings' : 'contribution',
                                  amount: finalAmount,
                                  userId: 'external_ai_entry',
                                  userName: editSmartName,
                                  note: `Smart Entry via ${editSmartRef}`,
                                  reference: editSmartRef,
                                  category: editSmartCategory,
                                  createdAt: serverTimestamp(),
                                  metadata: { 
                                    ...extractedData, 
                                    name: editSmartName,
                                    amount: finalAmount,
                                    reference: editSmartRef,
                                    date: editSmartDate,
                                    category: editSmartCategory,
                                    smartType: smartInputType 
                                  }
                                });
                                await updateDoc(doc(db, 'communities', community.id), {
                                  poolBalance: increment(finalAmount)
                                });
                                toast.success(`Smart Entry: KES ${finalAmount.toLocaleString()} recorded.`);
                              }
                              setShowSmartEntry(false);
                              setExtractedData(null);
                              setSmartContext({ tag: 'general' });
                            } catch (e) {
                              toast.error("Failed to save entry.");
                            }
                         }}
                         className="flex-2 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 dark:shadow-blue-500/10 active:scale-95 transition-all"
                       >Confirm & Record Transaction</button>
                    </div>
                 </div>
               )}
            </div>
         </div>
      )}

      {/* Modals */}
      {showContribute && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 relative border border-white/10 dark:border-white/5">
               <h2 className="text-2xl font-black serif italic mb-8 text-black dark:text-white">Deposit Funds</h2>
               <form onSubmit={handleContribute} className="space-y-6">
                  <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl">
                     <button type="button" onClick={() => setTransactionType('contribution')} className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", transactionType === 'contribution' ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white" : "text-gray-400")}>Contribution</button>
                     <button type="button" onClick={() => setTransactionType('savings')} className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", transactionType === 'savings' ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-500" : "text-gray-400")}>Shares / Savings</button>
                  </div>

                  {transactionType === 'contribution' && merryGoRound && (
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5" /> MGR Cycle Period
                      </label>
                      <select 
                        value={cyclePeriod} 
                        onChange={e => setCyclePeriod(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white transition-all text-sm"
                      >
                        <option value="">Standard Contribution</option>
                        {generateCyclePeriods().map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input type="number" required placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all" />
                  <input type="text" placeholder="Note (Optional)" value={note} onChange={e => setNote(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 outline-none border border-black/5 dark:border-white/5 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all" />
                  <button type="submit" className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-green-500/20">Send Funds</button>
                  <button type="button" onClick={() => setShowContribute(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-black dark:hover:text-white transition-all">Cancel</button>
               </form>
            </div>
         </div>
      )}

       {showLoanForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 relative border border-white/10 dark:border-white/5 overflow-y-auto max-h-[90vh]">
               <h2 className="text-2xl font-black serif italic mb-6 text-black dark:text-white">Loan Application</h2>
               
               <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-center mb-6">
                  <p className="text-[10px] font-black tracking-widest uppercase">My Total Savings</p>
                  <p className="text-xl font-black italic serif">
                     KES {transactions.filter(t => t.userId === user.uid && t.type === 'savings').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold mt-2 text-blue-500">Max Eligible Loan (3x): KES {(transactions.filter(t => t.userId === user.uid && t.type === 'savings').reduce((acc, curr) => acc + curr.amount, 0) * 3).toLocaleString()}</p>
               </div>

               <form onSubmit={handleApplyLoan} className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Principal Amount</label>
                     <input type="number" required placeholder="Requested Amount" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Term (Months)</label>
                     <input type="number" required placeholder={`Max ${community.loanSettings?.maxTerm || 0} Months`} value={repaymentTerm} onChange={e => setRepaymentTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Purpose</label>
                     <textarea placeholder="Reason for loan" value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 outline-none border border-black/5 dark:border-white/5 h-20 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all" />
                  </div>
                  <button type="submit" className="w-full py-4 mt-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Submit Application</button>
                  <button type="button" onClick={() => setShowLoanForm(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-black dark:hover:text-white transition-all">Cancel</button>
               </form>
            </div>
         </div>
      )}

      {showLoanSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 relative border border-white/10 dark:border-white/5">
               <h2 className="text-2xl font-black serif italic mb-8 text-black dark:text-white">Loan Settings</h2>
               <form onSubmit={handleSaveLoanSettings} className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Monthly Interest Rate (%)</label>
                     <input type="number" step="0.1" required placeholder="e.g. 5" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Max Term (Months)</label>
                     <input type="number" required placeholder="e.g. 6" value={maxTerm} onChange={e => setMaxTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all" />
                  </div>
                  <div className="space-y-2 px-2 pb-4">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500">Interest Calculation Basis</label>
                     <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl">
                        <button type="button" onClick={() => setInterestType('simple')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", interestType === 'simple' ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white border border-black/5 dark:border-white/10" : "text-gray-400")}>Simple Balance</button>
                        <button type="button" onClick={() => setInterestType('reducing')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", interestType === 'reducing' ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-500 border border-black/5 dark:border-white/10" : "text-gray-400")}>Reducing Balance</button>
                     </div>
                  </div>
                  <button type="submit" className="w-full py-4 mt-2 bg-blue-600 text-white rounded-2xl font-bold uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Save Settings</button>
                  <button type="button" onClick={() => setShowLoanSettings(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-black dark:hover:text-white transition-all">Close</button>
               </form>
            </div>
         </div>
      )}

      {showCalculator && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 relative border border-white/10 dark:border-white/5">
               <h2 className="text-2xl font-black serif italic mb-6 text-black dark:text-white text-center">Finance Calculator</h2>
               <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-center mb-6">
                  <p className="text-[10px] font-black tracking-widest uppercase">Community Rate</p>
                  <p className="text-xl font-black italic serif">{community.loanSettings?.interestRate || 0}% / month</p>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Principal Amount</label>
                     <input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white transition-all" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Term (Months)</label>
                     <input type="number" value={calcTerm} onChange={e => setCalcTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white transition-all" />
                  </div>
                  
                  {calcAmount && calcTerm && (
                     <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 space-y-3">
                        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-blue-500 mb-2">
                           <span>Basis: {community.loanSettings?.interestType || 'simple'} balance</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-gray-500 dark:text-gray-400">Total Interest</span>
                           <span className="font-bold text-black dark:text-white">KES {calculateLoanDetails(parseFloat(calcAmount), community.loanSettings?.interestRate || 0, parseInt(calcTerm), community.loanSettings?.interestType || 'simple').interest.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-gray-500 dark:text-gray-400">Total Repayment</span>
                           <span className="font-black text-black dark:text-white italic serif text-xl">KES {calculateLoanDetails(parseFloat(calcAmount), community.loanSettings?.interestRate || 0, parseInt(calcTerm), community.loanSettings?.interestType || 'simple').total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                        </div>
                     </div>
                  )}

                  <button type="button" onClick={() => setShowCalculator(false)} className="w-full py-4 mt-6 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold uppercase transition-all shadow-lg hover:scale-105 active:scale-95">Close</button>
               </div>
            </div>
         </div>
      )}

      {showMGRSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 relative border border-white/10 dark:border-white/5 max-h-[90vh] overflow-y-auto">
               <h2 className="text-2xl font-black serif italic mb-6 text-black dark:text-white">Manage MGR Cycle</h2>
               
               <div className="space-y-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Cycle Payout Amount (KES)</label>
                     <input type="number" required value={mgrPayoutAmt} onChange={e => setMgrPayoutAmt(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white transition-all" />
                  </div>

                  <div className="space-y-1">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Cycle Frequency</label>
                     <select value={mgrFrequency} onChange={e => setMgrFrequency(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 font-bold outline-none border border-black/5 dark:border-white/5 text-black dark:text-white transition-all">
                        <option value="daily">Daily</option>
                        <option value="3-days">Every 3 Days</option>
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Twice a Week (Bi-weekly)</option>
                        <option value="fortnightly">Every 2 Weeks</option>
                        <option value="monthly">Monthly</option>
                     </select>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black tracking-widest uppercase text-gray-500 px-2">Cycle Sequence Slots</label>
                     
                     <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 max-h-48 overflow-y-auto">
                        {mgrEditSequence.map((mid, i) => (
                           <div key={`${mid}-${i}`} className="flex items-center justify-between text-sm bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-sm">
                              <span className="font-bold text-black dark:text-white"><span className="text-gray-400 mr-2">{i+1}.</span>{userProfiles[mid]?.displayName || `Member ${mid.slice(-4)}`}</span>
                              <button onClick={() => setMgrEditSequence(s => s.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-600 p-1">
                                 <XCircle className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                        {mgrEditSequence.length === 0 && <p className="text-xs text-center text-gray-400 italic">No slots. Add members below.</p>}
                     </div>

                     <div className="flex gap-2">
                        <select 
                           value={mgrSlotSelection} 
                           onChange={e => setMgrSlotSelection(e.target.value)}
                           className="flex-1 bg-gray-50 dark:bg-zinc-800 rounded-2xl p-3 outline-none border border-black/5 dark:border-white/5 text-xs text-black dark:text-white focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                        >
                           <option value="">Select Member...</option>
                           {community.memberIds?.map((id: string) => (
                              <option key={id} value={id}>{userProfiles[id]?.displayName || `Member ${id.slice(-4)}`}</option>
                           ))}
                        </select>
                        <button 
                           onClick={() => {
                              if (mgrSlotSelection) setMgrEditSequence(s => [...s, mgrSlotSelection]);
                           }}
                           className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-bold uppercase transition-all"
                        >Add Slot</button>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-black/5 dark:border-white/5 space-y-2">
                     <button 
                        onClick={async () => {
                           try {
                              const val = parseFloat(mgrPayoutAmt);
                              if (isNaN(val) || val <= 0) return toast.error("Invalid amount");
                              if (mgrEditSequence.length === 0) return toast.error("Sequence cannot be empty");
                              
                              await updateDoc(doc(db, 'communities', community.id, 'merryGoRound', 'config'), {
                                 sequence: mgrEditSequence,
                                 payoutAmount: val,
                                 frequency: mgrFrequency,
                                 currentIndex: 0 // Reset to 0 when slots change drastically? Usually yes.
                              });
                              toast.success("Cycle settings updated");
                              setShowMGRSettings(false);
                           } catch(e) {
                              toast.error("Failed to update cycle");
                           }
                        }} 
                        className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                     >Save Cycle Settings</button>
                     <button type="button" onClick={() => setShowMGRSettings(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-black dark:hover:text-white transition-all">Cancel</button>
                  </div>
               </div>
            </div>
         </div>
      )}
      {/* Rejection Reason Modal */}
      {showRejectModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 relative border border-white/10 dark:border-white/5 shadow-2xl">
               <h2 className="text-2xl font-black serif italic mb-2 text-black dark:text-white">Reject Application</h2>
               <p className="text-gray-400 text-xs mb-8">Please provide a reason for rejecting this loan request. This will be visible to the member.</p>
               
               <div className="space-y-6">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select a reason</p>
                     <div className="grid grid-cols-1 gap-2">
                        {['Insufficient savings', 'Incomplete cycle contributions', 'High credit risk', 'Inconsistent repayment history', 'Other'].map(r => (
                           <button
                              key={r}
                              type="button"
                              onClick={() => {
                                 setRejectReasonType(r);
                                 if (r !== 'Other') setRejectReasonCustom('');
                              }}
                              className={cn(
                                 "w-full p-4 rounded-2xl text-left text-sm font-bold border transition-all",
                                 rejectReasonType === r 
                                    ? "bg-black dark:bg-white text-white dark:text-black border-transparent" 
                                    : "bg-gray-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                              )}
                           >
                              {r}
                           </button>
                        ))}
                     </div>
                  </div>

                  {rejectReasonType === 'Other' && (
                     <div className="space-y-2">
                         <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Custom Reason</p>
                         <textarea 
                            value={rejectReasonCustom}
                            onChange={e => setRejectReasonCustom(e.target.value)}
                            placeholder="Type rejection reason here..."
                            className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 min-h-[100px] outline-none border border-black/5 dark:border-white/5 text-black dark:text-white text-sm"
                         />
                     </div>
                  )}

                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Back</button>
                     <button 
                        onClick={() => submitRejectLoan()} 
                        disabled={!rejectReasonType || (rejectReasonType === 'Other' && !rejectReasonCustom)}
                        className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 disabled:opacity-50"
                     >Reject Loan</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Appeal Loan Modal */}
      {showAppealModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 relative border border-white/10 dark:border-white/5 shadow-2xl">
               <h2 className="text-2xl font-black serif italic mb-2 text-black dark:text-white">Appeal Decision</h2>
               <p className="text-gray-400 text-xs mb-8">Explain why this decision should be revised. The treasurer and admin will review your appeal.</p>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your Reason for Appeal</p>
                      <textarea 
                         value={appealReason}
                         onChange={e => setAppealReason(e.target.value)}
                         placeholder="Provide the context for your appeal here..."
                         className="w-full bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 min-h-[120px] outline-none border border-black/5 dark:border-white/5 text-black dark:text-white text-sm"
                      />
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowAppealModal(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                     <button 
                        onClick={() => submitAppealLoan()} 
                        disabled={!appealReason}
                        className="flex-[2] py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl disabled:opacity-50"
                     >Submit Appeal</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
