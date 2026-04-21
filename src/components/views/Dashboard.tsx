import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  TrendingUp, 
  ShoppingCart, 
  CheckSquare, 
  Utensils, 
  Activity,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  Zap,
  Award,
  Calendar as CalendarIcon,
  ChevronRight,
  Star,
  ShieldCheck,
  X // <--- add X
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, limit, orderBy, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { format, parseISO, isAfter } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard({ user, profile }: { user: User, profile: any }) {
  const [myChores, setMyChores] = useState<any[]>([]);
  const [myHabits, setMyHabits] = useState<any[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [growthTasks, setGrowthTasks] = useState<any[]>([]);
  const [family, setFamily] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  
  const [latestNotice, setLatestNotice] = useState<any>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeText, setNoticeText] = useState('');

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) return;

    // Growth Tasks
    const gTQ = query(collection(db, 'growthTasks'), where('familyId', '==', familyId), where('isCompleted', '==', false), limit(3));
    const unsubGT = onSnapshot(gTQ, (snap) => {
      setGrowthTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // My Chores (Assigned to me or unassigned within family)
    const baseQuery = familyId 
      ? query(collection(db, 'chores'), where('familyId', '==', familyId))
      : query(collection(db, 'chores'), where('assignedToUserId', '==', user.uid));

    const unsubscribeChores = onSnapshot(baseQuery, (snapshot) => {
      const allChores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter for showing to the specific user (assigned or unassigned)
      setMyChores(allChores.filter((c: any) => c.assignedToUserId === user.uid || c.assignedToUserId === '').slice(0, 5));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chores'));

    // My Habits (Usually personal)
    const habitsQ = query(
      collection(db, 'habits'),
      where('userId', '==', user.uid),
      limit(4)
    );
    const unsubscribeHabits = onSnapshot(habitsQ, (snapshot) => {
      setMyHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'habits'));

    // Shopping list count (within family)
    if (familyId) {
      // Fetch Family Name and Members
      getDoc(doc(db, 'families', familyId)).then(s => {
        if (s.exists()) setFamily(s.data());
      });

      const membersQ = query(collection(db, 'users'), where('familyId', '==', familyId));
      const unsubMembers = onSnapshot(membersQ, (snap) => {
        setFamilyMembers(snap.docs.map(d => d.data()));
      });

      // Fetch Upcoming Events
      const eventsQ = query(
        collection(db, 'events'), 
        where('familyId', '==', familyId),
        orderBy('date', 'asc'),
        limit(5)
      );
      const unsubEvents = onSnapshot(eventsQ, (snap) => {
        setUpcomingEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(e => {
          try {
            return isAfter(parseISO(e.date), new Date());
          } catch(err) {
            return false;
          }
        }));
      });

      const shoppingQ = query(collection(db, 'shoppingLists'), where('familyId', '==', familyId));
      const unsubscribeShopping = onSnapshot(shoppingQ, (snapshot) => {
        let total = 0;
        snapshot.docs.forEach(doc => {
          total += (doc.data().items || []).filter((i:any) => !i.bought).length;
        });
        setShoppingCount(total);
      });

      const noticeQ = query(
        collection(db, 'notices'), 
        where('familyId', '==', familyId)
      );
      const unsubNotice = onSnapshot(noticeQ, (snap) => {
        if (!snap.empty) {
          const noticesList = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          // Sort locally to avoid composite index requirements
          noticesList.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
            return timeB - timeA;
          });
          setLatestNotice(noticesList[0]);
        } else {
          setLatestNotice(null);
        }
      }, (error) => {
        console.error("Notice error:", error);
      });

      return () => {
        unsubGT();
        unsubscribeChores();
        unsubscribeHabits();
        unsubscribeShopping();
        unsubEvents();
        unsubNotice();
        unsubMembers();
      };
    }

    return () => {
      unsubscribeChores();
      unsubscribeHabits();
    };
  }, [user.uid, familyId]);

  const stats = [
    { label: 'Growth XP', value: '2,450 XP', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Weekly Spending', value: 'KES --', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Shopping List', value: `${shoppingCount} items`, icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Tasks Today', value: `${myChores.filter(c => c.completed).length}/${myChores.length}`, icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const handlePostNotice = async () => {
    if (!noticeText.trim() || !familyId) return;
    try {
      await addDoc(collection(db, 'notices'), {
        text: noticeText,
        author: profile?.displayName || user.displayName || 'Family Member',
        authorId: user.uid,
        familyId,
        createdAt: serverTimestamp()
      });
      setShowNoticeModal(false);
      setNoticeText('');
    } catch (e) {
      console.error(e);
      handleFirestoreError(e as any, OperationType.CREATE, 'notices');
    }
  };

  const today = new Date();
  const currentMonthIdx = today.getMonth();
  const currentDay = today.getDate();

  const birthdayMonthMembers = familyMembers.filter(m => {
    if (!m.dateOfBirth) return false;
    try { return parseISO(m.dateOfBirth).getMonth() === currentMonthIdx; } catch(e) { return false; }
  });

  const birthdayTodayMembers = birthdayMonthMembers.filter(m => {
     try { return parseISO(m.dateOfBirth).getDate() === currentDay; } catch(e) { return false; }
  });

  return (
    <div className="space-y-8">
      {/* Birthday Day Banner (Confetti/Balloons) */}
      <AnimatePresence>
        {birthdayTodayMembers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>
            {/* CSS-based simple Confetti particles */}
            <div className="absolute -top-10 left-[10%] w-3 h-3 bg-yellow-300 rounded-sm rotate-45 animate-bounce"></div>
            <div className="absolute top-[20%] right-[15%] w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-[20%] left-[30%] w-3 h-5 bg-blue-300 rounded-sm rotate-12 animate-bounce flex items-center justify-center text-[10px]">🎈</div>
            <div className="absolute inset-0 flex items-center justify-around opacity-20 pointer-events-none">
               <span className="text-6xl filter blur-[2px]">🎈</span>
               <span className="text-8xl filter blur-[4px]">⭐</span>
               <span className="text-5xl filter blur-[1px]">🎉</span>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-center text-center max-w-2xl mx-auto">
               <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/30 text-white text-4xl shadow-xl">
                 🎂
               </div>
               <div>
                 <h2 className="text-3xl md:text-5xl font-black italic serif text-white tracking-tighter drop-shadow-md">Happy Birthday!</h2>
                 <p className="text-white/90 text-lg md:text-xl font-medium mt-2">
                   Celebrate with <span className="font-bold underline decoration-white/50">{birthdayTodayMembers.map(m => m.displayName).join(' & ')}</span> today!
                 </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Birthday Month Notice if not already today */}
      {birthdayMonthMembers.length > 0 && birthdayTodayMembers.length === 0 && (
         <div className="bg-gradient-to-r from-orange-100 to-pink-50 p-6 rounded-[2rem] border border-orange-200/50 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
               <Star className="w-6 h-6 text-orange-500" />
            </div>
            <div>
               <h4 className="text-orange-950 font-bold">Birthday Month</h4>
               <p className="text-sm font-medium text-orange-800/70">It's {birthdayMonthMembers.map(m => m.displayName).join(' & ')}'s birthday month! Time to start planning. 🎉</p>
            </div>
         </div>
      )}

      {/* Family Banner */}
      <div className="relative group">
        <div 
          className="h-64 md:h-80 bg-gray-900 rounded-[3rem] overflow-hidden relative flex flex-col justify-end p-8 md:p-12 shadow-2xl"
          style={{
            backgroundImage: family?.dashboardBannerUrl ? `url(${family.dashboardBannerUrl})` : `url(https://picsum.photos/seed/${familyId}/1200/400)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="relative z-10 space-y-4">
             <div className="space-y-1">
                <h1 className="text-4xl md:text-6xl font-black italic serif text-white tracking-tighter leading-none animate-in slide-in-from-left-4 duration-500">
                  Welcome to the {family?.name || 'Home'}
                </h1>
                <div className="flex items-center gap-4 text-white/70 font-medium">
                  <p className="text-xl italic serif">{user.displayName}</p>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                    <ShieldCheck className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{profile?.familyRole || 'Resident'}</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-semibold tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-black/5 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold flex items-center gap-2 italic serif text-black dark:text-white">
                <Activity className="w-5 h-5" /> My Schedule
              </h3>
              <button className="text-sm font-medium text-black dark:text-white hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {myChores.length === 0 ? (
                <div className="p-10 text-center opacity-20 italic">No tasks assigned to you tonight</div>
              ) : myChores.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-5 rounded-[1.5rem] border border-black/[0.03] dark:border-white/[0.05] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.completed ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-gray-500'}`}>
                      {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className={cn("font-bold text-lg", task.completed && "line-through text-gray-400")}>{task.title}</p>
                      <p className="text-xs text-gray-400 uppercase font-black tracking-widest">{task.category} • {task.dueTime || 'Anytime'}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${task.completed ? 'bg-green-50 text-green-600' : 'bg-black text-white'}`}>
                    {task.completed ? 'Done' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black dark:bg-black text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-2xl font-medium mb-3 italic serif">Family Notice Board</h3>
              {latestNotice ? (
                <>
                  <p className="text-gray-300 mb-2 font-medium text-sm leading-relaxed p-4 bg-white/5 rounded-2xl border border-white/10">"{latestNotice.text}"</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8 text-right pr-4">- {latestNotice.author}</p>
                </>
              ) : (
                <p className="text-gray-400 mb-8 max-w-xs font-light text-sm">Welcome to Inzuka. Use this dashboard to track your personal tasks and family routines.</p>
              )}
              <button onClick={() => setShowNoticeModal(true)} className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform active:scale-100 mt-auto">
                Post Update <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-700"></div>
          </div>
        </div>

        {/* Side Column: Habits */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-black/5 dark:border-white/5 shadow-sm">
            <h3 className="text-lg font-bold mb-6 italic serif">My Daily Habits</h3>
            <div className="space-y-6">
              {myHabits.length === 0 ? (
                <div className="text-center py-10 opacity-20 text-sm">No habits being tracked</div>
              ) : myHabits.map((habit) => {
                const totalDays = habit.completedDates?.length || 0;
                // Just for display mock progress
                const progress = Math.min(100, (totalDays / 7) * 100); 
                return (
                  <div key={habit.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-gray-900 dark:text-gray-100">{habit.name}</span>
                      <span className="text-orange-500">{totalDays}d Streak</span>
                    </div>
                    <div className="h-2 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden border border-black/[0.02]">
                      <div 
                        className="h-full bg-black dark:bg-white transition-all duration-1000" 
                        style={{ width: `${Math.max(5, progress)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-[2.5rem] p-8">
              <h3 className="text-orange-900 dark:text-orange-500 font-bold mb-2 uppercase text-[10px] tracking-widest">Pro Tip</h3>
              <p className="text-orange-800/70 dark:text-orange-200/70 text-sm leading-relaxed font-medium italic">
                "Consistency is the key to building lasting habits. Start small, win big."
              </p>
            </div>

            {/* Calendar Widget */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-black/5 dark:border-white/5 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold italic serif">Coming Up</h3>
                  <CalendarIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
               </div>
               <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-6 opacity-20 text-xs italic">No major plans this month</div>
                  ) : upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-4 group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-2xl transition-all">
                       <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center shrink-0 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{format(parseISO(event.date), 'MMM')}</span>
                          <span className="text-lg font-black italic serif">{format(parseISO(event.date), 'd')}</span>
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{event.title}</p>
                          <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest">{event.type}</p>
                       </div>
                       <ChevronRight className="w-3 h-3 text-gray-200 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white transition-all" />
                    </div>
                  ))}
               </div>
               <button className="w-full mt-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center gap-2">
                 View Full Calendar <ChevronRight className="w-3 h-3" />
               </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showNoticeModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40 dark:bg-black/80"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative border border-black/5 dark:border-white/5"
              >
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-bold italic serif">Post Update</h3>
                   <button 
                     onClick={() => setShowNoticeModal(false)}
                     className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white rounded-full transition-all"
                   >
                     <X className="w-5 h-5" />
                   </button>
                </div>
                <div className="space-y-4">
                  <textarea 
                    placeholder="Share something with the family..."
                    value={noticeText}
                    onChange={e => setNoticeText(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 p-5 rounded-2xl font-medium min-h-[120px] focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 outline-none leading-relaxed"
                  />
                  <button 
                    onClick={handlePostNotice}
                    disabled={!noticeText.trim()}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Broadcast
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
