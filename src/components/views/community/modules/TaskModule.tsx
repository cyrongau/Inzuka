import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  Plus, 
  MoreVertical,
  CheckCircle2,
  Trash2,
  Filter,
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';

export default function CommunityTaskModule({ community, user }: { community: any, user: User }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'communities', community.id, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [community.id]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addDoc(collection(db, 'communities', community.id, 'tasks'), {
      title,
      priority,
      status: 'pending',
      creatorId: user.uid,
      creatorName: user.displayName,
      assigneeId: assigneeId || null,
      createdAt: serverTimestamp()
    });

    setTitle('');
    setAssigneeId('');
    setShowAdd(false);
    toast.success("Task added to project board.");
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateDoc(doc(db, 'communities', community.id, 'tasks', id), {
      status: next,
      completedAt: next === 'completed' ? serverTimestamp() : null
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in transition-all">
      {/* Task Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h2 className="text-xl font-bold italic serif flex items-center gap-2">
               <CheckSquare className="w-6 h-6 text-orange-500" /> Operational Board
            </h2>
            <p className="text-gray-400 text-xs font-medium mt-1">Manage project milestones and group responsibilities.</p>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAdd(true)}
              className="px-6 py-2 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-black/10"
            >
               <Plus className="w-4 h-4" /> New Task
            </button>
         </div>
      </div>

      {/* Grid of Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {tasks.map(t => (
           <div 
             key={t.id} 
             onClick={() => toggleTask(t.id, t.status)}
             className={cn(
               "p-6 rounded-[2.5rem] border transition-all cursor-pointer group",
               t.status === 'completed' ? "bg-gray-50 border-black/5 opacity-60" : "bg-white border-black/5 shadow-sm hover:border-orange-200"
             )}
           >
              <div className="flex items-start justify-between mb-4">
                 <div className={cn(
                   "w-8 h-8 rounded-lg flex items-center justify-center",
                   t.status === 'completed' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                 )}>
                    {t.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                 </div>
                 <div className={cn(
                    "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                    t.priority === 'high' ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"
                 )}>
                    {t.priority}
                 </div>
              </div>
              <h4 className={cn("font-bold text-lg mb-2", t.status === 'completed' && "line-through text-gray-400")}>
                 {t.title}
              </h4>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 border border-black/5 flex items-center justify-center text-[8px] font-bold text-gray-400 overflow-hidden">
                       <UserIcon className="w-3 h-3" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-500">
                       {t.assigneeId ? (t.assigneeId === user.uid ? 'Me' : `User: ${t.assigneeId.slice(-4)}`) : 'Unassigned'}
                    </p>
                 </div>
                 <button className="text-gray-300 group-hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Delete task?")) {
                        deleteDoc(doc(db, 'communities', community.id, 'tasks', t.id));
                      }
                    }} />
                 </button>
              </div>
           </div>
         ))}
      </div>

      {tasks.length === 0 && (
         <div className="text-center py-24 bg-white rounded-[3rem] border border-black/5 border-dashed">
            <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-400 italic">No missions active at the moment.</p>
         </div>
      )}

      {/* Add Task Sidebar */}
      {showAdd && (
         <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl p-8 border-l border-black/5 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-12">
               <h3 className="text-2xl font-black serif italic">Define Project Task</h3>
               <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
               </button>
            </div>

            <form onSubmit={addTask} className="space-y-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Task Title</label>
                  <input 
                    type="text" 
                    required 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Weekly collection..." 
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-sm font-bold shadow-xs outline-none focus:ring-2 focus:ring-black/10"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                     {['low', 'medium', 'high'].map(p => (
                       <button 
                         key={p} 
                         type="button"
                         onClick={() => setPriority(p)}
                         className={cn(
                           "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                           priority === p ? "bg-black text-white" : "bg-gray-50 text-gray-400 hover:text-black border border-black/5"
                         )}
                       >
                         {p}
                       </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Delegate To (ID)</label>
                  <input 
                    type="text" 
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    placeholder="Enter Member UID..." 
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <p className="text-[9px] text-gray-400 px-2 italic">Copy member ID from the Registry module.</p>
               </div>

               <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-orange-600/20 active:scale-95 transition-all">
                  Commit to Project Board
               </button>
            </form>
         </div>
      )}
    </div>
  );
}
