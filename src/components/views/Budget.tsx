import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  HandCoins,
  TrendingUp,
  Receipt,
  Building2,
  GraduationCap,
  Lightbulb,
  HeartPulse,
  ShieldCheck,
  Zap,
  Car,
  Construction,
  Wallet
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { initiateStkPush } from '../../services/mpesaService';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { FEATURES } from '../../constants/features';
import { BudgetOverview } from '../budget/BudgetOverview';
import { ExpenseManager } from '../budget/ExpenseManager';
import { IncomeManager } from '../budget/IncomeManager';
import { SavingsManager } from '../budget/SavingsManager';
import { DebtManager } from '../budget/DebtManager';
import { QuickPay } from '../budget/QuickPay';
import { BudgetIntelligence } from '../budget/BudgetIntelligence';

const FINANCE_TABS = [
  { id: 'overview', label: 'Overview', icon: Wallet },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'loans', label: 'Loans & Debts', icon: HandCoins },
];

const EXPENSE_CATEGORIES = [
  { id: 'rent', label: 'Rent', icon: Building2, color: 'text-blue-500' },
  { id: 'school_fees', label: 'School Fees', icon: GraduationCap, color: 'text-purple-500' },
  { id: 'utility', label: 'Utilities', icon: Zap, color: 'text-yellow-500' },
  { id: 'medical', label: 'Medical', icon: HeartPulse, color: 'text-red-500' },
  { id: 'insurance', label: 'Insurance', icon: ShieldCheck, color: 'text-green-500' },
  { id: 'emergency', label: 'Emergency', icon: AlertCircle, color: 'text-orange-600' },
  { id: 'transport', label: 'Transport', icon: Car, color: 'text-gray-500' },
  { id: 'project', label: 'Projects', icon: Construction, color: 'text-amber-700' },
  { id: 'misc', label: 'Miscellaneous', icon: Lightbulb, color: 'text-gray-400' },
];

export default function Budget({ user, profile }: { user: User, profile: any }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [savings, setSavings] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const expensesQ = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const incomesQ = query(collection(db, 'incomes'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const savingsQ = query(collection(db, 'savingsGoals'), where('userId', '==', user.uid));
    const loansQ = query(collection(db, 'loans'), where('userId', '==', user.uid));

    const unsubExpenses = onSnapshot(expensesQ, (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubIncomes = onSnapshot(incomesQ, (s) => setIncomes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSavings = onSnapshot(savingsQ, (s) => setSavings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLoans = onSnapshot(loansQ, (s) => {
      setLoans(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubExpenses();
      unsubIncomes();
      unsubSavings();
      unsubLoans();
    };
  }, [user.uid]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4">
      {/* Header with AI Scanner Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-light italic serif tracking-tight">Family <span className="font-bold not-italic">Capital</span></h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Holistic financial resilience & flow</p>
        </div>
        
        <div className="flex bg-black/5 p-1 rounded-2xl w-fit">
           {FINANCE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-black text-white shadow-xl" 
                  : "text-gray-400 hover:text-black"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Extraction Banner (Always accessible at top or integrated) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-8">
           <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              {activeTab === 'overview' && (
                <BudgetOverview 
                  expenses={expenses} 
                  incomes={incomes} 
                  savings={savings} 
                  expenseCategories={EXPENSE_CATEGORIES} 
                />
              )}

              {activeTab === 'expenses' && (
                <ExpenseManager 
                  userId={user.uid} 
                  expenses={expenses} 
                  categories={EXPENSE_CATEGORIES} 
                />
              )}

              {activeTab === 'income' && (
                <IncomeManager 
                  userId={user.uid} 
                  incomes={incomes} 
                />
              )}

              {activeTab === 'savings' && (
                <SavingsManager 
                  userId={user.uid} 
                  savings={savings} 
                />
              )}

              {activeTab === 'loans' && (
                <DebtManager 
                  userId={user.uid} 
                  loans={loans} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="lg:col-span-4 space-y-8">
            <BudgetIntelligence userId={user.uid} />
            
            {FEATURES.ENABLE_REAL_MONEY_ESCROW && (
              <QuickPay userId={user.uid} />
            )}
            
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Capital Protection</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-5 bg-green-50 rounded-3xl border border-green-100/50">
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-xs font-bold text-green-900">Encrypted Nodes</p>
                    <p className="text-[9px] text-green-700/60 font-medium uppercase tracking-tighter">End-to-end security active</p>
                  </div>
                </div>
                <p className="text-xs italic font-medium text-gray-500 leading-relaxed px-2">
                  "Sustainable wealth isn't just about income; it's about the resilience of your family nodes."
                </p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
