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
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Briefcase,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Calculator,
  Wallet
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
  arrayUnion,
  increment
} from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'Agri-Business', icon: '🌱' },
  { id: 'Farming', icon: '🚜' },
  { id: 'Transport', icon: '🚛' },
  { id: 'Real Estate', icon: '🏠' },
  { id: 'Service Delivery', icon: '🛠️' },
  { id: 'Education', icon: '📚' },
  { id: 'Health', icon: '🏥' },
  { id: 'Investment', icon: '💰' },
  { id: 'Other', icon: '✨' }
];

export default function ProjectsModule({ community, user }: { community: any, user: User }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'milestones' | 'finances'>('overview');
  
  // Child collection states
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [finances, setFinances] = useState<any[]>([]);
  
  // Creation Wizard states
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objective: '',
    category: '',
    priority: 'medium',
    budget: 0,
    targetDate: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  // Modal states
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [showAllocationRequest, setShowAllocationRequest] = useState(false);

  // Form states - sub-items
  const [tTitle, setTTitle] = useState('');
  const [mTitle, setMTitle] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fType, setFType] = useState<'income' | 'expense' | 'allocation'>('expense');
  const [fDesc, setFDesc] = useState('');

  const isModerator = community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid;
  const isTreasurer = community.memberRoles?.[user.uid] === 'treasurer' || isModerator;

  useEffect(() => {
    const q = query(
      collection(db, 'communities', community.id, 'projects'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [community.id]);

  useEffect(() => {
    if (!selectedProject) return;
    
    const unsubTasks = onSnapshot(
      query(collection(db, 'communities', community.id, 'projects', selectedProject.id, 'tasks'), orderBy('createdAt', 'asc')),
      (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubMilestones = onSnapshot(
      query(collection(db, 'communities', community.id, 'projects', selectedProject.id, 'milestones'), orderBy('targetDate', 'asc')),
      (snap) => setMilestones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubFinance = onSnapshot(
      query(collection(db, 'communities', community.id, 'projects', selectedProject.id, 'finances'), orderBy('date', 'desc')),
      (snap) => setFinances(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubTasks();
      unsubMilestones();
      unsubFinance();
    };
  }, [community.id, selectedProject?.id]);

  const handleCreateProject = async () => {
    if (!formData.title || !formData.category) return;
    
    try {
      const docRef = await addDoc(collection(db, 'communities', community.id, 'projects'), {
        ...formData,
        communityId: community.id,
        communityName: community.name,
        status: 'planning',
        progress: 0,
        actualSpent: 0,
        actualIncome: 0,
        taskCount: 0,
        completedTaskCount: 0,
        milestoneCount: 0,
        completedMilestoneCount: 0,
        leadId: user.uid,
        leadName: user.displayName,
        createdAt: serverTimestamp()
      });
      
      setShowWizard(false);
      setStep(1);
      setFormData({
        title: '',
        description: '',
        objective: '',
        category: '',
        priority: 'medium',
        budget: 0,
        targetDate: '',
        startDate: new Date().toISOString().split('T')[0]
      });
      toast.success("Project initialized successfully!");
    } catch (e) {
      toast.error("Failed to launch project.");
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle || !selectedProject) return;
    
    await addDoc(collection(db, 'communities', community.id, 'projects', selectedProject.id, 'tasks'), {
      title: tTitle,
      status: 'todo',
      priority: 'medium',
      createdAt: serverTimestamp()
    });
    
    await updateDoc(doc(db, 'communities', community.id, 'projects', selectedProject.id), {
      taskCount: increment(1)
    });
    
    setTTitle('');
    setShowAddTask(false);
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle || !selectedProject) return;
    
    await addDoc(collection(db, 'communities', community.id, 'projects', selectedProject.id, 'milestones'), {
      title: mTitle,
      isCompleted: false,
      targetDate: formData.targetDate || new Date().toISOString(),
      createdAt: serverTimestamp()
    });
    
    await updateDoc(doc(db, 'communities', community.id, 'projects', selectedProject.id), {
      milestoneCount: increment(1)
    });
    
    setMTitle('');
    setShowAddMilestone(false);
  };

  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(fAmount);
    if (isNaN(amount) || !selectedProject) return;
    
    await addDoc(collection(db, 'communities', community.id, 'projects', selectedProject.id, 'finances'), {
      amount,
      type: fType,
      description: fDesc,
      date: serverTimestamp(),
      recordedBy: user.displayName,
      isAllocation: fType === 'allocation'
    });
    
    // If it's a treasurer allocation, we also need to record it in the main finance ledger
    if (fType === 'allocation') {
       await addDoc(collection(db, 'communities', community.id, 'transactions'), {
          type: 'Project Allocation',
          amount: amount,
          userId: user.uid,
          userName: user.displayName,
          note: `Capital allocation for project: ${selectedProject.title}`,
          status: 'completed',
          createdAt: serverTimestamp()
       });
       // Deduct from main pool
       await updateDoc(doc(db, 'communities', community.id), {
          poolBalance: increment(-amount)
       });
    }

    const updateKey = fType === 'income' ? 'actualIncome' : 'actualSpent';
    await updateDoc(doc(db, 'communities', community.id, 'projects', selectedProject.id), {
      [updateKey]: increment(amount)
    });
    
    setFAmount('');
    setFDesc('');
    setShowAddFinance(false);
  };

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await updateDoc(doc(db, 'communities', community.id, 'projects', selectedProject.id, 'tasks', task.id), {
      status: newStatus
    });
    
    const diff = newStatus === 'completed' ? 1 : -1;
    await updateDoc(doc(db, 'communities', community.id, 'projects', selectedProject.id), {
      completedTaskCount: increment(diff)
    });
  };

  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [editedObjective, setEditedObjective] = useState('');

  const handleUpdateObjective = async () => {
    if (!selectedProject) return;
    try {
      await updateDoc(doc(db, 'communities', community.id, 'projects', selectedProject.id), {
        objective: editedObjective
      });
      setSelectedProject({ ...selectedProject, objective: editedObjective });
      setIsEditingObjective(false);
      toast.success("Project strategy updated");
    } catch (e) {
      toast.error("Failed to update objective");
    }
  };

  if (selectedProject) {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom duration-500 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button 
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Projects</span>
            </button>
            <div className="space-y-2">
               <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-500">
                    {selectedProject.category}
                  </span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    selectedProject.status === 'in-progress' ? "bg-blue-500 text-white" : "bg-green-500 text-white"
                  )}>
                    {selectedProject.status}
                  </span>
               </div>
               <h2 className="text-4xl md:text-5xl font-black italic serif text-black dark:text-white tracking-tight leading-tight">
                {selectedProject.title}
               </h2>
            </div>
          </div>
          <div className="flex gap-2">
            {['overview', 'tasks', 'milestones', 'finances'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                  activeTab === tab 
                    ? "bg-black text-white dark:bg-white dark:text-black scale-105" 
                    : "bg-white dark:bg-zinc-900 text-gray-400 border border-black/5 dark:border-white/5 hover:bg-gray-50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold italic serif text-black dark:text-white">Project Objective & Strategy</h3>
                    {isModerator && !isEditingObjective && (
                      <button 
                        onClick={() => {
                          setEditedObjective(selectedProject.objective || '');
                          setIsEditingObjective(true);
                        }}
                        className="text-[8px] font-black uppercase tracking-widest text-orange-500 hover:scale-105 transition-all"
                      >
                        Edit Strategy
                      </button>
                    )}
                  </div>

                  {isEditingObjective ? (
                    <div className="space-y-4">
                       <textarea 
                        value={editedObjective}
                        onChange={(e) => setEditedObjective(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl border border-black/5 outline-none font-medium text-sm h-32"
                        placeholder="Define the primary focus..."
                       />
                       <div className="flex gap-2">
                         <button onClick={handleUpdateObjective} className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[8px] font-black uppercase">Save Change</button>
                         <button onClick={() => setIsEditingObjective(false)} className="px-6 py-2 bg-gray-100 text-gray-500 rounded-xl text-[8px] font-black uppercase">Cancel</button>
                       </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                      {selectedProject.objective || "No primary objective defined yet. Defining a strategic goal helps focus group efforts."}
                    </p>
                  )}
                  <div className="pt-6 border-t border-black/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Description</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                      {selectedProject.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Financial Snapshot</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-gray-500">Budget Limit</span>
                         <span className="font-black italic serif">KES {selectedProject.budget?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-gray-500">Actual Spent</span>
                         <span className="font-black italic serif text-red-500">KES {selectedProject.actualSpent?.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            (selectedProject.actualSpent / selectedProject.budget) > 1 ? "bg-red-500" : "bg-green-500"
                          )}
                          style={{ width: `${Math.min((selectedProject.actualSpent / selectedProject.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Yield / Income</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-50 dark:bg-green-900/10 rounded-2xl flex items-center justify-center text-green-500">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-black italic serif text-green-600">KES {selectedProject.actualIncome?.toLocaleString() || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-black text-white dark:bg-white dark:text-black p-10 rounded-[3rem] shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Completion</p>
                     <p className="text-2xl font-black italic serif">{selectedProject.progress || 0}%</p>
                  </div>
                  <div className="w-full h-4 bg-white/10 dark:bg-black/10 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedProject.progress || 0}%` }}
                        className="h-full bg-white dark:bg-black"
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Tasks</p>
                      <p className="text-sm font-bold">{selectedProject.completedTaskCount}/{selectedProject.taskCount}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Milestones</p>
                      <p className="text-sm font-bold">{selectedProject.completedMilestoneCount}/{selectedProject.milestoneCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 space-y-6">
                   <h4 className="text-sm font-black italic serif">Timeline</h4>
                   <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-gray-400"><Calendar className="w-5 h-5" /></div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 tracking-tighter text-ellipsis">Target Completion</p>
                          <p className="text-xs font-bold">{selectedProject.targetDate ? new Date(selectedProject.targetDate).toLocaleDateString() : 'TBD'}</p>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-black/5 p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold italic serif">Project Tasks</h3>
                  <button onClick={() => setShowAddTask(true)} className="p-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:scale-105 transition-all shadow-xl">
                    <Plus className="w-5 h-5" />
                  </button>
               </div>
               <div className="space-y-3">
                  {tasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => toggleTask(task)}
                      className={cn(
                        "p-6 rounded-[2rem] border flex items-center justify-between transition-all cursor-pointer group",
                        task.status === 'completed' ? "bg-gray-50 opacity-60 border-transparent" : "bg-white border-black/5 hover:border-black/10"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          task.status === 'completed' ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                        )}>
                          {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <p className={cn("font-bold text-sm", task.status === 'completed' && "line-through")}>{task.title}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-black/5 p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold italic serif">Project Roadmap</h3>
                  <button onClick={() => setShowAddMilestone(true)} className="p-4 bg-orange-500 text-white rounded-2xl hover:scale-105 transition-all shadow-xl">
                    <Target className="w-5 h-5" />
                  </button>
               </div>
               <div className="relative space-y-8 pl-8 border-l-2 border-dashed border-gray-100">
                  {milestones.map((m, idx) => (
                    <div key={m.id} className="relative group">
                      <div className={cn(
                        "absolute -left-[45px] w-8 h-8 rounded-full border-4 border-white dark:border-zinc-900 flex items-center justify-center transition-colors",
                        m.isCompleted ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-300"
                      )}>
                        {idx + 1}
                      </div>
                      <div className="bg-gray-50 dark:bg-zinc-800/30 p-6 rounded-3xl space-y-2">
                        <p className="font-bold text-lg italic serif">{m.title}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{new Date(m.targetDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'finances' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Financial Performance KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 space-y-2">
                     <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total Capital Spent</p>
                     <p className="text-2xl font-black italic serif text-red-500">KES {selectedProject.actualSpent?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 space-y-2">
                     <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total External Income</p>
                     <p className="text-2xl font-black italic serif text-green-600">KES {selectedProject.actualIncome?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-black text-white p-8 rounded-[2.5rem] space-y-2 group overflow-hidden relative">
                     <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all" />
                     <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Net Position (Profit/Loss)</p>
                     <p className={cn(
                        "text-2xl font-black italic serif",
                        (selectedProject.actualIncome - selectedProject.actualSpent) >= 0 ? "text-green-400" : "text-red-400"
                     )}>
                        KES {(selectedProject.actualIncome - selectedProject.actualSpent).toLocaleString()}
                     </p>
                  </div>
                  <div className="bg-orange-500 text-white p-8 rounded-[2.5rem] space-y-2 flex flex-col justify-center">
                     <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Estimated ROI</p>
                     <div className="flex items-end gap-2">
                        <p className="text-3xl font-black italic serif">
                           {selectedProject.actualSpent > 0 
                             ? `${Math.round(((selectedProject.actualIncome - selectedProject.actualSpent) / selectedProject.actualSpent) * 100)}%`
                             : '0%'}
                        </p>
                        <TrendingUp className="w-5 h-5 mb-1" />
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <h3 className="text-xl font-bold italic serif">Detailed Transaction Ledger</h3>
                         <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Track every shilling allocated or earned</p>
                      </div>
                      <div className="flex gap-2">
                         {isTreasurer && (
                            <button 
                              onClick={() => { setFType('allocation'); setShowAddFinance(true); }}
                              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2"
                            >
                               <Wallet className="w-4 h-4" /> Allocate Group Funds
                            </button>
                         )}
                         <button 
                           onClick={() => { setFType('income'); setShowAddFinance(true); }}
                           className="px-6 py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                         >
                           Record Income
                         </button>
                      </div>
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide">
                      {finances.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-6 bg-gray-50/50 dark:bg-zinc-800/30 rounded-3xl border border-black/[0.02]">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center",
                              f.type === 'income' ? "bg-green-100 text-green-600 shadow-sm" : 
                              f.type === 'allocation' ? "bg-indigo-100 text-indigo-600 shadow-sm" :
                              "bg-red-100 text-red-600"
                            )}>
                              {f.type === 'income' ? <TrendingUp className="w-5 h-5" /> : 
                               f.type === 'allocation' ? <ArrowUpRight className="w-5 h-5" /> :
                               <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <p className="font-black text-sm uppercase tracking-tight">{f.description}</p>
                                  {f.type === 'allocation' && <span className="text-[6px] font-black uppercase bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded leading-none">Internal Funding</span>}
                               </div>
                               <p className="text-[10px] font-medium text-gray-400 mt-0.5">Recorded by {f.recordedBy} • {f.date?.toDate ? new Date(f.date.toDate()).toLocaleDateString() : 'Syncing...'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className={cn("font-black italic serif text-xl", f.type === 'income' || f.type === 'allocation' ? "text-green-600" : "text-red-600")}>
                               {f.type === 'income' || f.type === 'allocation' ? '+' : '-'} {f.amount.toLocaleString()}
                             </p>
                             <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">KES</p>
                          </div>
                        </div>
                      ))}

                      {finances.length === 0 && (
                         <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                               <Calculator className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-gray-400 italic serif text-sm font-medium">No financial entries recorded yet.</p>
                         </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                     <div className="bg-zinc-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
                        <h3 className="text-xl font-bold italic serif text-white/40 mb-10">Sustainability Audit</h3>
                        <div className="space-y-10">
                           <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Burn Rate Index</p>
                              <div className="flex items-end gap-2">
                                 <p className="text-4xl font-black italic serif">
                                    KES {selectedProject.actualSpent > 0 ? (selectedProject.actualSpent / 1).toLocaleString() : 0}
                                 </p>
                                 <p className="text-[10px] font-bold text-white/40 mb-2">/ month</p>
                              </div>
                           </div>
                           <div className="space-y-4 pt-6 border-t border-white/5">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Financial Health</p>
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                    selectedProject.actualIncome > selectedProject.actualSpent ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                 )}>
                                    {selectedProject.actualIncome > selectedProject.actualSpent ? 'Profitable' : 'Deficit'}
                                 </div>
                                 <div className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40">
                                    Tier 1 Project
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 space-y-6">
                        <h4 className="text-sm font-black italic serif">Resource Allocation</h4>
                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl space-y-4 border border-indigo-100 dark:border-indigo-900/20">
                           <div className="flex items-center gap-3">
                              <Wallet className="w-5 h-5 text-indigo-600" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Treasury Kitty Help</p>
                           </div>
                           <p className="text-[10px] text-indigo-500 font-medium leading-relaxed italic">
                             Projects can be funded via direct member contribution or by requesting capital from the main group treasury (Kitty).
                           </p>
                           {isTreasurer ? (
                              <button onClick={() => { setFType('allocation'); setShowAddFinance(true); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Perform Allocation</button>
                           ) : (
                              <button onClick={() => toast.info("Request sent to Treasurer for review.")} className="w-full py-3 bg-white dark:bg-zinc-800 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">Request Capital</button>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showAddTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/40">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm p-10 rounded-[3rem] shadow-2xl relative">
                <button onClick={() => setShowAddTask(false)} className="absolute top-8 right-8"><X className="w-6 h-6 text-gray-300" /></button>
                <h3 className="text-2xl font-black italic serif mb-8">Add Assignment</h3>
                <form onSubmit={handleAddTask} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Task Detail</label>
                      <input type="text" value={tTitle} onChange={e => setTTitle(e.target.value)} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                   </div>
                   <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs">Assign Member</button>
                </form>
              </motion.div>
            </div>
          )}

          {showAddMilestone && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/40">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm p-10 rounded-[3rem] shadow-2xl relative">
                <button onClick={() => setShowAddMilestone(false)} className="absolute top-8 right-8"><X className="w-6 h-6 text-gray-300" /></button>
                <h3 className="text-2xl font-black italic serif mb-8">Define Milestone</h3>
                <form onSubmit={handleAddMilestone} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Milestone Title</label>
                      <input type="text" value={mTitle} onChange={e => setMTitle(e.target.value)} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                   </div>
                   <button type="submit" className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Set Target</button>
                </form>
              </motion.div>
            </div>
          )}

          {showAddFinance && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/40">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm p-10 rounded-[3rem] shadow-2xl relative">
                <button onClick={() => setShowAddFinance(false)} className="absolute top-8 right-8"><X className="w-6 h-6 text-gray-300" /></button>
                <h3 className="text-2xl font-black italic serif mb-8">Financial Entry</h3>
                <form onSubmit={handleAddFinance} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount (KES)</label>
                      <input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type</label>
                      <div className="flex gap-2">
                         <button type="button" onClick={() => setFType('income')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase", fType === 'income' ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400")}>Income</button>
                         <button type="button" onClick={() => setFType('expense')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase", fType === 'expense' ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400")}>Expense</button>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
                      <input type="text" value={fDesc} onChange={e => setFDesc(e.target.value)} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                   </div>
                   <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs">Record Transaction</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h2 className="text-3xl font-black italic serif flex items-center gap-3 text-black dark:text-white">
               <Briefcase className="w-10 h-10 text-orange-500" />
               Impact Projects
            </h2>
            <p className="text-gray-400 dark:text-gray-500 font-medium mt-1">Strategic efforts driving group growth and sustainability.</p>
         </div>
         {isModerator && (
            <button 
              onClick={() => setShowWizard(true)}
              className="px-8 py-5 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-bold uppercase text-xs tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-2xl active:scale-95"
            >
               <Plus className="w-5 h-5" /> Launch Project Wizard
            </button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {projects.map(project => (
            <motion.div 
              key={project.id} 
              onClick={() => setSelectedProject(project)}
              className="bg-white dark:bg-zinc-900 p-12 rounded-[4rem] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-3xl hover:-translate-y-2 transition-all cursor-pointer group space-y-8"
            >
               <div className="flex items-start justify-between">
                  <div className="space-y-2">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">{project.category}</span>
                     <h4 className="text-3xl font-black italic serif text-black dark:text-white leading-tight group-hover:text-orange-600 transition-colors">{project.title}</h4>
                  </div>
                  <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-[2.5rem] space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Progress</p>
                    <p className="text-xl font-black italic serif">{project.progress || 0}%</p>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-[2.5rem] space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Tasks</p>
                    <p className="text-xl font-black italic serif">{project.taskCount || 0}</p>
                  </div>
                  <div className="p-6 bg-black dark:bg-white text-white dark:text-black rounded-[2.5rem] space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Status</p>
                    <p className="text-xs font-black uppercase truncate">{project.status}</p>
                  </div>
               </div>
            </motion.div>
         ))}
      </div>

      {projects.length === 0 && (
         <div className="text-center py-40 bg-gray-50 dark:bg-zinc-900 shadow-inner rounded-[4rem] border-2 border-dashed border-black/5 dark:border-white/5 space-y-6">
            <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
               <Zap className="w-10 h-10 text-orange-500 opacity-20" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 italic serif text-xl font-medium max-w-sm mx-auto">
              No active projects identified. Start a wizard to map out your next venture.
            </p>
         </div>
      )}

      {/* Project Creation Wizard */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/40">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 30 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 30 }}
               className="bg-white dark:bg-zinc-950 w-full max-w-2xl min-h-[600px] rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden text-black dark:text-white"
             >
                {/* Progress Bar */}
                <div className="h-2 w-full bg-gray-100 flex">
                   {[1, 2, 3, 4].map(i => (
                     <div key={i} className={cn("flex-1 transition-all duration-500", step >= i ? "bg-orange-500" : "bg-transparent")} />
                   ))}
                </div>

                <button 
                  onClick={() => setShowWizard(false)}
                  className="absolute top-8 right-8 p-3 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>

                <div className="flex-1 p-12 md:p-20 overflow-y-auto">
                   <AnimatePresence mode="wait">
                      {step === 1 && (
                        <motion.div 
                          key="step1" 
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          className="space-y-8"
                        >
                           <div className="space-y-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Step 01 / Basic Identity</span>
                              <h3 className="text-5xl font-black italic serif tracking-tight">Name your venture.</h3>
                              <p className="text-gray-400 font-medium">Every great initiative starts with a clear, inspiring title.</p>
                           </div>
                           <div className="space-y-8">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Project Title</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. Mshamba Agri-Biz Hub"
                                  value={formData.title}
                                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                                  className="w-full bg-gray-50 p-8 rounded-[2.5rem] border border-black/5 outline-none focus:border-black transition-all font-bold text-lg dark:bg-zinc-900"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">High-Level description</label>
                                <textarea 
                                  placeholder="What are we building exactly?"
                                  value={formData.description}
                                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                                  className="w-full bg-gray-50 p-8 rounded-[2.5rem] border border-black/5 outline-none focus:border-black transition-all font-medium text-sm h-32 dark:bg-zinc-900"
                                />
                             </div>
                           </div>
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div 
                          key="step2" 
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          className="space-y-8"
                        >
                           <div className="space-y-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Step 02 / Goals & Category</span>
                              <h3 className="text-5xl font-black italic serif tracking-tight">Focus & Objectives.</h3>
                           </div>
                           <div className="space-y-6">
                              <div className="grid grid-cols-3 gap-3">
                                {CATEGORIES.map(cat => (
                                  <button 
                                    key={cat.id}
                                    onClick={() => setFormData({ ...formData, category: cat.id })}
                                    className={cn(
                                      "p-6 rounded-3xl border flex flex-col items-center gap-3 transition-all",
                                      formData.category === cat.id 
                                        ? "bg-black text-white dark:bg-white dark:text-black border-black shadow-xl scale-105" 
                                        : "bg-white dark:bg-zinc-900 border-black/5 text-gray-400 hover:border-black/20"
                                    )}
                                  >
                                    <span className="text-2xl">{cat.icon}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-center">{cat.id}</span>
                                  </button>
                                ))}
                              </div>
                              <div className="space-y-2 pt-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Strategic Objective</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. To increase group income by 40% via transport."
                                  value={formData.objective}
                                  onChange={e => setFormData({ ...formData, objective: e.target.value })}
                                  className="w-full bg-gray-50 p-6 rounded-[2rem] border border-black/5 outline-none dark:bg-zinc-900"
                                />
                             </div>
                           </div>
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div 
                          key="step3" 
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          className="space-y-8"
                        >
                           <div className="space-y-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Step 03 / Economics & Time</span>
                              <h3 className="text-5xl font-black italic serif tracking-tight">The Engine Room.</h3>
                           </div>
                           <div className="space-y-8">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Operating Budget (KES)</label>
                                <div className="relative">
                                   <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-8 h-8" />
                                   <input 
                                      type="number" 
                                      value={formData.budget === 0 ? '' : formData.budget}
                                      onChange={e => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                                      className="w-full bg-gray-50 pl-20 p-8 rounded-[2.5rem] border border-black/5 outline-none font-black italic serif text-3xl dark:bg-zinc-900"
                                   />
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Start At</label>
                                   <input 
                                      type="date" 
                                      value={formData.startDate}
                                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                      className="w-full bg-gray-50 p-6 rounded-[2rem] border border-black/5 outline-none font-bold text-xs dark:bg-zinc-900"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Target Finish</label>
                                   <input 
                                      type="date" 
                                      value={formData.targetDate}
                                      onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                                      className="w-full bg-gray-50 p-6 rounded-[2rem] border border-black/5 outline-none font-bold text-xs dark:bg-zinc-900"
                                   />
                                </div>
                             </div>
                           </div>
                        </motion.div>
                      )}

                      {step === 4 && (
                        <motion.div 
                          key="step4" 
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          className="space-y-8"
                        >
                           <div className="space-y-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Step 04 / Confirmation</span>
                              <h3 className="text-5xl font-black italic serif tracking-tight">Ready for lift-off?</h3>
                           </div>
                           <div className="p-10 bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border border-black/5 space-y-6">
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Final Verification</p>
                                 <h4 className="text-3xl font-black italic serif text-orange-500">{formData.title}</h4>
                                 <p className="text-sm font-medium mt-2">{formData.description}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-black/5">
                                 <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Budget Allocation</p>
                                    <p className="text-xl font-black italic serif">KES {formData.budget.toLocaleString()}</p>
                                 </div>
                                 <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Operational Sector</p>
                                    <p className="text-xl font-black italic serif">{formData.category}</p>
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                      )}
                   </AnimatePresence>
                </div>

                <div className="p-10 border-t border-black/5 flex items-center justify-between gap-4">
                   {step > 1 && (
                      <button 
                        onClick={() => setStep(step - 1)}
                        className="px-10 py-5 bg-gray-100 dark:bg-zinc-900 text-gray-500 rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all hover:bg-gray-200"
                      >
                        Back
                      </button>
                   )}
                   <button 
                     onClick={() => step === 4 ? handleCreateProject() : setStep(step + 1)}
                     disabled={step === 1 && !formData.title}
                     className="flex-1 py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                   >
                     {step === 4 ? 'Initiate Project' : 'Continue'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
