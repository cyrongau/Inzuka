import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Plus, ArrowUpRight, DollarSign, Calendar, Target, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface IncomeManagerProps {
  userId: string;
  incomes: any[];
}

export const IncomeManager: React.FC<IncomeManagerProps> = ({
  userId,
  incomes
}) => {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('salary');

  const handleAddIncome = async () => {
    if (!amount || !source) return;
    try {
      await addDoc(collection(db, 'incomes'), {
        userId,
        amount: parseInt(amount),
        source,
        type,
        date: new Date().toISOString(),
        frequency: 'monthly'
      });
      setAmount('');
      setSource('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2 italic serif">
            <TrendingUp className="w-5 h-5 text-green-600" /> Revenue Stream
          </h3>
          <div className="space-y-6">
            <div className="space-y-4">
              <input 
                type="text" placeholder="Source (e.g. Salary, Biz X)" 
                value={source} onChange={e => setSource(e.target.value)}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-green-500/10 outline-none transition-all"
              />
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">KES</span>
                <input 
                  type="number" placeholder="0.00" 
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 pl-16 text-3xl font-black italic serif focus:ring-2 focus:ring-green-500/10 outline-none transition-all"
                />
              </div>
              <select 
                value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-green-500/10 appearance-none bg-[url('data:image/svg+xml;chat...')] bg-no-repeat bg-[right_1.5rem_center]"
              >
                 <option value="salary">Regular Salary</option>
                 <option value="project">Project / Gig</option>
                 <option value="business">Business Revenue</option>
                 <option value="investment">Dividends</option>
                 <option value="other">Other</option>
              </select>
              <button 
                onClick={handleAddIncome}
                className="w-full bg-green-600 text-white py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-200 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Inflow Record
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
         <h3 className="text-2xl font-bold tracking-tight mb-8 italic serif">Wealth Portfolio</h3>
         <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {incomes.map((income) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={income.id} 
                  className="flex items-center justify-between p-7 rounded-[2.5rem] border border-black/[0.03] bg-gray-50/20 group hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-black text-white flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-6">
                      <Briefcase className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-black text-xl italic serif">{income.source}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 lowercase capitalize">
                        {income.type} Stream • {format(new Date(income.date), 'MMMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-600">+ KES {income.amount.toLocaleString()}</p>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-green-600/30">Verified Deposit</span>
                    </div>
                    <button 
                      onClick={() => deleteDoc(doc(db, 'incomes', income.id))}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {incomes.length === 0 && (
              <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border border-dashed border-black/5">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic serif">No income streams declared.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};
