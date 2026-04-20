import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Search, Filter, Plus, Calendar, Tag, CreditCard, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface ExpenseManagerProps {
  userId: string;
  expenses: any[];
  categories: any[];
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  userId,
  expenses,
  categories
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || 'misc');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const handleAddExpense = async () => {
    if (!amount) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        userId,
        amount: parseInt(amount),
        category: selectedCategory,
        description,
        date: new Date().toISOString(),
        isPaid: true
      });
      setAmount('');
      setDescription('');
    } catch (e) {
      console.error(e);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (filter === 'paid') return e.isPaid;
    if (filter === 'pending') return !e.isPaid;
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Logger Column */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2 italic serif">
            <Receipt className="w-5 h-5" /> Quick Record
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5",
                    selectedCategory === cat.id 
                      ? "border-black bg-black text-white shadow-lg scale-105" 
                      : "border-black/5 bg-gray-50 text-gray-400 hover:border-black/20"
                  )}
                >
                  <cat.icon className="w-4 h-4" />
                  <span className="text-[7px] font-bold uppercase tracking-tight text-center">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">KES</span>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 pl-16 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>
              <textarea 
                placeholder="What was this for?" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-all min-h-[100px]"
              />
              <button 
                onClick={handleAddExpense}
                className="w-full bg-black text-white py-5 rounded-2xl font-bold text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl hover:shadow-black/20"
              >
                Sync with Ledger
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Column */}
      <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <h3 className="text-2xl font-bold tracking-tight italic serif">Recent Activity</h3>
          <div className="flex bg-black/5 rounded-2xl p-1 border border-black/5">
            {[
              { id: 'all', label: 'All' },
              { id: 'paid', label: 'Settled' },
              { id: 'pending', label: 'Pending' }
            ].map(f => (
              <button 
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={cn(
                  "px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                  filter === f.id ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-black"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredExpenses.map((expense) => {
              const cat = categories.find(c => c.id === expense.category) || categories[categories.length - 1];
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={expense.id} 
                  className="flex items-center justify-between p-6 rounded-3xl border border-black/[0.03] hover:bg-gray-50 hover:border-black/5 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-black/[0.05]", cat.color)}>
                      <cat.icon className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="font-bold text-lg text-black">{expense.description || cat.label}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cat.label}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-xl font-black">KES {expense.amount.toLocaleString()}</p>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <CheckCircle2 className={cn("w-3 h-3", expense.isPaid ? "text-green-500" : "text-gray-200")} />
                          <span className={cn("text-[9px] font-black uppercase tracking-[0.1em]", expense.isPaid ? "text-green-600/50" : "text-gray-300")}>
                            {expense.isPaid ? 'Settled' : 'Unpaid'}
                          </span>
                        </div>
                    </div>
                    <button 
                      onClick={() => deleteDoc(doc(db, 'expenses', expense.id))}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredExpenses.length === 0 && (
            <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border border-dashed border-black/5">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic serif">No records found in this cycle</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
