import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isAfter,
  startOfToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface CalendarPickerProps {
  value: string; // yyyy-MM-dd
  onChange: (date: string) => void;
  label?: string;
  className?: string;
  disableFuture?: boolean;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  value,
  onChange,
  label,
  className,
  disableFuture = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  
  const selectedDate = value ? new Date(value) : null;
  const today = startOfToday();

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
        <button 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest italic serif">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-[8px] font-black uppercase tracking-tighter text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];

    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, today);
        const isDisabled = disableFuture && isAfter(day, today);

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "relative h-10 flex items-center justify-center cursor-pointer transition-all rounded-xl m-0.5 text-[10px] font-bold",
              !isCurrentMonth ? "text-gray-300 dark:text-gray-700" : "text-black dark:text-white",
              isSelected ? "bg-black text-white dark:bg-white dark:text-black shadow-lg scale-110 z-10" : "hover:bg-black/5 dark:hover:bg-white/5",
              isToday && !isSelected && "border border-black/20 dark:border-white/20",
              isDisabled && "opacity-20 cursor-not-allowed pointer-events-none grayscale"
            )}
            onClick={() => {
              if (!isDisabled) {
                onChange(format(cloneDay, 'yyyy-MM-dd'));
                setIsOpen(false);
              }
            }}
          >
            {formattedDate}
            {isToday && (
              <div className={cn(
                "absolute bottom-1 w-1 h-1 rounded-full",
                isSelected ? "bg-black dark:bg-white" : "bg-black dark:bg-white"
              )} />
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="p-2">{rows}</div>;
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 mb-2 block italic serif">
          {label}
        </label>
      )}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-4 h-4 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
          <span className="text-sm font-black italic serif text-black dark:text-white">
            {value ? format(new Date(value), 'MMMM dd, yyyy') : 'Select Date'}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[110]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] shadow-2xl z-[120] w-[320px] overflow-hidden"
            >
              {renderHeader()}
              <div className="p-2">
                {renderDays()}
                {renderCells()}
              </div>
              <div className="p-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                <button 
                   onClick={() => {
                     onChange(format(today, 'yyyy-MM-dd'));
                     setIsOpen(false);
                   }}
                   className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Jump to Today
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-gray-50 dark:bg-zinc-800 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
