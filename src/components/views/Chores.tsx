import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock, 
  User as UserIcon,
  Baby,
  Wind,
  Home as HomeIcon,
  Layers,
  Calendar,
  ChevronRight,
  Filter,
  Bell,
  BellOff,
  ListTodo,
  X,
  ChevronDown,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { format, isAfter, startOfDay } from 'date-fns';

import ChoreSuppliesModal from './ChoreSuppliesModal';
import { ChoreStats } from '../chores/ChoreStats';
import { ChoreForm } from '../chores/ChoreForm';
import { TaskItem } from '../chores/TaskItem';

const CATEGORIES = [
  { id: 'cleaning', label: 'Cleaning', icon: Wind, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'kids', label: 'Children', icon: Baby, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'outside', label: 'Outside', icon: HomeIcon, iconActive: HomeIcon, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'other', label: 'Other', icon: Layers, color: 'text-gray-500', bg: 'bg-gray-50' },
];

export default function Chores({ user, profile }: { user: User, profile: any }) {
  const [chores, setChores] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [suppliesChore, setSuppliesChore] = useState<any>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cleaning');
  const [assigneeId, setAssigneeId] = useState('');
  const [manualAssignee, setManualAssignee] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState('12:00');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [newCheckListItem, setNewCheckListItem] = useState('');
  const [checkList, setCheckList] = useState<{id: string, text: string, completed: boolean}[]>([]);

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) return;

    const q = query(collection(db, 'chores'), where('familyId', '==', familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chores'));

    // Fetch Family Members specifically in THIS family
    const usersQ = query(collection(db, 'users'), where('familyId', '==', familyId));
    const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
      setFamilyMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, [familyId]);

  const addCheckListItem = () => {
    if (!newCheckListItem.trim()) return;
    setCheckList([...checkList, { id: Date.now().toString(), text: newCheckListItem, completed: false }]);
    setNewCheckListItem('');
  };

  const removeCheckListItem = (id: string) => {
    setCheckList(checkList.filter(item => item.id !== id));
  };

  const addChore = async () => {
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
        createdBy: user.uid,
        familyId: familyId,
        createdAt: serverTimestamp()
      });
      setTitle('');
      setAssigneeId('');
      setManualAssignee('');
      setCheckList([]);
      setShowAdd(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'chores');
    }
  };

  const toggleChore = async (chore: any) => {
    try {
      await updateDoc(doc(db, 'chores', chore.id), {
        completed: !chore.completed
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'chores');
    }
  };

  const toggleCheckListItem = async (chore: any, itemId: string) => {
    const updatedCheckList = chore.checkList.map((item: any) => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    try {
      await updateDoc(doc(db, 'chores', chore.id), {
        checkList: updatedCheckList
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'chores');
    }
  };

  const deleteChore = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'chores', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'chores');
    }
  };

  const filteredChores = chores.filter(c => activeCategory === 'all' || c.category === activeCategory);
  const pendingChores = filteredChores.filter(c => !c.completed);
  const completedChores = filteredChores.filter(c => c.completed);

  if (!familyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-8">
        <div className="w-24 h-24 bg-black text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl">
          <HomeIcon className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-3xl font-bold italic serif tracking-tight underline decoration-black/5 underline-offset-8">Bond Hub Connection Required</h3>
          <p className="text-gray-400 max-w-md mt-6 font-bold uppercase tracking-widest text-[10px] leading-relaxed">Household chores are derived from shared resilience. Connect your family unit to initialize synchronization.</p>
        </div>
        <button 
          onClick={() => window.location.hash = '#profile'}
          className="bg-black text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          Initialize Family Link
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4">
      {/* Header & Flow Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-1">
          <h2 className="text-4xl font-light italic serif tracking-tight">Household <span className="font-bold not-italic">Entropy</span></h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Restoring order through iterative harmony</p>
        </div>
        
        <div className="flex bg-black/5 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
           <button 
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
              activeCategory === 'all' ? "bg-black text-white shadow-xl" : "text-gray-400 hover:text-black"
            )}
          >
            All Threads
          </button>
          {CATEGORIES.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                activeCategory === cat.id ? "bg-black text-white shadow-xl" : "text-gray-400 hover:text-black"
              )}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Management Column */}
        <div className="lg:col-span-4 space-y-8">
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="w-full bg-black text-white p-8 rounded-[3rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl"
          >
            {showAdd ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            {showAdd ? 'Abort Sequence' : 'Initialize Task'}
          </button>

          {showAdd && (
            <ChoreForm 
              userId={user.uid}
              familyId={familyId}
              familyMembers={familyMembers}
              categories={CATEGORIES}
              onSuccess={() => setShowAdd(false)}
            />
          )}

          <ChoreStats 
            total={chores.length} 
            completed={completedChores.length} 
          />

          <div className="bg-indigo-600 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-white/20 transition-all"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-indigo-300" />
                <h4 className="text-xl font-bold italic serif italic">Harmony Index</h4>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200/60 leading-relaxed">
                Collective chores completed in sync reduce entropy and increase household resilience.
              </p>
            </div>
          </div>
        </div>

        {/* Visibility Column */}
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white rounded-[4rem] p-10 lg:p-14 border border-black/5 shadow-sm min-h-[600px]">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-3xl font-bold tracking-tighter italic serif underline decoration-black/5 underline-offset-8">
                {activeCategory === 'all' ? 'Thread Overview' : `${CATEGORIES.find(c => c.id === activeCategory)?.label} Domain`}
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-5 py-2 bg-black/5 text-gray-400 rounded-full text-[10px] font-black tracking-widest uppercase">
                  {pendingChores.length} Cycles Remaining
                </span>
              </div>
            </div>

            {filteredChores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center opacity-10">
                <Layers className="w-24 h-24 mb-6" />
                <p className="text-2xl font-black italic serif uppercase tracking-[0.2em]">Void Detected</p>
                <p className="text-xs font-bold mt-2 uppercase tracking-widest">Restore harmony by initializing a new task domain.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {pendingChores.length > 0 && (
                   <div className="space-y-6">
                     {pendingChores.map((chore) => (
                       <TaskItem 
                         key={chore.id} 
                         chore={chore} 
                         categories={CATEGORIES}
                         onToggle={() => { toggleChore(chore); }} 
                         onDelete={() => { deleteChore(chore.id); }} 
                         onToggleCheckList={(itemId) => toggleCheckListItem(chore, itemId)}
                         onLogSupplies={() => setSuppliesChore(chore)}
                       />
                     ))}
                   </div>
                )}

                {completedChores.length > 0 && (
                  <div className="space-y-6 pt-10 border-t border-black/[0.03]">
                    <div className="flex items-center gap-4 px-6 mb-2">
                       <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300">Synchronized Archive</span>
                       <div className="flex-1 h-px bg-black/[0.03]" />
                    </div>
                    {completedChores.map((chore) => (
                      <TaskItem 
                        key={chore.id} 
                        chore={chore} 
                        categories={CATEGORIES}
                        onToggle={() => { toggleChore(chore); }} 
                        onDelete={() => { deleteChore(chore.id); }} 
                        onToggleCheckList={(itemId) => toggleCheckListItem(chore, itemId)}
                        onLogSupplies={() => setSuppliesChore(chore)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {suppliesChore && (
         <ChoreSuppliesModal 
           familyId={familyId} 
           choreName={suppliesChore.title} 
           onClose={() => setSuppliesChore(null)} 
         />
      )}
    </div>
  );
}
