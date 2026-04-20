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
import { motion, AnimatePresence } from 'motion/react';
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

export default function Wallet({ user, profile }: { user: User, profile: any }) {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
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
  const [fundProvider, setFundProvider] = useState<'m-pesa' | 'airtel-money'>('m-pesa');
  const [isFunding, setIsFunding] = useState(false);
  const [stkStatus, setStkStatus] = useState<'idle' | 'pushing' | 'verifying' | 'success'>('idle');

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
          await setDoc(walletDocRef, {
            userId: user.uid,
            balance: 2500.00,
            currency: 'KES',
            updatedAt: serverTimestamp()
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
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    }, (err) => {
      console.error("Wallet Snapshot error:", err);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    // Transactions Listener
    const transRef = collection(db, 'transactions');
    const transQ = profile?.familyId 
      ? query(transRef, where('familyId', '==', profile.familyId), limit(20))
      : query(transRef, where('fromUserId', '==', user.uid), limit(20));

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
                        const wRef = doc(db, 'wallets', wallet.id);
                        const wSnap = await txn.get(wRef);
                        const current = wSnap.data()?.balance || 0;
                        
                        txn.update(wRef, { balance: current + amount, updatedAt: serverTimestamp() });
                        txn.set(doc(collection(db, 'transactions')), {
                            fromUserId: fundProvider,
                            toUserId: user.uid,
                            amount,
                            type: 'deposit',
                            status: 'completed',
                            provider: fundProvider,
                            description: `${fundProvider.toUpperCase()} Funding`,
                            familyId: profile?.familyId || null,
                            createdAt: serverTimestamp()
                        });
                    });
                    setStkStatus('success');
                    setTimeout(() => {
                        setShowFundModal(false);
                        setStkStatus('idle');
                        setIsFunding(false);
                        setFundAmount('');
                    }, 2000);
                } catch (e) {
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
                const wRef = doc(db, 'wallets', wallet.id);
                const wSnap = await txn.get(wRef);
                const current = wSnap.data()?.balance || 0;
                
                txn.update(wRef, { balance: current + amount, updatedAt: serverTimestamp() });
                txn.set(doc(collection(db, 'transactions')), {
                    fromUserId: 'manual_entry',
                    toUserId: user.uid,
                    amount,
                    type: 'deposit',
                    status: 'completed',
                    provider: fundProvider,
                    description: `Manual Log: ${fundProvider.toUpperCase()}`,
                    familyId: profile?.familyId || null,
                    createdAt: serverTimestamp()
                });
            });
            setShowFundModal(false);
            setFundAmount('');
        } catch (e) {
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
    } catch (err: any) {
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

            <div className="bg-orange-50/50 border border-orange-100 p-10 rounded-[3rem] space-y-6 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full -translate-y-12 translate-x-12 blur-xl group-hover:bg-orange-200 transition-colors"></div>
              <div className="flex items-center gap-4 text-orange-900 relative z-10">
                <div className="bg-white p-2.5 rounded-xl shadow-sm"><AlertCircle className="w-5 h-5" /></div>
                <h4 className="font-black uppercase text-[10px] tracking-[0.2em] italic serif">Strategic Insight</h4>
              </div>
              <p className="text-orange-900/70 text-[11px] font-bold leading-relaxed italic serif relative z-10 px-2 italic">
                "Optimize capital movement by prioritizing internal transfers for family dependencies. Minimize external fees by utilizing synchronized vault nodes."
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
              className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-bold italic serif tracking-tight">Send Money</h3>
                <button onClick={() => setShowSendModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Recipient Email</label>
                  <input 
                    type="email"
                    placeholder="family@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-medium outline-none focus:ring-1 focus:ring-black/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Amount</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-4xl font-black italic serif focus:ring-1 focus:ring-black/10 outline-none text-center"
                  />
                </div>

                {sendError && <p className="text-red-500 text-xs font-bold text-center">{sendError}</p>}

                <button 
                    onClick={handleSendMoney}
                    disabled={sending || !sendAmount || !recipientEmail}
                    className="w-full bg-black text-white py-6 rounded-[2rem] font-bold text-sm tracking-[0.2em] uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                  {sending ? 'Processing...' : 'Verify & Send'}
                </button>
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
               className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-10"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black italic serif tracking-tight">{FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Fund Wallet' : 'Log Income'}</h3>
                    <button onClick={() => setShowFundModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-6 h-6" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setFundProvider('m-pesa')}
                        className={cn(
                            "p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all",
                            fundProvider === 'm-pesa' ? "border-green-500 bg-green-50 shadow-lg shadow-green-500/10" : "border-gray-50 bg-gray-50"
                        )}
                    >
                        <div className="w-12 h-12 bg-[#4CAF50] rounded-2xl flex items-center justify-center text-white font-black italic">M</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">M-Pesa</span>
                    </button>
                    <button 
                        onClick={() => setFundProvider('airtel-money')}
                        className={cn(
                            "p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all",
                            fundProvider === 'airtel-money' ? "border-red-500 bg-red-50 shadow-lg shadow-red-500/10" : "border-gray-50 bg-gray-50"
                        )}
                    >
                        <div className="w-12 h-12 bg-[#FF0000] rounded-2xl flex items-center justify-center text-white font-black italic whitespace-nowrap">A</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Airtel</span>
                    </button>
                </div>

                <div className="space-y-6">
                    {FEATURES.ENABLE_REAL_MONEY_ESCROW && (
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2"><Phone className="w-3 h-3" /> Associated Account</label>
                          <p className="px-6 py-4 bg-gray-50 rounded-2xl border border-black/5 font-bold text-sm text-gray-400">+254 7XX XXX 040</p>
                      </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">{FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Funding Amount (KES)' : 'Amount Logged (KES)'}</label>
                        <input 
                            type="number" 
                            placeholder="0.00"
                            value={fundAmount}
                            onChange={e => setFundAmount(e.target.value)}
                            className="w-full bg-gray-50 border border-black/5 rounded-2xl p-6 text-4xl font-black italic serif outline-none focus:ring-2 focus:ring-black/10 text-center"
                        />
                    </div>

                    {(FEATURES.ENABLE_REAL_MONEY_ESCROW && stkStatus !== 'idle') && (
                        <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border border-black/5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">STK Push Status</span>
                                {stkStatus === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                            </div>
                            <p className="text-sm font-bold italic serif">
                                {stkStatus === 'pushing' && "Initiating STK Push to device..."}
                                {stkStatus === 'verifying' && "Confirming PIN authorization..."}
                                {stkStatus === 'success' && "Wallet successfully funded!"}
                            </p>
                        </div>
                    )}

                    <button 
                        onClick={handleFunding}
                        disabled={isFunding || !fundAmount}
                        className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
                    >
                         {isFunding 
                           ? (FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Engaging Link...' : 'Saving Record...')
                           : (FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Request Funds' : 'Reconcile Balance')
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
               className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8"
             >
                <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black italic serif tracking-tight">Paste SMS</h3>
                    <button onClick={() => setShowSmsModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-6 h-6" /></button>
                </div>
                
                <p className="text-xs text-gray-500">Paste your M-Pesa, Airtel Money, or bank transaction notification message here. The AI will extract the amount and merchant automatically.</p>

                <div className="space-y-5">
                    <textarea 
                        value={smsText}
                        onChange={e => setSmsText(e.target.value)}
                        placeholder="e.g. XEF23G... confirmed. You bought Ksh500 airtime on 12/12/24..."
                        className="w-full h-32 bg-gray-50 border border-black/5 rounded-2xl p-5 text-sm font-medium outline-none focus:ring-1 resize-none"
                    />
                    <button 
                        onClick={handleSmsParse}
                        disabled={!smsText.trim()}
                        className="w-full bg-black text-white py-5 rounded-[2rem] font-bold text-sm tracking-[0.2em] uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
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
               className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8"
             >
                <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black italic serif tracking-tight">Track Bank Node</h3>
                    <button onClick={() => setShowBankModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-6 h-6" /></button>
                </div>

                <div className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Financial Institution</label>
                        <input 
                            placeholder="e.g. Equity Bank, KCB"
                            value={newBank.name}
                            onChange={e => setNewBank({...newBank, name: e.target.value})}
                            className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-medium outline-none focus:ring-1"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Manual Reconciled Balance</label>
                        <input 
                            type="number"
                            placeholder="0.00"
                            value={newBank.balance}
                            onChange={e => setNewBank({...newBank, balance: e.target.value})}
                            className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 font-medium outline-none focus:ring-1"
                        />
                    </div>
                    <button 
                        onClick={() => { addBankAccount(); setShowBankModal(false); }}
                        className="w-full bg-black text-white py-6 rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                    >
                        Save Bank Node
                    </button>
                    <p className="text-[9px] text-gray-300 font-medium text-center uppercase tracking-widest italic">Manual tracking for reconciliation only.</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Modal (Scan/Tap) */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-6 space-y-10">
            <div className="text-center space-y-2">
                <h3 className="text-4xl font-black italic serif text-white tracking-tight">Instant Payment</h3>
                <p className="text-white/40 text-sm font-medium tracking-widest uppercase">Select Payment Method</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 w-full max-w-2xl">
                {/* QR Scan Card */}
                <button 
                    onClick={startScanner}
                    className={cn(
                        "flex-1 bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col items-center gap-6 hover:bg-white/10 transition-all group",
                        scannerActive && "ring-2 ring-white"
                    )}
                >
                    <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                        <QrCode className="w-10 h-10" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-2xl font-bold text-white mb-2">Scan to Pay</h4>
                        <p className="text-white/30 text-xs font-light tracking-wide px-4 leading-relaxed">Pay any business displaying an Inzuka QR code or Standard QR.</p>
                    </div>
                </button>

                {/* Tap to Pay Card */}
                <button 
                  onClick={simulateTap}
                  className={cn(
                    "flex-1 bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col items-center gap-6 hover:bg-white/10 transition-all group overflow-hidden relative",
                    tapping && "bg-white/20"
                  )}
                >
                    <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl relative z-10">
                        <Smartphone className="w-10 h-10" />
                    </div>
                    <div className="text-center relative z-10">
                        <h4 className="text-2xl font-bold text-white mb-2">Tap to Pay</h4>
                        <p className="text-white/30 text-xs font-light tracking-wide px-4 leading-relaxed">Hold your device near the merchant's POS terminal.</p>
                    </div>

                    {tapping && (
                        <div className="absolute inset-x-0 top-0 bottom-0 bg-white/10 animate-pulse flex items-center justify-center">
                             <div className="w-32 h-32 border-4 border-white/40 border-t-white rounded-full animate-spin"></div>
                        </div>
                    )}
                    
                    {tapSuccess && (
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute inset-0 bg-green-500 flex items-center justify-center"
                        >
                            <CheckCircle2 className="w-20 h-20 text-white animate-bounce" />
                        </motion.div>
                    )}
                </button>
            </div>

            {scannerActive && (
                <div className="fixed inset-0 bg-black z-[110] flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-sm aspect-square bg-gray-800 rounded-[3rem] overflow-hidden border-4 border-white/20" id="wallet-qr-reader"></div>
                    <button 
                        onClick={stopScanner}
                        className="mt-10 bg-white text-black px-10 py-5 rounded-full font-bold uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <button 
                onClick={() => setShowPayModal(false)}
                className="bg-white/10 backdrop-blur-md text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest border border-white/20 hover:bg-white/[0.15] transition-all"
            >
                Close Wallet
            </button>
          </div>
        )}
      </AnimatePresence>

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
