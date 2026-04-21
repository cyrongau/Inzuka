import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  Check, 
  Flame, 
  Clock, 
  Sparkles,
  BookOpen,
  GraduationCap,
  Trophy,
  Activity,
  Heart,
  Brain,
  Star as StarIcon,
  ChevronRight,
  Target,
  Users,
  Book,
  Music,
  Palette,
  Atom,
  Languages,
  CheckCircle2,
  Circle,
  Award,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, increment, serverTimestamp, orderBy } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { generateEducationalContent, generateGrowthTasks } from '../../services/growthHubService';
import { showToast, triggerSystemNotification } from '../../services/notificationService';

export default function GrowthHub({ user, profile }: { user: User, profile: any }) {
  const [activeView, setActiveView] = useState<'wellness' | 'education' | 'tasks'>('wellness');
  const [habits, setHabits] = useState<any[]>([]);
  const [growthTasks, setGrowthTasks] = useState<any[]>([]);
  const [educationContent, setEducationContent] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // New Goal Form
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState(10);
  const [goalUnit, setGoalUnit] = useState('Miles');


  // Parent/Child detection
  const isParent = ['Father', 'Mother', 'Guardian'].includes(profile?.familyRole || '');
  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) return;

    // Fetch family members to identify children
    const qMembers = query(collection(db, 'users'), where('familyId', '==', familyId));
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      const members = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const children = members.filter(m => !['Father', 'Mother', 'Guardian'].includes(m.familyRole || ''));
      setFamilyMembers(children);
      if (children.length > 0 && !selectedChildId) {
        setSelectedChildId(children[0].id);
      }
    });

    // Listen to habits (milestone based now)
    const hQ = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const hUnsub = onSnapshot(hQ, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to growth tasks for this family
    const tQ = query(collection(db, 'growthTasks'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
    const tUnsub = onSnapshot(tQ, (snap) => {
      setGrowthTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to education content
    const eQ = query(collection(db, 'educationContent'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
    const eUnsub = onSnapshot(eQ, (snap) => {
      setEducationContent(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to achievements
    const aQ = query(collection(db, 'achievements'), where('userId', '==', user.uid));
    const aUnsub = onSnapshot(aQ, (snap) => {
      setAchievements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubMembers();
      hUnsub();
      tUnsub();
      eUnsub();
      aUnsub();
    };
  }, [familyId, user.uid]);

  const updateHabitProgress = async (habitId: string, amount: number) => {
    try {
      await updateDoc(doc(db, 'habits', habitId), {
        currentValue: increment(amount),
        lastUpdated: serverTimestamp()
      });
      showToast('success', { title: 'Progress Tracked', message: 'One step closer to your milestone.' });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'habits');
    }
  };

  const createGoal = async () => {
    if (!goalName) return;
    try {
      await addDoc(collection(db, 'habits'), {
        userId: user.uid,
        familyId,
        name: goalName,
        targetValue: goalTarget,
        currentValue: 0,
        unit: goalUnit,
        type: 'milestone',
        streak: 0,
        createdAt: serverTimestamp()
      });
      setShowAddGoal(false);
      setGoalName('');
      showToast('success', { title: 'Milestone Set', message: `Goal: ${goalTarget} ${goalUnit} added.` });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'habits');
    }
  };

  const completeGrowthTask = async (taskId: string, points: number, taskTitle: string) => {
    try {
      await updateDoc(doc(db, 'growthTasks', taskId), {
        isCompleted: true,
        completedAt: serverTimestamp(),
        status: 'submitted'
      });

      // Notify parent
      const parentQuery = query(
        collection(db, 'users'), 
        where('familyId', '==', familyId), 
        where('familyRole', 'in', ['Father', 'Mother', 'Guardian'])
      );
      
      onSnapshot(parentQuery, (snap) => {
        snap.docs.forEach(parentDoc => {
          triggerSystemNotification({
            userId: parentDoc.id,
            type: 'push',
            title: 'Task Submission',
            body: `${profile?.displayName || 'Child'} has completed: ${taskTitle}. Review required.`,
            metadata: { taskId, childId: user.uid }
          });
        });
      }, { once: true } as any);

      showToast('success', { title: 'Goal Achieved!', message: `You earned ${points} XP. Parent notified.` });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'growthTasks');
    }
  };

  const handleGenerateContent = async (category: string) => {
    if (!familyId || !selectedChildId) {
      showToast('error', { title: 'Error', message: 'Please select a child first.' });
      return;
    }
    setIsGenerating(true);
    try {
      await generateEducationalContent(selectedChildId, category, familyId);
      showToast('success', { title: 'Intelligence Synced', message: `New ${category} modules prepared.` });
      setActiveView('education');
    } catch (e: any) {
      console.error('Synthesis Error:', e);
      showToast('error', { title: 'Synthesis Error', message: e.message || 'Failed to generate academic content.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIAssignTasks = async () => {
    if (!familyId || !selectedChildId) {
      showToast('error', { title: 'Error', message: 'Please select a child first.' });
      return;
    }
    setIsGenerating(true);
    try {
      await generateGrowthTasks(selectedChildId, familyId, user.uid);
      showToast('success', { title: 'Tasks Deployed', message: 'AI Suggested growth milestones have been assigned.' });
      setActiveView('tasks');
    } catch (e: any) {
      console.error('Task Allocation Error:', e);
      showToast('error', { title: 'Task Error', message: e.message || 'Failed to deploy AI tasks.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-3xl font-light italic serif tracking-tight text-black dark:text-white">Growth Hub</h1>
          </div>
          <p className="text-gray-400 dark:text-gray-500 font-medium text-sm">Domestic excellence & cognitive development center.</p>
        </div>

        {isParent && familyMembers.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Target Child:</p>
            <select 
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="bg-gray-50 dark:bg-zinc-800 text-black dark:text-white border-none text-xs font-bold rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
            >
              {familyMembers.map(child => (
                <option key={child.id} value={child.id}>{child.displayName} (Age: {child.age || '?'})</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          {[
            { id: 'wellness', label: 'Wellness & Habits', icon: Activity },
            { id: 'education', label: 'Academic Center', icon: GraduationCap },
            { id: 'tasks', label: 'Training Tasks', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeView === tab.id ? "bg-black dark:bg-white text-white dark:text-black shadow-lg" : "text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {activeView === 'wellness' && (
              <motion.div 
                key="wellness"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Personal Milestones</h3>
                  <button 
                    onClick={() => setShowAddGoal(!showAddGoal)}
                    className="text-[10px] font-bold text-blue-500 hover:underline"
                  >
                    {showAddGoal ? 'Cancel' : 'Set New Milestone'}
                  </button>
                </div>

                <AnimatePresence>
                  {showAddGoal && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-inner space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                          placeholder="Goal Name (e.g. 10 Mile Walk)"
                          value={goalName}
                          onChange={e => setGoalName(e.target.value)}
                          className="bg-gray-50 dark:bg-zinc-800 text-black dark:text-white p-4 rounded-xl text-sm font-bold border-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                        />
                        <input 
                          type="number"
                          placeholder="Target Value"
                          value={goalTarget}
                          onChange={e => setGoalTarget(Number(e.target.value))}
                          className="bg-gray-50 dark:bg-zinc-800 text-black dark:text-white p-4 rounded-xl text-sm font-bold border-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                        />
                        <input 
                          placeholder="Unit (Miles, Chapters, etc)"
                          value={goalUnit}
                          onChange={e => setGoalUnit(e.target.value)}
                          className="bg-gray-50 dark:bg-zinc-800 text-black dark:text-white p-4 rounded-xl text-sm font-bold border-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                        />
                      </div>
                      <button 
                        onClick={createGoal}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all"
                      >
                        Launch Milestone Track
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {habits.map((habit) => {
                    const dailyTarget = habit.targetValue / 7;
                    const isOverDaily = (habit.currentValue || 0) >= dailyTarget;

                    return (
                      <div key={habit.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center">
                            <Flame className={cn("w-5 h-5", isOverDaily ? "text-orange-500" : "text-gray-300 dark:text-gray-600")} />
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 text-[10px] font-black tracking-widest text-orange-500 uppercase">
                              <Flame className="w-3 h-3" />
                              <span>{habit.streak || 0} Day Streak</span>
                            </div>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">
                              Weekly: {habit.targetValue} {habit.unit}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold mb-1 text-black dark:text-white">{habit.name}</h4>
                        
                        <div className="space-y-3 mt-4">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-gray-400">Progression</span>
                            <span className="text-black dark:text-white">{habit.currentValue || 0} / {habit.targetValue} {habit.unit}</span>
                          </div>
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5 p-0.5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, ((habit.currentValue || 0) / (habit.targetValue || 1)) * 100)}%` }}
                              className="h-full bg-black dark:bg-white rounded-full shadow-lg shadow-black/20"
                            />
                          </div>
                          
                          {/* Daily Breakdown Split */}
                          <div className="grid grid-cols-7 gap-1 h-2 mt-2">
                            {[...Array(7)].map((_, i) => (
                              <div 
                                key={i} 
                                className={cn(
                                  "rounded-sm",
                                  (habit.currentValue || 0) >= (dailyTarget * (i + 1)) ? "bg-green-400" : "bg-gray-100 dark:bg-zinc-800"
                                )} 
                              />
                            ))}
                          </div>

                          <div className="flex gap-2 mt-4">
                            {[1, 5, 10].map((inc) => (
                              <button 
                                key={inc}
                                onClick={() => updateHabitProgress(habit.id, inc)}
                                className="flex-1 py-3 bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all active:scale-95"
                              >
                                +{inc}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                      <Activity className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-light italic serif mb-2">Resilience AI</h3>
                      <p className="text-blue-100 text-sm font-medium leading-relaxed max-w-md">
                        Based on your spending on health supplements and recent low activity signals, it's time for a 3-mile walk. This matches your weekly threshold.
                      </p>
                    </div>
                    <button className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                      Start Pursuit
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'education' && (
              <motion.div 
                key="education"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Learning Center</h3>
                  <div className="flex gap-2">
                     <button className="text-[10px] font-bold text-gray-400 hover:text-black">Library</button>
                     <span className="text-gray-200">|</span>
                     <button className="text-[10px] font-bold text-gray-400 hover:text-black">Progress</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {[
                    { id: 'math', label: 'Mathematics', icon: Atom, color: 'bg-indigo-100 text-indigo-600' },
                    { id: 'science', label: 'Science', icon: Brain, color: 'bg-green-100 text-green-600' },
                    { id: 'language', label: 'Language', icon: Languages, color: 'bg-orange-100 text-orange-600' },
                    { id: 'music', label: 'Music', icon: Music, color: 'bg-pink-100 text-pink-600' },
                    { id: 'bible', label: 'Bible Study', icon: Book, color: 'bg-blue-100 text-blue-600' },
                  ].map((sub) => (
                    <button 
                      key={sub.id}
                      onClick={() => {
                        if (!isParent) {
                          showToast('info', { title: 'Parent Permission Required', message: 'Only parents can generate new AI academic modules.' });
                          return;
                        }
                        handleGenerateContent(sub.label);
                      }}
                      disabled={isGenerating}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:shadow-lg transition-all group",
                        !isParent && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", sub.color)}>
                        <sub.icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-center">{sub.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {educationContent.length === 0 ? (
                    <div className="bg-white p-20 rounded-[2.5rem] border border-black/5 text-center flex flex-col items-center gap-4 opacity-50">
                      <BookOpen className="w-12 h-12 text-gray-300" />
                      <p className="text-lg italic font-light italic serif">No educational artifacts present.</p>
                      <p className="text-xs text-gray-400">Select a subject above to generate AI content.</p>
                    </div>
                  ) : educationContent.map((content) => (
                    <div key={content.id} className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm group hover:border-black/20 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold">{content.title}</h4>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Age: {content.ageRange} | {content.category}</p>
                          </div>
                        </div>
                        <button className="w-10 h-10 border border-black/5 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all text-gray-400">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="prose prose-sm font-medium text-gray-600 line-clamp-3">
                         {content.content}
                      </div>
                      <div className="mt-6 flex items-center justify-between pt-6 border-t border-black/5">
                        <div className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase tracking-widest">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Mastered Content</span>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline">Read Full Module</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeView === 'tasks' && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Training & Assignments</h3>
                  {isParent && (
                    <button 
                      onClick={() => setShowAddTask(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline"
                    >
                      Assign Mission
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {growthTasks.length === 0 ? (
                    <div className="bg-white p-20 rounded-[2.5rem] border border-black/5 text-center flex flex-col items-center gap-4 opacity-50">
                      <Target className="w-12 h-12 text-gray-300" />
                      <p className="text-lg italic font-light italic serif">Neutral growth status.</p>
                      <p className="text-xs text-gray-400">Deploy missions to track cognitive development.</p>
                    </div>
                  ) : growthTasks.map((task) => (
                    <div key={task.id} className={cn(
                      "bg-white p-6 rounded-3xl border border-black/5 flex items-center gap-6 transition-all",
                      task.isCompleted ? "opacity-50 grayscale border-green-200" : "hover:shadow-md"
                    )}>
                      <button 
                        onClick={() => !task.isCompleted && completeGrowthTask(task.id, task.points, task.title)}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                          task.isCompleted ? "bg-green-500 text-white" : "bg-gray-100 text-transparent hover:bg-black/5 hover:text-black border border-black/5"
                        )}
                      >
                        <Check className="w-6 h-6" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className={cn("font-bold text-lg truncate leading-tight", task.isCompleted && "line-through")}>
                            {task.title}
                          </h4>
                          <span className="bg-yellow-100 text-yellow-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            +{task.points} XP
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium line-clamp-1">{task.description}</p>
                      </div>
                      <div className="hidden md:flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">{task.category}</span>
                        <div className="flex -space-x-2">
                           {[1,2,3].map(i => (
                             <div key={i} className="w-5 h-5 rounded-full bg-gray-100 border border-white" />
                           ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Achievement Trophy Room */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Trophy Room</h3>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              {[
                { id: '1', icon: Flame, color: 'text-orange-500 bg-orange-100', label: '7-Day Streak' },
                { id: '2', icon: BookOpen, color: 'text-blue-500 bg-blue-100', label: 'Academic Pupil' },
                { id: '3', icon: Heart, color: 'text-red-500 bg-red-100', label: 'Kindness Heart' },
                { id: '4', icon: Brain, color: 'text-purple-500 bg-purple-100', label: 'Cognitive Giant' },
                { id: '5', icon: StarIcon, color: 'text-yellow-500 bg-yellow-100', label: 'Star Subject' },
                { id: '6', icon: Plus, color: 'text-gray-300 bg-gray-50 border-dashed border', label: 'Locked' },
              ].map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-3">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform hover:rotate-12", badge.color)}>
                    <badge.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-tighter text-center leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 p-5 bg-yellow-50 rounded-3xl border border-yellow-200">
              <div className="flex items-center gap-4">
                <Trophy className="w-10 h-10 text-yellow-600" />
                <div>
                  <h4 className="text-sm font-bold text-yellow-800">Grand Mastery</h4>
                  <p className="text-[10px] text-yellow-600 font-medium">920 XP to next tier</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick AI Assign (Parent Only) */}
          {isParent && (
            <div className="bg-black p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 italic">Command Node</h3>
              </div>
              <p className="text-sm font-light leading-relaxed text-gray-400">
                Deploy cognitive missions or etiquette training modules using generative intelligence.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => handleAIAssignTasks()}
                  disabled={isGenerating || !selectedChildId}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Suggest Tasks for Child
                </button>
                <button 
                  onClick={() => handleGenerateContent('Mathematics')}
                  disabled={isGenerating}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Generate Wellness Module
                </button>
              </div>
            </div>
          )}

          {/* User Rankings */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Family Rankings</h3>
             <div className="space-y-5">
               {[
                 { name: 'Ethan', points: 2450, rank: 1 },
                 { name: 'Sarah', points: 2100, rank: 2 },
                 { name: 'James', points: 1850, rank: 3 },
               ].map((rank) => (
                 <div key={rank.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black",
                       rank.rank === 1 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500"
                     )}>
                       {rank.rank}
                     </div>
                     <span className="font-bold text-sm text-black dark:text-white">{rank.name}</span>
                   </div>
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{rank.points} XP</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
