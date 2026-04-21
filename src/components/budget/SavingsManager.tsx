import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiggyBank, Plus, TrendingUp, X, Target, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface SavingsManagerProps {
  userId: string;
  savings: any[];
}

export const SavingsManager: React.FC<SavingsManagerProps> = ({
  userId,
  savings
}) => {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [activeSavingsId, setActiveSavingsId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  const handleAddGoal = async () => {
    if (!goalName || !targetAmount) return;
    try {
      await addDoc(collection(db, 'savingsGoals'), {
        userId,
        name: goalName,
        targetAmount: parseInt(targetAmount),
        currentAmount: 0,
        createdAt: new Date().toISOString()
      });
      setGoalName('');
      setTargetAmount('');
      setIsAddingGoal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTopUp = async (goalId: string, current: number) => {
    if (!topUpAmount) return;
    try {
      await updateDoc(doc(db, 'savingsGoals', goalId), {
        currentAmount: current + parseInt(topUpAmount)
      });
      setTopUpAmount('');
      setActiveSavingsId(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <motion.div 
          onClick={() => setIsAddingGoal(true)}
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-zinc-900 p-12 rounded-[3.5rem] border-2 border-dashed border-black/10 dark:border-white/10 shadow-sm flex flex-col items-center justify-center text-center space-y-6 hover:bg-gray-50/50 dark:hover:bg-zinc-800 transition-all cursor-pointer group"
        >
          <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-500">
            <Plus className="w-10 h-10" />
          </div>
          <div>
            <h4 className="text-2xl font-bold tracking-tight italic serif text-black dark:text-white">Saving Plan</h4>
            <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest leading-relaxed">Secure funds for future resilience.</p>
          </div>
        </motion.div>

        {savings.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <motion.div 
              layout
              key={goal.id} 
              className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-8 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-500/20">
                  <Target className="w-7 h-7" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black serif italic text-black dark:text-white">KES {goal.currentAmount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">of {goal.targetAmount.toLocaleString()} target</p>
                </div>
              </div>

              <div className="relative z-10 space-y-4 text-black dark:text-white">
                <h4 className="text-xl font-bold tracking-tight">{goal.name}</h4>
                <div className="space-y-2">
                  <div className="h-2.5 w-full bg-gray-50 dark:bg-white/5 rounded-full overflow-hidden border border-black/[0.03] dark:border-white/[0.03]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="h-full bg-black dark:bg-white rounded-full"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 dark:text-gray-500">Resilience Index</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{Math.round(progress)}% Complete</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-4 flex gap-2">
                <input 
                  type="number" 
                  placeholder="Top up amount"
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 outline-none transition-all text-black dark:text-white"
                  value={activeSavingsId === goal.id ? topUpAmount : ''}
                  onChange={(e) => {
                    setActiveSavingsId(goal.id);
                    setTopUpAmount(e.target.value);
                  }}
                />
                <button 
                  onClick={() => handleTopUp(goal.id, goal.currentAmount)}
                  disabled={activeSavingsId !== goal.id || !topUpAmount}
                  className="bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  Sync
                </button>
              </div>

              {/* Delete button (Gentle) */}
              <button 
                onClick={() => deleteDoc(doc(db, 'savingsGoals', goal.id))}
                className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-black dark:text-white">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[4rem] p-12 max-w-md w-full shadow-2xl space-y-10 relative overflow-hidden border border-black/5 dark:border-white/5"
            >
              <div className="space-y-2">
                <h3 className="text-4xl font-bold tracking-tight italic serif">New Mission</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Define your financial target</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Mission Name</label>
                  <input 
                    type="text" placeholder="e.g. Dream House, Education Fund"
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 text-black dark:text-white"
                    value={goalName} onChange={e => setGoalName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Target Amount (KES)</label>
                  <input 
                    type="number" placeholder="0.00"
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-6 text-3xl font-black italic serif outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 text-black dark:text-white"
                    value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
                  />
                </div>
                
                <div className="pt-6 space-y-3">
                  <button 
                    onClick={handleAddGoal}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.05] active:scale-95 transition-all"
                  >Initialize Goal</button>
                  <button 
                    onClick={() => setIsAddingGoal(false)}
                    className="w-full py-4 text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-black dark:hover:text-white transition-colors"
                  >Abort Mission</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
