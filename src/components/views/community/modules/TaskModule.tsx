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
  ChevronRight,
  Layout,
  Image as ImageIcon,
  ArrowLeft,
  Camera,
  Target,
  Calendar,
  X
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  where,
  getDocs,
  arrayUnion
} from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommunityTaskModule({ community, user }: { community: any, user: User }) {
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [selectedInitiative, setSelectedInitiative] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  // Form states - Initiative
  const [iTitle, setITitle] = useState('');
  const [iDesc, setIDesc] = useState('');
  const [iPriority, setIPriority] = useState('medium');
  const [iTargetDate, setITargetDate] = useState('');

  // Form states - Task
  const [tTitle, setTTitle] = useState('');
  const [tPriority, setTPriority] = useState('medium');
  const [tAssigneeId, setTAssigneeId] = useState('');

  // Gallery states
  const [showGalleryUpload, setShowGalleryUpload] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [imgCaption, setImgCaption] = useState('');

  const isModerator = community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid;

  useEffect(() => {
    const q = query(
      collection(db, 'communities', community.id, 'projects'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInitiatives(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [community.id]);

  useEffect(() => {
    if (!selectedInitiative) {
      setTasks([]);
      return;
    }
    const q = query(
      collection(db, 'communities', community.id, 'projects', selectedInitiative.id, 'tasks'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const taskList: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(taskList);
      
      // Auto-update progress of the initiative based on tasks
      if (taskList.length > 0) {
        const completed = taskList.filter((t: any) => t.status === 'completed').length;
        const progress = Math.round((completed / taskList.length) * 100);
        
        if (progress !== (selectedInitiative.progress || 0) || taskList.length !== (selectedInitiative.taskCount || 0)) {
          updateDoc(doc(db, 'communities', community.id, 'projects', selectedInitiative.id), {
            progress,
            taskCount: taskList.length,
            completedTaskCount: completed
          });
        }
      } else if (selectedInitiative.taskCount !== 0) {
        updateDoc(doc(db, 'communities', community.id, 'projects', selectedInitiative.id), {
            progress: 0,
            taskCount: 0,
            completedTaskCount: 0
        });
      }
    });
    return () => unsub();
  }, [community.id, selectedInitiative?.id]);

  const addInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iTitle.trim()) return;

    try {
      await addDoc(collection(db, 'communities', community.id, 'projects'), {
        title: iTitle,
        description: iDesc,
        priority: iPriority,
        targetDate: iTargetDate,
        status: 'in-progress',
        progress: 0,
        taskCount: 0,
        completedTaskCount: 0,
        leadId: user.uid,
        leadName: user.displayName,
        creatorId: user.uid,
        gallery: [],
        createdAt: serverTimestamp()
      });
      setITitle(''); setIDesc(''); setITargetDate('');
      setShowAddInitiative(false);
      toast.success("New initiative launched!");
    } catch (e) {
      toast.error("Failed to track initiative.");
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle.trim() || !selectedInitiative) return;

    await addDoc(collection(db, 'communities', community.id, 'projects', selectedInitiative.id, 'tasks'), {
      title: tTitle,
      priority: tPriority,
      status: 'pending',
      creatorId: user.uid,
      assigneeId: tAssigneeId || null,
      createdAt: serverTimestamp()
    });

    setTTitle(''); setTAssigneeId('');
    setShowAddTask(false);
    toast.success("Assignment committed.");
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateDoc(doc(db, 'communities', community.id, 'projects', selectedInitiative.id, 'tasks', id), {
      status: next,
      completedAt: next === 'completed' ? serverTimestamp() : null
    });
  };

  const handlePostImage = async () => {
    if (!imgUrl || !selectedInitiative) return;
    try {
      await updateDoc(doc(db, 'communities', community.id, 'projects', selectedInitiative.id), {
        gallery: arrayUnion({
          url: imgUrl,
          caption: imgCaption || 'Project update',
          createdAt: new Date().toISOString()
        })
      });
      setImgUrl(''); setImgCaption('');
      setShowGalleryUpload(false);
      toast.success("Visual update posted.");
    } catch (e) {
      toast.error("Failed to post update.");
    }
  };

  if (selectedInitiative) {
     return (
        <div className="space-y-12 animate-in slide-in-from-bottom duration-500 pb-20">
           <div className="flex items-center justify-between">
              <button 
                onClick={() => setSelectedInitiative(null)}
                className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                 <ArrowLeft className="w-5 h-5" />
                 <span className="text-xs font-black uppercase tracking-widest">Back to Overview</span>
              </button>
              <div className="flex items-center gap-2">
                 <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400">{selectedInitiative.priority} Priority</span>
                 <span className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-full text-[8px] font-black uppercase tracking-widest">{selectedInitiative.status}</span>
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-5xl font-black italic serif tracking-tight text-black dark:text-white leading-tight">{selectedInitiative.title}</h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl">{selectedInitiative.description}</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                 <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xl font-bold italic serif text-black dark:text-white flex items-center gap-3">
                          <CheckSquare className="w-6 h-6 text-orange-500" />
                          Assignments ({tasks.length})
                       </h3>
                       <button 
                         onClick={() => setShowAddTask(true)}
                         className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-110 transition-all shadow-lg"
                       >
                          <Plus className="w-5 h-5" />
                       </button>
                    </div>

                    <div className="space-y-3">
                       {tasks.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => toggleTask(t.id, t.status)}
                            className={cn(
                              "p-6 rounded-3xl border flex items-center justify-between transition-all cursor-pointer group",
                              t.status === 'completed' ? "bg-gray-50 dark:bg-zinc-800/30 border-transparent opacity-60" : "bg-white dark:bg-zinc-900 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                            )}
                          >
                             <div className="flex items-center gap-4">
                                <div className={cn(
                                   "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                                   t.status === 'completed' ? "bg-green-100 dark:bg-green-500/10 text-green-600" : "bg-gray-100 dark:bg-zinc-800 text-gray-300"
                                )}>
                                   {t.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                </div>
                                <div>
                                   <p className={cn("font-bold text-sm", t.status === 'completed' && "line-through text-gray-400")}>{t.title}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{t.priority}</span>
                                      {t.assigneeId && <span className="text-[8px] font-black uppercase tracking-widest text-blue-500">ID: {t.assigneeId.slice(-4)}</span>}
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      if(window.confirm("Abort this task?")) deleteDoc(doc(db, 'communities', community.id, 'projects', selectedInitiative.id, 'tasks', t.id));
                                   }}
                                   className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                       ))}
                       {tasks.length === 0 && (
                          <div className="py-12 text-center border-2 border-dashed border-black/5 dark:border-white/5 rounded-3xl">
                             <p className="text-gray-400 italic serif">No assignments yet. Create tasks to start tracking.</p>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xl font-bold italic serif text-black dark:text-white flex items-center gap-3">
                          <ImageIcon className="w-6 h-6 text-purple-500" />
                          Project Gallery
                       </h3>
                       <button 
                         onClick={() => setShowGalleryUpload(!showGalleryUpload)}
                         className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-black dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                       >
                          {showGalleryUpload ? 'Cancel' : 'Post Update'}
                       </button>
                    </div>

                    {showGalleryUpload && (
                       <div className="p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-3xl space-y-4 border border-black/5 dark:border-white/5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Image URL</label>
                                <input 
                                   type="text" 
                                   value={imgUrl}
                                   onChange={e => setImgUrl(e.target.value)}
                                   placeholder="https://..." 
                                   className="w-full p-3 bg-white dark:bg-zinc-900 rounded-xl outline-none border border-black/5 dark:border-white/5 text-xs text-black dark:text-white"
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Caption</label>
                                <input 
                                   type="text" 
                                   value={imgCaption}
                                   onChange={e => setImgCaption(e.target.value)}
                                   placeholder="What's happening?" 
                                   className="w-full p-3 bg-white dark:bg-zinc-900 rounded-xl outline-none border border-black/5 dark:border-white/5 text-xs text-black dark:text-white"
                                />
                             </div>
                          </div>
                          <button 
                            onClick={handlePostImage}
                            disabled={!imgUrl}
                            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                          >
                             Push Visual Update
                          </button>
                       </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                       {selectedInitiative.gallery?.map((img: any, idx: number) => (
                          <div key={idx} className="aspect-[4/3] relative rounded-[2rem] overflow-hidden group">
                             <img src={img.url} alt={img.caption} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                <p className="text-white font-bold text-sm italic serif">{img.caption}</p>
                             </div>
                          </div>
                       ))}
                       {(!selectedInitiative.gallery || selectedInitiative.gallery.length === 0) && (
                          <div className="col-span-2 py-12 text-center bg-gray-50 dark:bg-zinc-800/30 rounded-3xl border border-black/5 dark:border-white/5">
                             <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                             <p className="text-xs text-gray-400 font-medium">No visual evidence posted yet.</p>
                          </div>
                       )}
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Completion Metrics</p>
                    <div className="flex items-center gap-6">
                       <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90">
                             <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-zinc-800" />
                             <circle 
                               cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="8" 
                               strokeDasharray={2 * Math.PI * 44}
                               strokeDashoffset={2 * Math.PI * 44 * (1 - (selectedInitiative.progress || 0) / 100)}
                               className="text-orange-500 transition-all duration-1000"
                               strokeLinecap="round"
                             />
                          </svg>
                          <span className="absolute text-xl font-black italic serif text-black dark:text-white">{selectedInitiative.progress || 0}%</span>
                       </div>
                       <div>
                          <p className="text-xs font-bold text-black dark:text-white">Active Status</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mt-1">{selectedInitiative.status}</p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Timeline & Goals</p>
                    <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-gray-400">
                             <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Date</p>
                             <p className="text-sm font-bold text-black dark:text-white">
                                {selectedInitiative.targetDate ? new Date(selectedInitiative.targetDate).toLocaleDateString() : 'Unscheduled'}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-gray-400">
                             <Target className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Milestones</p>
                             <p className="text-sm font-bold text-black dark:text-white">{selectedInitiative.taskCount || 0} Defined</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Task Add Modal-like overlay */}
           {showAddTask && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                 <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative">
                    <button onClick={() => setShowAddTask(false)} className="absolute top-8 right-8 text-gray-400"><XIcon className="w-5 h-5" /></button>
                    <h3 className="text-2xl font-black italic serif text-black dark:text-white mb-8">Assign Task</h3>
                    <form onSubmit={addTask} className="space-y-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Title</label>
                          <input type="text" value={tTitle} onChange={e => setTTitle(e.target.value)} required className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl outline-none text-sm font-bold" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Priority</label>
                          <div className="flex gap-2">
                             {['low', 'medium', 'high'].map(p => (
                                <button key={p} type="button" onClick={() => setTPriority(p)} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", tPriority === p ? "bg-black text-white" : "bg-gray-100 text-gray-400")}>{p}</button>
                             ))}
                          </div>
                       </div>
                       <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 transition-all active:scale-95">Commit Assignment</button>
                    </form>
                 </motion.div>
              </div>
           )}
        </div>
     );
  }

  return (
    <div className="space-y-10 animate-in fade-in transition-all pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h2 className="text-2xl font-black italic serif flex items-center gap-3 text-black dark:text-white">
               <Layout className="w-8 h-8 text-orange-500" />
               Group Initiatives
            </h2>
            <p className="text-gray-400 dark:text-gray-500 font-medium mt-1">Strategic projects and long-term goals for {community.name}.</p>
         </div>
         {isModerator && (
            <button 
              onClick={() => setShowAddInitiative(true)}
              className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-black/10"
            >
               <Plus className="w-5 h-5" /> Launch Initiative
            </button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {initiatives.map(initiative => (
            <motion.div 
              key={initiative.id} 
              layoutId={initiative.id}
              onClick={() => setSelectedInitiative(initiative)}
              className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-black/10 transition-all cursor-pointer group flex flex-col space-y-8"
            >
               <div className="flex items-start justify-between">
                  <div className="space-y-1">
                     <h4 className="text-2xl font-black italic serif text-black dark:text-white leading-tight">{initiative.title}</h4>
                     <p className="text-sm text-gray-400 dark:text-gray-500 font-medium line-clamp-1">{initiative.description}</p>
                  </div>
                  <span className={cn(
                     "px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-500",
                     initiative.priority === 'high' && "text-red-500"
                  )}>{initiative.priority}</span>
               </div>

               <div className="pt-6 border-t border-black/5 dark:border-white/5 space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                     <span>Deployment Progress</span>
                     <span className="text-black dark:text-white">{initiative.progress || 0}% Complete</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                        style={{ width: `${initiative.progress || 0}%` }}
                     />
                  </div>
               </div>

               <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                     <div className="flex -space-x-3">
                         {[1,2,3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-zinc-900 bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                               <UserIcon className="w-4 h-4 text-gray-300" />
                            </div>
                         ))}
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">+{initiative.taskCount || 0} Milestones</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-300 dark:text-gray-600 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all">
                     <ChevronRight className="w-6 h-6" />
                  </div>
               </div>
            </motion.div>
         ))}
      </div>

      {initiatives.length === 0 && (
         <div className="text-center py-32 bg-gray-50 dark:bg-zinc-900 shadow-inner rounded-[3rem] border-2 border-dashed border-black/5 dark:border-white/5 space-y-4">
            <Layout className="w-16 h-16 text-black/5 dark:text-white/5 mx-auto" />
            <p className="text-gray-400 dark:text-gray-500 italic serif text-lg font-medium">No strategic initiatives launched for this group.</p>
         </div>
      )}

      {/* Add Initiative Sidebar */}
      <AnimatePresence>
         {showAddInitiative && (
            <div className="fixed inset-0 z-[60] flex items-center justify-end">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddInitiative(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
               <motion.div 
                 initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }}
                 className="w-full max-w-md h-screen bg-white dark:bg-zinc-950 p-12 shadow-2xl relative z-10 overflow-y-auto"
               >
                  <button onClick={() => setShowAddInitiative(false)} className="absolute top-10 right-10 p-3 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
                     <XIcon className="w-6 h-6 text-gray-400" />
                  </button>

                  <div className="space-y-12">
                     <div className="space-y-4">
                        <h3 className="text-4xl font-black italic serif text-black dark:text-white tracking-tight">Launch Initiative</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">Define the scope, priority, and timeline for a new communal effort.</p>
                     </div>

                     <form onSubmit={addInitiative} className="space-y-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Initiative Title</label>
                           <input type="text" required value={iTitle} onChange={e => setITitle(e.target.value)} placeholder="e.g. Communal Borehole Project" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] p-6 font-bold shadow-xs outline-none focus:ring-4 focus:ring-black/5 text-black dark:text-white" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Short Description</label>
                           <textarea value={iDesc} onChange={e => setIDesc(e.target.value)} placeholder="High-level description of objectives..." className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] p-6 font-medium shadow-xs outline-none focus:ring-4 focus:ring-black/5 h-32 text-black dark:text-white" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Priority</label>
                              <div className="flex flex-col gap-2">
                                 {['low', 'medium', 'high'].map(p => (
                                    <button key={p} type="button" onClick={() => setIPriority(p)} className={cn("py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", iPriority === p ? "bg-black dark:bg-white text-white dark:text-black shadow-xl" : "bg-gray-100 dark:bg-zinc-900 text-gray-400")}>{p}</button>
                                 ))}
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Target Date</label>
                              <input type="date" value={iTargetDate} onChange={e => setITargetDate(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-xs text-black dark:text-white" />
                           </div>
                        </div>

                        <div className="fixed bottom-0 right-0 w-full max-w-md p-10 bg-gradient-to-t from-white dark:from-zinc-950 via-white dark:via-zinc-950 to-transparent">
                           <button type="submit" className="w-full py-6 bg-orange-600 dark:bg-orange-500 text-white rounded-[2rem] font-bold uppercase tracking-widest shadow-2xl shadow-orange-600/30 hover:scale-[1.02] active:scale-95 transition-all">
                              Initialize Tracking
                           </button>
                        </div>
                     </form>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    )
}
