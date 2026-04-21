import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Wallet as WalletIcon,
  Filter,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { format, subDays, subMonths, isAfter, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

// Declaration to fix jspdf-autotable typing
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type Period = 'weekly' | 'monthly' | '3months' | '6months';

export default function Reports({ user, profile }: { user: User, profile: any }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile?.familyId) return;

    const q = query(
      collection(db, 'transactions'),
      where('familyId', '==', profile.familyId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.transactionDate ? new Date(data.transactionDate) : (data.createdAt?.toDate?.() || new Date(data.createdAt))
        };
      });
      setTransactions(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [user, profile?.familyId]);

  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'weekly': startDate = subDays(now, 7); break;
      case 'monthly': startDate = subMonths(now, 1); break;
      case '3months': startDate = subMonths(now, 3); break;
      case '6months': startDate = subMonths(now, 6); break;
    }

    return transactions.filter(tx => isAfter(tx.date, startDate));
  };

  const filtered = getFilteredTransactions();
  
  const income = filtered
    .filter(tx => tx.type === 'deposit' || (tx.type === 'transfer' && tx.toUserId === user.uid))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
  const expenses = filtered
    .filter(tx => tx.type === 'payment' || (tx.type === 'transfer' && tx.fromUserId === user.uid))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const balance = income - expenses;
  const savings = income * 0.2; // Simulating a savings goal of 20%

  const chartData = filtered.reduce((acc: any[], tx) => {
    const day = format(tx.date, 'MMM d');
    const existing = acc.find(a => a.name === day);
    
    const isIncome = tx.type === 'deposit' || (tx.type === 'transfer' && tx.toUserId === user.uid) || tx.type === 'income';
    const isExpense = tx.type === 'payment' || tx.type === 'withdrawal' || (tx.type === 'transfer' && tx.fromUserId === user.uid) || tx.type === 'expense';
    
    if (existing) {
      if (isIncome) existing.income += tx.amount;
      if (isExpense) existing.expenses += tx.amount;
    } else {
      acc.push({ 
        name: day, 
        income: isIncome ? tx.amount : 0, 
        expenses: isExpense ? tx.amount : 0 
      });
    }
    return acc;
  }, []).reverse().slice(-10);

  const exportPDF = () => {
    const doc = new jsPDF();
    const brandingColor = [20, 20, 20];
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(brandingColor[0], brandingColor[1], brandingColor[2]);
    doc.text('FAMILY HUB FINANCIAL STATEMENT', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 30);
    doc.text(`Period: ${period.toUpperCase()}`, 14, 35);
    doc.text(`Family Group: ${profile?.familyId || 'Private User'}`, 14, 40);

    // Summary Table
    doc.autoTable({
      startY: 50,
      head: [['Summary Metrics', 'Amount (KES)']],
      body: [
        ['Total Income (Money In)', income.toLocaleString()],
        ['Total Expenses (Money Out)', expenses.toLocaleString()],
        ['Net Cash Flow', balance.toLocaleString()],
        ['Projected Savings (20% Target)', savings.toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillStyle: 'black' }
    });

    // Transactions Table
    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Date', 'Description', 'Type', 'Amount (KES)']],
      body: filtered.map(tx => [
        format(tx.date, 'MMM d, yyyy'),
        tx.description,
        tx.type.toUpperCase(),
        tx.amount.toLocaleString()
      ]),
      theme: 'striped'
    });

    doc.save(`Family_Financial_Report_${period}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportCSV = () => {
    const data = filtered.map(tx => ({
      'Transaction Date': format(tx.date, 'yyyy-MM-dd'),
      'Logged At': tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      'Description': tx.description,
      'Type': tx.type,
      'Category': tx.category || 'N/A',
      'Amount (KES)': tx.amount,
      'Payment Method': tx.paymentMethod || 'N/A'
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Family_Financial_Report_${period}_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Generating Intelligence...</p>
    </div>
  );

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12 pb-32">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-10 border-b border-black/10 dark:border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black shadow-xl">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Ledger Intelligence</span>
          </div>
          <h1 className="text-6xl font-black italic serif tracking-tighter text-black dark:text-white leading-[0.8] mb-4">Financial Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md italic serif">Deep dive into your family's economic circulation. Track velocity, balance, and growth.</p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
            {(['weekly', 'monthly', '3months', '6months'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  period === p 
                    ? "bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                {p === '3months' ? '3 Months' : p === '6months' ? '6 Months' : p}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={exportPDF}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={exportCSV}
              className="px-6 py-3 bg-gray-100 dark:bg-zinc-800 text-black dark:text-white rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Inflow', value: income, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50/50 dark:bg-green-500/10' },
          { label: 'Total Outflow', value: expenses, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50/50 dark:bg-red-500/10' },
          { label: 'Net Surplus', value: balance, icon: WalletIcon, color: balance >= 0 ? 'text-blue-500' : 'text-orange-500', bg: 'bg-blue-50/50 dark:bg-blue-500/10' },
          { label: 'Sav. Projection', value: savings, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50/50 dark:bg-indigo-500/10' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className={cn("p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm", stat.bg)}
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={cn("w-6 h-6", stat.color)} />
              <div className="text-[10px] font-black uppercase tracking-widest opacity-30 italic serif">Resonating</div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">{stat.label}</p>
            <h3 className={cn("text-3xl font-black italic serif tracking-tight", stat.color)}>
              KES {stat.value.toLocaleString()}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Chart View */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black italic serif tracking-tight text-black dark:text-white flex items-center gap-3">
              <TrendingUp className="w-6 h-6" /> Flow Dynamics
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last 10 Activity Cycles</span>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                  tickFormatter={(val) => `KES ${val.toLocaleString()}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    padding: '20px'
                  }}
                />
                <Bar dataKey="income" fill="#10B981" radius={[10, 10, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" fill="#EF4444" radius={[10, 10, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction Focus */}
        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-black/5 dark:border-white/5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black italic serif tracking-tight text-black dark:text-white">Recent Cycles</h3>
            <Filter className="w-4 h-4 text-gray-400" />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {filtered.slice(0, 10).map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black",
                    tx.type === 'deposit' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                  )}>
                    {tx.type === 'deposit' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-black italic serif text-gray-900 dark:text-white truncate max-w-[120px]">{tx.description}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">{format(tx.date, 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black italic serif",
                    tx.type === 'deposit' ? "text-green-600" : "text-red-600"
                  )}>
                    KES {tx.amount.toLocaleString()}
                  </p>
                  <ChevronRight className="w-3 h-3 text-gray-300 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="h-full flex items-center justify-center italic serif text-gray-400 text-sm py-20">Cycle empty.</div>
            )}
          </div>
          
          <button className="mt-8 w-full py-4 text-[10px] font-black uppercase tracking-[.3em] text-gray-400 hover:text-black dark:hover:text-white transition-colors border-t border-black/5 dark:border-white/5 pt-6">
            Audit Full Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
