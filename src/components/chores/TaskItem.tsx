import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, User as UserIcon, ListTodo, Trash2, ChevronDown, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format, isAfter, startOfDay } from 'date-fns';

interface TaskItemProps {
  chore: any;
  categories: any[];
  onToggle: () => void;
  onDelete: () => void;
  onToggleCheckList: (id: string) => void;
  onLogSupplies: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  chore,
  categories,
  onToggle,
  onDelete,
  onToggleCheckList,
  onLogSupplies
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cat = categories.find(c => c.id === chore.category) || categories[categories.length - 1];
  const isOverdue = !chore.completed && chore.dueDate && isAfter(startOfDay(new Date()), startOfDay(new Date(chore.dueDate)));

  return (
    <div className={cn(
      "rounded-[2.5rem] border transition-all overflow-hidden group",
      chore.completed 
        ? "bg-gray-50 border-black/[0.02] opacity-60 shadow-inner" 
        : "bg-white border-black/[0.05] hover:border-black/10 hover:shadow-xl"
    )}>
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-6 flex-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm",
              chore.completed 
                ? "bg-black text-white" 
                : "bg-gray-50 text-gray-200 hover:bg-black hover:text-white"
            )}
          >
            {chore.completed ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
          </button>
          <div className="cursor-pointer flex-1" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-2">
              <h4 className={cn(
                "font-black text-xl tracking-tight italic serif",
                chore.completed && "line-through text-gray-400"
              )}>
                {chore.title}
              </h4>
              {chore.checkList?.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-[9px] text-gray-400 font-black uppercase tracking-widest">
                  <ListTodo className="w-2.5 h-2.5" />
                  {chore.checkList.filter((i:any) => i.completed).length}/{chore.checkList.length}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em]", cat.color)}>
                <cat.icon className="w-3.5 h-3.5" /> {cat.label}
              </div>
              <span className="w-1 h-1 bg-black/5 rounded-full" />
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                <UserIcon className="w-3.5 h-3.5" /> {chore.assignedTo}
              </div>
              {chore.dueDate && (
                <>
                  <span className="w-1 h-1 bg-black/5 rounded-full" />
                  <div className={cn(
                    "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest",
                    isOverdue ? "text-red-500" : "text-gray-400"
                  )}>
                    <Clock className="w-3.5 h-3.5" /> {format(new Date(chore.dueDate), 'MMM d')} at {chore.dueTime || '--:--'}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-3 text-gray-300 hover:text-black transition-colors"
          >
            <ChevronDown className={cn("w-6 h-6 transition-transform duration-500", isExpanded && "rotate-180")} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 space-y-6">
              {chore.checkList?.length > 0 && (
                <div className="bg-gray-50/50 rounded-[2rem] p-6 border border-black/[0.03] space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 px-2 italic serif">Sequencing Log</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chore.checkList.map((item: any) => (
                      <button 
                        key={item.id}
                        onClick={() => onToggleCheckList(item.id)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left bg-white shadow-sm",
                          item.completed ? "border-green-200 bg-green-50/10 opacity-60" : "border-black/5 hover:border-black/20"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all",
                          item.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-100"
                        )}>
                          {item.completed && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span className={cn("text-xs font-bold tracking-tight", item.completed && "line-through text-gray-400")}>{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={onLogSupplies} 
                  className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl flex items-center gap-3 hover:bg-indigo-100 transition-all hover:scale-105"
                >
                   <Package className="w-4 h-4" /> Log Supply Inflow
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
