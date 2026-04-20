import React from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownLeft, PiggyBank, Receipt, ShoppingBag } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BudgetStat {
  label: string;
  value: number;
  icon: any;
  color: string;
}

interface BudgetOverviewProps {
  expenses: any[];
  incomes: any[];
  savings: any[];
  expenseCategories: any[];
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  expenses,
  incomes,
  savings,
  expenseCategories
}) => {
  const totals = {
    expense: expenses.reduce((sum, e) => sum + e.amount, 0),
    income: incomes.reduce((sum, i) => sum + i.amount, 0),
    savings: savings.reduce((sum, s) => sum + (s.currentAmount || 0), 0),
  };

  const balance = totals.income - totals.expense;

  const stats: BudgetStat[] = [
    { label: 'Total Balance', value: balance, icon: Wallet, color: 'text-black' },
    { label: 'Total Income', value: totals.income, icon: ArrowUpRight, color: 'text-green-600' },
    { label: 'Total Expenses', value: totals.expense, icon: ArrowDownLeft, color: 'text-red-600' },
    { label: 'Net Savings', value: totals.savings, icon: PiggyBank, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm hover:shadow-xl transition-all"
          >
            <div className={cn("inline-flex p-3 rounded-2xl bg-gray-50 mb-4", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <h2 className="text-3xl font-bold tracking-tight mt-1">KES {stat.value.toLocaleString()}</h2>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
          <h3 className="text-2xl font-bold tracking-tight mb-8 italic serif">Financial Health Flow</h3>
          <div className="h-64 flex items-end gap-2 px-2">
            {Array.from({ length: 12 }).map((_, i) => {
              const height = (Math.sin(i / 2) + 2) * 20; // Simulated data
              return (
                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                  <div 
                    className="bg-black/5 w-full rounded-t-lg transition-all group-hover:bg-black/10"
                    style={{ height: `${height * 1.5}%` }}
                  ></div>
                  <div 
                    className="bg-green-100 w-full rounded-t-lg group-hover:bg-green-200 transition-all"
                    style={{ height: `${height * 0.5}%` }}
                  ></div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-gray-400">MAY {i+1}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2 italic serif">
            <Receipt className="w-4 h-4" /> Expense Distribution
          </h4>
          <div className="space-y-6">
            {expenseCategories.slice(0, 5).map(cat => {
              const catTotal = expenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0);
              const percent = totals.expense > 0 ? (catTotal / totals.expense) * 100 : 0;
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter">
                    <span className="flex items-center gap-2 truncate text-gray-600">
                      <cat.icon className={cn("w-3.5 h-3.5", cat.color)} /> {cat.label}
                    </span>
                    <span className="text-black">KES {catTotal.toLocaleString()} ({Math.round(percent)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn("h-full rounded-full", cat.color.replace('text', 'bg'))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
