import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  QrCode, 
  Smartphone, 
  History, 
  Wallet as WalletIcon, 
  Send, 
  Scan,
  CreditCard,
  CheckCircle2,
  X,
  ShieldCheck,
  AlertCircle,
  Landmark,
  SmartphoneNfc,
  FileSearch,
  Zap,
  Phone
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  limit,
  runTransaction,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { scanReceipt, parseTransactionText } from '../../services/geminiService';
import { FEATURES } from '../../constants/features';
import TransactionReviewModal from './TransactionReviewModal';
import { WalletStats } from '../wallet/WalletStats';
import { TransactionHistory } from '../wallet/TransactionHistory';
import { VaultManagement } from '../wallet/VaultManagement';
import { WalletIntelligence } from '../wallet/WalletIntelligence';
import { CalendarPicker } from '../ui/CalendarPicker';
import { toast } from 'sonner';

export default function Wallet({ user, profile }: { user: User, profile: any }) {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [smsText, setSmsText] = useState('');
  const [payMode, setPayMode] = useState<'scan' | 'tap' | null>(null);

  // External Funding state
  const [fundAmount, setFundAmount] = useState('');
  const [fundMethod, setFundMethod] = useState<'m-pesa' | 'airtel-money' | 'cash' | 'bank'>('m-pesa');
  const [fundDescription, setFundDescription] = useState('');
  const [fundDate, setFundDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isFunding, setIsFunding] = useState(false);
  const [stkStatus, setStkStatus] = useState<'idle' | 'pushing' | 'verifying' | 'success'>('idle');

  // Manual Expense state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<'m-pesa' | 'airtel-money' | 'cash' | 'bank' | 'other'>('m-pesa');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('misc');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoggingExpense, setIsLoggingExpense] = useState(false);

  // Bank state
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({ name: '', account: '', balance: '' });

  // OCR state
  const [isScanning, setIsScanning] = useState(false);
  
  // Send state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Tap state (Simulation)
  const [tapping, setTapping] = useState(false);
  const [tapSuccess, setTapSuccess] = useState(false);

  // Edit Transaction state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editData, setEditData] = useState({ description: '', amount: '', type: 'payment', transactionDate: format(new Date(), 'yyyy-MM-dd') });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Use deterministic wallet ID to avoid race conditions
    const walletDocRef = doc(db, 'wallets', user.uid);
    
    // Check if wallet exists first to avoid unnecessary initialization logic in listener
    const initWallet = async () => {
      try {
        const snap = await getDoc(walletDocRef);
        if (!snap.exists()) {
          console.log("Initializing fresh wallet for:", user.uid);
          await setDoc(walletDocRef, {
            userId: user.uid,
            balance: 0.00,
            currency: 'KES'
          });
        } 
      } catch (err) {
        console.error("Wallet initialization failed:", err);
      }
    };

    initWallet();

    // Safety timeout - release loading if it takes too long
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Now subscribe
    const unsubWallet = onSnapshot(walletDocRef, (snap) => {
      if (snap.exists()) {
        setWallet({ id: snap.id, ...snap.data() });
      } else {
        // If it doesn't exist yet, we still want to clear loading so it doesn't hang
        // The init routine above will create it and trigger this snapshot again
        setWallet(null);
      }
      setLoading(false);
      clearTimeout(safetyTimeout);
    }, (err) => {
      console.error("Wallet Snapshot error:", err);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    // Transactions Listener
    // If profile is strictly missing (like empty object vs string), wait
    if (typeof profile === 'undefined') return;

    const transRef = collection(db, 'transactions');
    const transQ = profile?.familyId 
      ? query(transRef, where('familyId', '==', profile.familyId), limit(50))
      : query(transRef, where('fromUserId', '==', user.uid), limit(50));
    // For a real production app we'd use a composite query or multiple field where OR but 
    // given firestore limitations on OR queries without v9+, we rely on familyId primarily.
    // However, if no familyId, we'll try to include 'toUserId' as well by fetching and filtering if needed, 
    // but for now, improving the flip logic is key.

    const unsubTrans = onSnapshot(transQ, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => {
        const da = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const db = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return db.getTime() - da.getTime();
      });
      setTransactions(docs);
    }, (err) => {
      console.warn("Transaction listener error:", err);
      // Fail silently for transactions but ensure UI isn't blocked
    });

    return () => {
      unsubWallet();
      unsubTrans();
      clearTimeout(safetyTimeout);
    };
  }, [user, profile?.familyId]);

  useEffect(() => {
    if (!profile?.familyId) return;
    const q = query(collection(db, 'users'), where('familyId', '==', profile.familyId));
    const unsub = onSnapshot(q, (snap) => {
        setFamilyMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [profile?.familyId]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bankAccounts'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (s) => setBankAccounts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user]);

  if (loading && !wallet) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Securing your vault...</p>
      </div>
    );
  }

  // Handle Funding (Virtual Ledger or Real STK Push Escrow)
  const handleUpdateTransaction = async () => {
    if (!wallet || !editingTransaction) return;
    setUpdating(true);
    try {
        const newAmount = parseFloat(editData.amount);
        const oldAmount = editingTransaction.amount;
        const oldType = editingTransaction.type;
        const newType = editData.type;

        // Calculate balance adjustment
        const oldImpact = (oldType === 'payment' || (oldType === 'transfer' && (editingTransaction.fromUserId === user.uid || editingTransaction.senderId === user.uid))) ? -oldAmount : oldAmount;
        const newImpact = (newType === 'payment' || (newType === 'transfer' && (editingTransaction.fromUserId === user.uid || editingTransaction.senderId === user.uid))) ? -newAmount : newAmount;
        const adjustment = newImpact - oldImpact;

        // Robust ID Mapping based on type
        let updatedFromUserId = user.uid;
        let updatedToUserId = editingTransaction.merchant || editingTransaction.toUserId || 'external';

        if (newType === 'deposit') {
            // For a deposit, the user is the RECEIVER (toUserId)
            updatedToUserId = user.uid;
            // The sender should be the provider/external
            updatedFromUserId = (editingTransaction.fromUserId === user.uid) 
                ? (editingTransaction.provider || editingTransaction.toUserId || 'external')
                : editingTransaction.fromUserId;
            
            if (updatedFromUserId === user.uid) updatedFromUserId = 'external';
        } else if (newType === 'payment' || newType === 'withdrawal') {
            // For payment/withdrawal, user is SENDER (fromUserId)
            updatedFromUserId = user.uid;
            updatedToUserId = (editingTransaction.toUserId === user.uid)
                ? (editingTransaction.merchant || editingTransaction.fromUserId || 'external')
                : editingTransaction.toUserId;
            
            if (updatedToUserId === user.uid) updatedToUserId = 'external';
        }

        await runTransaction(db, async (txn) => {
            const wRef = doc(db, 'wallets', user.uid);
            const wSnap = await txn.get(wRef);
            if (!wSnap.exists()) throw new Error("Wallet not found");
            const current = wSnap.data()?.balance || 0;
            
            txn.update(wRef, { balance: current + adjustment, updatedAt: serverTimestamp() });
            txn.update(doc(db, 'transactions', editingTransaction.id), {
                amount: newAmount,
                type: newType,
                fromUserId: updatedFromUserId,
                toUserId: updatedToUserId,
                description: editData.description,
                transactionDate: editData.transactionDate,
                updatedAt: serverTimestamp()
            });
        });
        toast.success("Transaction updated successfully!");
        setShowEditModal(false);
    } catch (e: any) {
        toast.error("Failed to update: " + e.message);
        console.error(e);
    } finally {
        setUpdating(false);
    }
  };

  const handleFunding = async () => {
    if (!wallet || !fundAmount || parseFloat(fundAmount) <= 0) return;
    
    if (FEATURES.ENABLE_REAL_MONEY_ESCROW) {
        setStkStatus('pushing');
        setIsFunding(true);
        // Simulate STK Push to mobile phone
        setTimeout(() => {
            setStkStatus('verifying');
            // Simulate user entering PIN on phone
            setTimeout(async () => {
                try {
                    const amount = parseFloat(fundAmount);
                    // Update Wallet & Log
                    await runTransaction(db, async (txn) => {
                        const wRef = doc(db, 'wallets', user.uid);
                        const wSnap = await txn.get(wRef);
                        const current = wSnap.data()?.balance || 0;
                        
                        txn.update(wRef, { balance: current + amount, updatedAt: serverTimestamp() });
                        txn.set(doc(collection(db, 'transactions')), {
                            fromUserId: fundMethod,
                            toUserId: user.uid,
                            amount,
                            type: 'deposit',
                            status: 'completed',
                            provider: fundMethod,
                            description: fundDescription || `${fundMethod.toUpperCase()} Funding`,
                            paymentMethod: fundMethod,
                            familyId: profile?.familyId || null,
                            transactionDate: fundDate,
                            loggedAt: serverTimestamp(),
                            createdAt: serverTimestamp()
                        });
                    });
                    setStkStatus('success');
                    toast.success("Funds received successfully!");
                    setTimeout(() => {
                        setShowFundModal(false);
                        setStkStatus('idle');
                        setIsFunding(false);
                        setFundAmount('');
                    }, 2000);
                } catch (e: any) {
                    toast.error("Funding failed: " + e.message);
                    console.error(e);
                }
            }, 3000);
        }, 2000);
    } else {
        // VIRTUAL LEDGER LOGIC: Just log the transaction immediately without simulation
        setIsFunding(true);
        try {
            const amount = parseFloat(fundAmount);
            await runTransaction(db, async (txn) => {
                const wRef = doc(db, 'wallets', user.uid);
                const wSnap = await txn.get(wRef);
                const current = wSnap.data()?.balance || 0;
                
                txn.update(wRef, { balance: current + amount, updatedAt: serverTimestamp() });
                txn.set(doc(collection(db, 'transactions')), {
                    fromUserId: 'manual_entry',
                    toUserId: user.uid,
                    amount,
                    type: 'deposit',
                    status: 'completed',
                    provider: fundMethod,
                    description: fundDescription || `Manual Log: ${fundMethod.toUpperCase()}`,
                    paymentMethod: fundMethod,
                    familyId: profile?.familyId || null,
                    transactionDate: fundDate,
                    loggedAt: serverTimestamp(),
                    createdAt: serverTimestamp()
                });
            });
            toast.success("Funding logged successfully!");
            setShowFundModal(false);
            setFundAmount('');
        } catch (e: any) {
            toast.error("Failed to log funding: " + e.message);
            console.error(e);
        } finally {
            setIsFunding(false);
        }
    }
  };

  const addBankAccount = async () => {
    if (!newBank.name || !newBank.balance) return;
    await addDoc(collection(db, 'bankAccounts'), {
        userId: user.uid,
        bankName: newBank.name,
        accountNumber: newBank.account,
        balance: parseFloat(newBank.balance),
        updatedAt: serverTimestamp()
    });
    setNewBank({ name: '', account: '', balance: '' });
  };

  const handleManualExpense = async () => {
    if (!wallet || !expenseAmount || parseFloat(expenseAmount) <= 0) return;
    setIsLoggingExpense(true);
    try {
        const amount = parseFloat(expenseAmount);
        await runTransaction(db, async (txn) => {
            const wRef = doc(db, 'wallets', wallet.id);
            const wSnap = await txn.get(wRef);
            const current = wSnap.data()?.balance || 0;
            
            txn.update(wRef, { balance: current - amount, updatedAt: serverTimestamp() });
            txn.set(doc(collection(db, 'transactions')), {
                fromUserId: user.uid,
                toUserId: 'manual_entry',
                amount,
                type: 'payment',
                status: 'completed',
                provider: expenseMethod,
                description: expenseDescription || `Manual Expense: ${expenseMethod.toUpperCase()}`,
                category: expenseCategory,
                paymentMethod: expenseMethod,
                familyId: profile?.familyId || null,
                transactionDate: expenseDate,
                loggedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });
        });
        toast.success("Expense logged successfully!");
        setShowPayModal(false);
        setExpenseAmount('');
        setExpenseDescription('');
    } catch (e: any) {
        toast.error("Failed to log expense: " + e.message);
        console.error(e);
    } finally {
        setIsLoggingExpense(false);
    }
  };

  const handleOcrScan = async (file: File) => {
    setIsScanning(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const data = await scanReceipt(base64, file.type);
            await processParsedTransaction(data);
            setIsScanning(false);
        };
    } catch (e) {
        console.error(e);
        setIsScanning(false);
    }
  };

  const handleSmsParse = async () => {
    if (!smsText.trim()) return;
    setIsScanning(true);
    setShowSmsModal(false);
    try {
        const data = await parseTransactionText(smsText);
        await processParsedTransaction(data);
        setSmsText('');
    } catch (e) {
        console.error(e);
    } finally {
        setIsScanning(false);
    }
  };

  const processParsedTransaction = async (data: any) => {
      // Instead of writing to DB directly, prompt for review
      setReviewData({ ...data, source: data.source || 'ai_parse' });
      setShowReviewModal(true);
  };

  // Handle Send Money
  const handleSendMoney = async () => {
    if (!recipientEmail || !sendAmount || !wallet) return;
    setSending(true);
    setSendError('');

    try {
      const amount = parseFloat(sendAmount);
      if (amount <= 0) throw new Error('Enter valid amount');
      if (amount > wallet.balance) throw new Error('Insufficient balance');

      // 1. Find recipient by email
      const q = query(collection(db, 'users'), where('email', '==', recipientEmail.trim().toLowerCase()), limit(1));
      const userSnap = await getDoc(doc(db, 'users', recipientEmail)); // Simplification: in real app use query
      
      // Since we don't have a direct doc ID for email, we typically query
      // but for this implementation let's look up using the family directory logic if possible or just query
      const userQuery = query(collection(db, 'users'), where('email', '==', recipientEmail.trim().toLowerCase()));
      const searchSnap = await (async () => {
        // Helper to perform query without full onSnapshot
        return new Promise<any>((resolve) => {
          const unsub = onSnapshot(userQuery, (s) => { unsub(); resolve(s); });
        });
      })();

      if (searchSnap.empty) throw new Error('Recipient not found');
      const recipientUser = searchSnap.docs[0].data();
      const recipientId = recipientUser.uid;

      if (recipientId === user.uid) throw new Error('Cannot send to yourself');

      // 2. Perform Transaction
      await runTransaction(db, async (txn) => {
        // Refetch wallet balances
        const walletRef = doc(db, 'wallets', wallet.id);
        const wSnap = await txn.get(walletRef);
        if (!wSnap.exists()) throw new Error('Wallet not found');
        const currentBalance = wSnap.data().balance;

        if (currentBalance < amount) throw new Error('Insufficient balance');

        // Update Sender
        txn.update(walletRef, { 
          balance: currentBalance - amount,
          updatedAt: serverTimestamp()
        });

        // Find Recipient Wallet
        const recWalletQuery = query(collection(db, 'wallets'), where('userId', '==', recipientId));
        const rwSnap = await (async () => {
             return new Promise<any>((resolve) => {
               const unsub = onSnapshot(recWalletQuery, (s) => { unsub(); resolve(s); });
             });
        })();

        if (rwSnap.empty) {
            // Create recipient wallet
            const newWRef = doc(collection(db, 'wallets'));
            txn.set(newWRef, {
                userId: recipientId,
                balance: amount,
                currency: 'KES',
                updatedAt: serverTimestamp()
            });
        } else {
            const rwDoc = rwSnap.docs[0];
            txn.update(doc(db, 'wallets', rwDoc.id), {
                balance: rwDoc.data().balance + amount,
                updatedAt: serverTimestamp()
            });
        }

        // Log Transaction
        const transRef = doc(collection(db, 'transactions'));
        txn.set(transRef, {
            fromUserId: user.uid,
            toUserId: recipientId,
            amount,
            type: 'transfer',
            status: 'completed',
            description: `Transfer to ${recipientUser.displayName || recipientEmail}`,
            familyId: profile?.familyId || null,
            createdAt: serverTimestamp()
        });
      });

      setShowSendModal(false);
      setSendAmount('');
      setRecipientEmail('');
      toast.success(`Sent KES ${sendAmount} successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Transaction failed');
      setSendError(err.message || 'Transaction failed');
    } finally {
      setSending(false);
    }
  };

  // Scan Logic
  const startScanner = () => {
    setPayMode('scan');
    setScannerActive(true);
    setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
            "wallet-qr-reader", 
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        scanner.render((decodedText) => {
            console.log("QR Decoded:", decodedText);
            // Simulate payment processing
            handlePaymentSimulation(decodedText);
            scanner.clear();
            setScannerActive(false);
        }, (err) => {});
        scannerRef.current = scanner;
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
    }
    setScannerActive(false);
    setPayMode(null);
  };

  const simulateTap = () => {
    setPayMode('tap');
    setTapping(true);
    // Simulation of NFC engagement
    setTimeout(() => {
        setTapSuccess(true);
        setTimeout(() => {
            handlePaymentSimulation('POS_SIM_TERMINAL_04');
            setTapping(false);
            setTapSuccess(false);
            setPayMode(null);
        }, 1500);
    }, 2000);
  };

  const handlePaymentSimulation = async (targetId: string) => {
    if (!wallet) return;
    try {
        const amount = 50; // Mock payment amount
        await addDoc(collection(db, 'transactions'), {
            fromUserId: user.uid,
            toUserId: 'merchant_' + targetId,
            amount,
            type: 'payment',
            status: 'completed',
            description: `Payment to Store (${targetId})`,
            familyId: profile?.familyId || null,
            createdAt: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'wallets', wallet.id), {
            balance: wallet.balance - amount,
            updatedAt: serverTimestamp()
        });
    } catch(e) {
        console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4">
      {/* Wallet Header & Action Nexus */}
      <WalletStats 
        balance={wallet?.balance || 0}
        currency={wallet?.currency || 'KES'}
        onFund={() => setShowFundModal(true)}
        onSend={() => setShowSendModal(true)}
        onPay={() => setShowPayModal(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Ledger Section */}
        <div className="lg:col-span-8 space-y-10">
           <TransactionHistory 
             transactions={transactions} 
             userUid={user.uid} 
             onEdit={(tx) => {
               setEditingTransaction(tx);
               setEditData({
                 description: tx.description,
                 amount: (tx.amount || 0).toString(),
                 type: tx.type || 'payment',
                 transactionDate: tx.transactionDate || (tx.createdAt ? format(new Date(tx.createdAt?.toDate?.() || tx.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
               });
               setShowEditModal(true);
             }}
           />
        </div>

        {/* Intelligence & Infrastructure Section */}
        <div className="lg:col-span-4 space-y-10">
            <WalletIntelligence 
              userId={user.uid}
              familyId={profile?.familyId}
              walletId={wallet?.id}
            />

            <VaultManagement 
              userId={user.uid}
              bankAccounts={bankAccounts}
              currency={wallet?.currency || 'KES'}
            />

            <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-500/20 p-10 rounded-[3rem] space-y-6 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 dark:bg-orange-500/20 rounded-full -translate-y-12 translate-x-12 blur-xl group-hover:bg-orange-200 dark:group-hover:bg-orange-500/30 transition-colors"></div>
              <div className="flex items-center gap-4 text-orange-900 dark:text-orange-300 relative z-10">
                <div className="bg-white dark:bg-orange-950 p-2.5 rounded-xl shadow-sm border border-orange-100 dark:border-orange-500/20"><Zap className="w-5 h-5" /></div>
                <h4 className="font-black uppercase text-[10px] tracking-[0.2em] italic serif">Financial Insight</h4>
              </div>
              <p className="text-orange-900/70 dark:text-orange-200/70 text-[11px] font-bold leading-relaxed italic relative z-10 px-2">
                "Keep your family's budget on track by logging every transaction. Internal family transfers are free!"
              </p>
            </div>
        </div>
      </div>

      {/* Modals are kept here as they contain business logic tied to the main view state */}

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 border border-black/5 dark:border-white/5"
            >
              <div className="flex items-center justify-between text-black dark:text-white">
                <h3 className="text-3xl font-bold italic serif tracking-tight">Send Money</h3>
                <button onClick={() => setShowSendModal(false)} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 italic serif">Choose Recipient</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {familyMembers.map(member => (
                      <button
                        key={member.uid}
                        onClick={() => setRecipientEmail(member.email)}
                        className={cn(
                          "px-4 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                          recipientEmail === member.email 
                            ? "bg-black dark:bg-white text-white dark:text-black border-transparent shadow-xl" 
                            : "bg-gray-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-gray-400 hover:text-black dark:hover:text-white"
                        )}
                      >
                         <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white">
                           {member.displayName?.charAt(0) || 'F'}
                         </div>
                         {member.displayName || 'Member'}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <input 
                      type="email"
                      placeholder="Or enter email / custom name"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-3xl p-5 font-bold italic serif outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 italic serif">Amount (KES)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="0.00"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="w-full bg-gray-100 dark:bg-zinc-800/50 border-2 border-transparent focus:border-black/5 dark:focus:border-white/5 rounded-[2.5rem] p-10 text-5xl font-black italic serif focus:ring-0 outline-none text-center text-black dark:text-white transition-all"
                    />
                  </div>
                </div>

                {sendError && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest italic">{sendError}</p>}

                <div className="pt-4">
                  <button 
                      onClick={handleSendMoney}
                      disabled={sending || !sendAmount || !recipientEmail}
                      className="w-full bg-black dark:bg-white text-white dark:text-black py-7 rounded-[2.5rem] font-black text-xs tracking-[0.3em] uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
                    >
                    {sending ? 'Authorizing Cycle...' : 'Authorize Transaction'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fund Modal (M-Pesa / Airtel) */}
      <AnimatePresence>
        {showFundModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-10 border border-black/5 dark:border-white/5"
            >
                <div className="flex items-center justify-between text-black dark:text-white">
                    <h3 className="text-3xl font-black italic serif tracking-tight">{FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Fund My Wallet' : 'Receive Funds'}</h3>
                    <button onClick={() => setShowFundModal(false)} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700"><X className="w-6 h-6" /></button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button 
                        onClick={() => setFundMethod('m-pesa')}
                        className={cn(
                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                            fundMethod === 'm-pesa' ? "border-green-500 bg-green-50 dark:bg-green-500/10" : "border-transparent bg-gray-50 dark:bg-zinc-800"
                        )}
                    >
                        <div className="w-10 h-10 bg-[#4CAF50] rounded-xl flex items-center justify-center text-white font-black italic text-xs">M</div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-black dark:text-white">M-Pesa</span>
                    </button>
                    <button 
                        onClick={() => setFundMethod('airtel-money')}
                        className={cn(
                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                            fundMethod === 'airtel-money' ? "border-red-500 bg-red-50 dark:bg-red-500/10" : "border-transparent bg-gray-50 dark:bg-zinc-800"
                        )}
                    >
                        <div className="w-10 h-10 bg-[#FF0000] rounded-xl flex items-center justify-center text-white font-black italic text-xs">A</div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-black dark:text-white">Airtel</span>
                    </button>
                    <button 
                        onClick={() => setFundMethod('bank')}
                        className={cn(
                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                            fundMethod === 'bank' ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-transparent bg-gray-50 dark:bg-zinc-800"
                        )}
                    >
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic text-xs"><Landmark className="w-5 h-5" /></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-black dark:text-white">Bank</span>
                    </button>
                    <button 
                        onClick={() => setFundMethod('cash')}
                        className={cn(
                            "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                            fundMethod === 'cash' ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10" : "border-transparent bg-gray-50 dark:bg-zinc-800"
                        )}
                    >
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black italic text-xs"><Plus className="w-5 h-5" /></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-black dark:text-white">Cash</span>
                    </button>
                </div>

                <div className="space-y-6">
                    {FEATURES.ENABLE_REAL_MONEY_ESCROW && (
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2"><Phone className="w-3 h-3" /> Associated Account</label>
                          <p className="px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 font-bold text-sm text-gray-400 dark:text-gray-500">+254 7XX XXX 040</p>
                      </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Amount Received (KES)</label>
                        <input 
                            type="number" 
                            placeholder="0.00"
                            value={fundAmount}
                            onChange={e => setFundAmount(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-6 text-4xl font-black italic serif outline-none focus:ring-2 focus:ring-black/10 text-center text-black dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <CalendarPicker 
                          label="Transaction Date"
                          value={fundDate}
                          onChange={setFundDate}
                          className="flex-1"
                        />
                        <div className="space-y-2 opacity-50">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 italic serif mb-2 block">Logging Date</label>
                            <div className="w-full bg-gray-100 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-gray-500">
                                {format(new Date(), 'MMM d, yyyy')}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Description / Notes</label>
                        <input 
                          type="text"
                          placeholder="e.g. Payment for gig, Gift, Sale..."
                          value={fundDescription}
                          onChange={e => setFundDescription(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-sm font-medium outline-none text-black dark:text-white"
                        />
                    </div>

                    {(FEATURES.ENABLE_REAL_MONEY_ESCROW && stkStatus !== 'idle') && (
                        <div className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-3xl space-y-4 border border-black/5 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">STK Push Status</span>
                                {stkStatus === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>}
                            </div>
                            <p className="text-sm font-bold italic serif text-black dark:text-white">
                                {stkStatus === 'pushing' && "Initiating STK Push to device..."}
                                {stkStatus === 'verifying' && "Confirming PIN authorization..."}
                                {stkStatus === 'success' && "Wallet successfully funded!"}
                            </p>
                        </div>
                    )}

                    <button 
                        onClick={handleFunding}
                        disabled={isFunding || !fundAmount}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
                    >
                         {isFunding 
                           ? (FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Engaging Link...' : 'Saving Record...')
                           : (FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Request Funds' : 'Save Income')
                         }
                    </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SMS Parse Modal */}
      <AnimatePresence>
        {showSmsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 border border-black/5 dark:border-white/5"
             >
                <div className="flex items-center justify-between text-black dark:text-white">
                    <h3 className="text-3xl font-black italic serif tracking-tight">Paste SMS</h3>
                    <button onClick={() => setShowSmsModal(false)} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700"><X className="w-6 h-6" /></button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">Paste your M-Pesa, Airtel Money, or bank transaction notification message here. The AI will extract the amount and merchant automatically.</p>

                <div className="space-y-5">
                    <textarea 
                        value={smsText}
                        onChange={e => setSmsText(e.target.value)}
                        placeholder="e.g. XEF23G... confirmed. You bought Ksh500 airtime on 12/12/24..."
                        className="w-full h-32 bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-5 text-sm font-medium outline-none focus:ring-1 resize-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <button 
                        onClick={handleSmsParse}
                        disabled={!smsText.trim()}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-[2rem] font-bold text-sm tracking-[0.2em] uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        Extract & Log
                    </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bank Modal */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 border border-black/5 dark:border-white/5"
             >
                <div className="flex items-center justify-between text-black dark:text-white">
                    <h3 className="text-3xl font-black italic serif tracking-tight">Link Bank Account</h3>
                    <button onClick={() => setShowBankModal(false)} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700"><X className="w-6 h-6" /></button>
                </div>

                <div className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Financial Institution</label>
                        <input 
                            placeholder="e.g. Equity Bank, KCB"
                            value={newBank.name}
                            onChange={e => setNewBank({...newBank, name: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-5 font-medium outline-none focus:ring-1 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Account Balance</label>
                        <input 
                            type="number"
                            placeholder="0.00"
                            value={newBank.balance}
                            onChange={e => setNewBank({...newBank, balance: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-5 font-medium outline-none focus:ring-1 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                    <button 
                        onClick={() => { addBankAccount(); setShowBankModal(false); }}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                    >
                        Save Account
                    </button>
                    <p className="text-[9px] text-gray-300 dark:text-gray-500 font-medium text-center uppercase tracking-widest italic">Manual tracking for reconciliation only.</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Out Modal (Scan/Tap/Manual) */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-colors"
             >
                {/* Fixed Header */}
                <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
                    <div>
                        <h3 className="text-3xl font-black italic serif text-black dark:text-white tracking-tight leading-none">
                            {FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Instant Payment' : 'Pay Out'}
                        </h3>
                        <p className="text-gray-400 dark:text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                            {FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Select Payment Method' : 'Log Manual transaction'}
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowPayModal(false)}
                        className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white p-4 rounded-full transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {FEATURES.ENABLE_REAL_MONEY_ESCROW ? (
                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* QR Scan Card */}
                        <button 
                            onClick={startScanner}
                            className={cn(
                                "flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 hover:bg-gray-100 dark:hover:bg-white/10 transition-all group",
                                scannerActive && "ring-2 ring-black dark:ring-white"
                            )}
                        >
                            <div className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                                <QrCode className="w-8 h-8" />
                            </div>
                            <div className="text-center">
                                <h4 className="text-xl font-bold text-black dark:text-white mb-2">Scan to Pay</h4>
                                <p className="text-gray-400 dark:text-white/30 text-[10px] font-light tracking-wide px-4 leading-relaxed">Scan business QR code</p>
                            </div>
                        </button>

                        {/* Tap to Pay Card */}
                        <button 
                          onClick={simulateTap}
                          className={cn(
                            "flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 hover:bg-gray-100 dark:hover:bg-white/10 transition-all group overflow-hidden relative",
                            tapping && "bg-black/10 dark:bg-white/20"
                          )}
                        >
                            <div className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl relative z-10">
                                <Smartphone className="w-8 h-8" />
                            </div>
                            <div className="text-center relative z-10 text-black dark:text-white">
                                <h4 className="text-xl font-bold mb-2">Tap to Pay</h4>
                                <p className="text-gray-400 dark:text-white/30 text-[10px] font-light tracking-wide px-4 leading-relaxed">NFC contactless payment</p>
                            </div>

                            {tapping && (
                                <div className="absolute inset-0 bg-black/5 dark:bg-white/10 animate-pulse flex items-center justify-center">
                                    <div className="w-16 h-16 border-4 border-black/20 dark:border-white/40 border-t-black dark:border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}
                            
                            {tapSuccess && (
                                <motion.div 
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="absolute inset-0 bg-green-500 flex items-center justify-center"
                                >
                                    <CheckCircle2 className="w-16 h-16 text-white animate-bounce" />
                                </motion.div>
                            )}
                          </button>
                      </div>
                    ) : (
                      <div className="space-y-8 bg-gray-50 dark:bg-white/5 p-8 rounded-[2rem] border border-black/5 dark:border-white/10">
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button 
                                    onClick={() => setExpenseMethod('m-pesa')}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                        expenseMethod === 'm-pesa' ? "border-green-500 bg-green-500/10 text-green-500" : "border-transparent bg-white/5 text-gray-400"
                                    )}
                                >
                                    <div className="w-8 h-8 bg-[#4CAF50] rounded-xl flex items-center justify-center text-white font-black italic text-[10px]">M</div>
                                    <span className="text-[7px] font-black uppercase tracking-widest ">M-Pesa</span>
                                </button>
                                <button 
                                    onClick={() => setExpenseMethod('airtel-money')}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                        expenseMethod === 'airtel-money' ? "border-red-500 bg-red-500/10 text-red-500" : "border-transparent bg-white/5 text-gray-400"
                                    )}
                                >
                                    <div className="w-8 h-8 bg-[#FF0000] rounded-xl flex items-center justify-center text-white font-black italic text-[10px]">A</div>
                                    <span className="text-[7px] font-black uppercase tracking-widest ">Airtel</span>
                                </button>
                                <button 
                                    onClick={() => setExpenseMethod('bank')}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                        expenseMethod === 'bank' ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-transparent bg-white/5 text-gray-400"
                                    )}
                                >
                                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic"><Landmark className="w-4 h-4" /></div>
                                    <span className="text-[7px] font-black uppercase tracking-widest ">Bank</span>
                                </button>
                                <button 
                                    onClick={() => setExpenseMethod('cash')}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                        expenseMethod === 'cash' ? "border-orange-500 bg-orange-50/10 text-orange-500 border-orange-500/30" : "border-transparent bg-white/5 text-gray-400"
                                    )}
                                >
                                    <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black italic"><Plus className="w-4 h-4" /></div>
                                    <span className="text-[7px] font-black uppercase tracking-widest ">Cash</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40 px-2 italic serif">Amount Paid (KES)</label>
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={expenseAmount}
                                        onChange={e => setExpenseAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-6 text-5xl font-black italic serif outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 text-center text-black dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40 px-2 italic serif">Category</label>
                                      <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 font-bold text-[10px] uppercase tracking-wider outline-none text-black dark:text-white appearance-none">
                                        <option value="food" className="bg-white dark:bg-[#111]">Food</option>
                                        <option value="transport" className="bg-white dark:bg-[#111]">Transport</option>
                                        <option value="utility" className="bg-white dark:bg-[#111]">Utility</option>
                                        <option value="rent" className="bg-white dark:bg-[#111]">Rent</option>
                                        <option value="business" className="bg-white dark:bg-[#111]">Business</option>
                                        <option value="misc" className="bg-white dark:bg-[#111]">Misc</option>
                                      </select>
                                   </div>
                                    <CalendarPicker 
                                      label="Transaction Date"
                                      value={expenseDate}
                                      onChange={setExpenseDate}
                                      className="flex-1"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40 px-2 italic serif">Reference / Recipient</label>
                                    <input 
                                      type="text"
                                      placeholder="e.g. Cafe X, Bus fare..."
                                      value={expenseDescription}
                                      onChange={e => setExpenseDescription(e.target.value)}
                                      className="w-full bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-sm font-medium outline-none text-black dark:text-white"
                                    />
                                </div>

                                <button 
                                    onClick={handleManualExpense}
                                    disabled={isLoggingExpense || !expenseAmount}
                                    className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
                                >
                                    {isLoggingExpense ? 'Engaging Ledger...' : 'Log Pay Out'}
                                </button>
                            </div>
                      </div>
                    )}

                    {scannerActive && (
                        <div className="bg-black/90 p-6 rounded-[2.5rem] flex flex-col items-center">
                            <div className="w-full max-w-sm aspect-square bg-white/5 rounded-3xl overflow-hidden border-4 border-white/20" id="wallet-qr-reader"></div>
                            <button 
                                onClick={stopScanner}
                                className="mt-8 bg-white text-black px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs"
                            >
                                Stop Scanner
                            </button>
                        </div>
                    )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showEditModal && editingTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 border border-black/5 dark:border-white/5"
             >
                <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black italic serif tracking-tight text-black dark:text-white">Edit Entry</h3>
                    <button onClick={() => setShowEditModal(false)} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-black dark:text-white"><X className="w-6 h-6" /></button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Type</label>
                        <div className="flex gap-2">
                             {['payment', 'deposit'].map(t => (
                                 <button
                                     key={t}
                                     onClick={() => setEditData({...editData, type: t as any})}
                                     className={cn(
                                         "flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all",
                                         editData.type === t 
                                            ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black" 
                                            : "border-transparent bg-gray-100 dark:bg-zinc-800 text-gray-400"
                                     )}
                                 >
                                     {t === 'payment' ? 'Pay Out' : 'Pay In'}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Amount (KES)</label>
                        <input 
                            type="number"
                            value={editData.amount}
                            onChange={e => setEditData({...editData, amount: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-5 font-black text-2xl italic serif outline-none text-black dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <CalendarPicker 
                          label="Transaction Date"
                          value={editData.transactionDate}
                          onChange={(d) => setEditData({...editData, transactionDate: d})}
                          className="flex-1"
                        />
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 italic mb-2 block">Logged On</label>
                            <div className="w-full bg-gray-100/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-black text-xs uppercase tracking-widest text-gray-500">
                                {editingTransaction.createdAt ? format(new Date(editingTransaction.createdAt?.toDate?.() || editingTransaction.createdAt), 'MMM d, yyyy') : 'Now'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Description</label>
                        <input 
                            value={editData.description}
                            onChange={e => setEditData({...editData, description: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-5 font-medium outline-none text-black dark:text-white"
                        />
                    </div>

                    <button 
                        onClick={handleUpdateTransaction}
                        disabled={updating}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
                    >
                        {updating ? 'Amending Records...' : 'Update Transaction'}
                    </button>
                </div>
             </motion.div>
          </div>
      )}

      {showReviewModal && reviewData && (
        <TransactionReviewModal
           onClose={() => {
             setShowReviewModal(false);
             setReviewData(null);
           }}
           data={reviewData}
           wallet={wallet}
           user={user}
           profile={profile}
        />
      )}
    </div>
  );
}
