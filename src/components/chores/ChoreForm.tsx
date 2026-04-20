import React, { useState } from 'react';
import { Plus, Calendar, Clock, Bell, BellOff, User as UserIcon, ListTodo, X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ChoreFormProps {
  userId: string;
  familyId: string;
  familyMembers: any[];
  categories: any[];
  onSuccess: () => void;
}

export const ChoreForm: React.FC<ChoreFormProps> = ({
  userId,
  familyId,
  familyMembers,
  categories,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0].id);
  const [assigneeId, setAssigneeId] = useState('');
  const [manualAssignee, setManualAssignee] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState('12:00');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [newCheckListItem, setNewCheckListItem] = useState('');
  const [checkList, setCheckList] = useState<{id: string, text: string, completed: boolean}[]>([]);

  const addCheckListItem = () => {
    if (!newCheckListItem.trim()) return;
    setCheckList([...checkList, { id: Date.now().toString(), text: newCheckListItem, completed: false }]);
    setNewCheckListItem('');
  };

  const removeCheckListItem = (id: string) => {
    setCheckList(checkList.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !familyId) return;
    
    let finalAssigneeName = manualAssignee;
    let finalAssigneeId = '';

    if (assigneeId && assigneeId !== 'manual') {
      const selectedMember = familyMembers.find(m => m.uid === assigneeId);
      finalAssigneeName = selectedMember?.displayName || selectedMember?.email || 'Unknown';
      finalAssigneeId = assigneeId;
    }

    try {
      await addDoc(collection(db, 'chores'), {
        title,
        category,
        assignedTo: finalAssigneeName || 'Unassigned',
        assignedToUserId: finalAssigneeId,
        dueDate,
        dueTime,
        remindersEnabled,
        checkList,
        completed: false,
        createdBy: userId,
        familyId: familyId,
        createdAt: serverTimestamp()
      });
      onSuccess();
      setTitle('');
      setCheckList([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm space-y-8 animate-in fade-in slide-in-from-top-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 italic serif">Task Identity</label>
          <input 
            type="text" 
            placeholder="e.g. Purify the main hall"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 italic serif">Temporal Node (Date)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 italic serif">Temporal Node (Time)</label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="time" 
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 italic serif">Assignee Agent</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-gray-50 border border-black/5 rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-sm appearance-none"
              >
                <option value="">Select agent...</option>
                {familyMembers.map(member => (
                  <option key={member.uid} value={member.uid}>
                    {member.displayName || member.email}
                  </option>
                ))}
                <option value="manual">Manual Override...</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 italic serif">Notification Node</label>
            <button 
              onClick={() => setRemindersEnabled(!remindersEnabled)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-5 rounded-2xl border transition-all",
                remindersEnabled ? "bg-black text-white border-black" : "bg-gray-50 text-gray-400 border-black/5"
              )}
            >
              <span className="font-bold text-sm uppercase tracking-widest">{remindersEnabled ? 'Enabled' : 'Disabled'}</span>
              {remindersEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {assigneeId === 'manual' && (
          <div className="space-y-1 animate-in slide-in-from-top-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 italic serif">Manual Agent Identity</label>
            <input 
              type="text" 
              placeholder="Enter name..."
              value={manualAssignee}
              onChange={(e) => setManualAssignee(e.target.value)}
              className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-5 font-bold"
            />
          </div>
        )}

        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 italic serif">Task Domains</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "p-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight flex flex-col items-center gap-2 transition-all",
                  category === cat.id ? "bg-black text-white border-black shadow-lg" : "bg-gray-50 border-black/5 text-gray-400 hover:border-black/20"
                )}
              >
                <cat.icon className="w-5 h-5" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 bg-gray-50/50 p-8 rounded-[2rem] border border-black/[0.02]">
          <div className="flex items-center justify-between">
             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 italic serif">Checklist Sequencing</label>
             <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300">Ordered Steps</span>
          </div>
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="Define next step..."
              value={newCheckListItem}
              onChange={(e) => setNewCheckListItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCheckListItem()}
              className="flex-1 bg-white border border-black/5 rounded-[1.25rem] px-5 py-3 text-sm font-bold"
            />
            <button 
              onClick={addCheckListItem} 
              className="bg-black text-white p-3 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-xl shadow-black/10"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {checkList.map((item, idx) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.id} 
                  className="flex items-center justify-between bg-white px-5 py-3 rounded-xl text-xs font-bold border border-black/[0.03] shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-gray-400">0{idx + 1}</span>
                    <span>{item.text}</span>
                  </div>
                  <button onClick={() => removeCheckListItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Sequence Chore
      </button>
    </div>
  );
};
