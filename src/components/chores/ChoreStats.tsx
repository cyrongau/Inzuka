import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ChoreStatsProps {
  total: number;
  completed: number;
}

export const ChoreStats: React.FC<ChoreStatsProps> = ({ total, completed }) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold italic serif">Household Pulse</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Weekly Completion Velocity</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-black tabular-nums">{percent}%</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-black/[0.02] p-1">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="h-full bg-black rounded-full shadow-lg" 
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter text-gray-400">
           <span>0% Idle</span>
           <span>{completed} of {total} Tasks Sequenced</span>
           <span>100% Harmony</span>
        </div>
      </div>
    </div>
  );
};
