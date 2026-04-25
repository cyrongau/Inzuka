import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  getDocs,
  limit,
  orderBy
} from 'firebase/firestore';
import { 
  format, 
  differenceInDays, 
  parseISO, 
  isSameDay, 
  subDays, 
  addDays,
  differenceInHours,
  isAfter,
  startOfDay
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Zap, X, Calendar as CalendarIcon, Target } from 'lucide-react';
import { showToast } from '../services/notificationService';

export default function ScheduledNotifications({ user, profile }: { user: any, profile: any }) {
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!user || !familyId) return;

    // Load already notified from localStorage to avoid spamming same session
    const stored = localStorage.getItem(`notified_ids_${user.uid}`);
    if (stored) {
      setNotifiedIds(new Set(JSON.parse(stored)));
    }

    const checkEvents = async () => {
      const q = query(collection(db, 'events'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const now = new Date();
      
      events.forEach((event: any) => {
        const eventDate = parseISO(event.date);
        const daysDiff = differenceInDays(eventDate, now);
        const hoursDiff = differenceInHours(eventDate, now);

        // 24 Hour Critical Buzz (Full Screen)
        if (hoursDiff >= 0 && hoursDiff <= 24) {
          triggerAlert(event.id, 'critical', {
            title: 'IMMINENT EVENT',
            message: `${event.title} is occurring within 24 hours!`,
            type: 'buzz',
            event
          });
        }
        // 3 Day Prep
        else if (daysDiff === 3) {
          triggerAlert(event.id, 'prep', {
            title: '3-Day Countdown',
            message: `Time to finalize preparations for ${event.title}.`,
            type: 'prep',
            event
          });
        }
        // 1 Week Strategy
        else if (daysDiff === 7) {
          triggerAlert(event.id, 'strategy', {
            title: '1-Week Warning',
            message: `Strategy check: ${event.title} is next week.`,
            type: 'strategy',
            event
          });
        }
      });
    };

    const checkHabits = async () => {
      const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const now = new Date();
      habits.forEach((habit: any) => {
        if (habit.lastUpdated) {
          const lastUpdate = habit.lastUpdated.toDate ? habit.lastUpdated.toDate() : new Date(habit.lastUpdated);
          const hours = differenceInHours(now, lastUpdate);
          
          if (hours > 24 && hours < 48) {
             triggerAlert(`${habit.id}_streak`, 'habit', {
               title: 'Keep the Streak!',
               message: `You haven't updated your "${habit.name}" habit today. Keep pushing!`,
               type: 'habit'
             });
          } else if (hours >= 72) {
             triggerAlert(`${habit.id}_abandoned`, 'abandoned', {
               title: 'Abandoned Target?',
               message: `Your "${habit.name}" habit has been quiet for 3 days. Ready to restart?`,
               type: 'abandoned'
             });
          }
        }
      });
    };

    const checkTasks = async () => {
       const q = query(collection(db, 'growthTasks'), where('familyId', '==', familyId));
       const snap = await getDocs(q);
       const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

       const now = new Date();
       tasks.forEach((task: any) => {
         if (!task.isCompleted && task.createdAt) {
           const created = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
           const days = differenceInDays(now, created);
           
           if (days >= 3) {
              triggerAlert(`${task.id}_stale`, 'task', {
                title: 'Stale Growth Task',
                message: `The mission "${task.title}" has been active for ${days} days without progress.`,
                type: 'stale'
              });
           }
         }
       });
    };

    // Run checks
    checkEvents();
    checkHabits();
    checkTasks();

    // Check every hour
    const interval = setInterval(() => {
      checkEvents();
      checkHabits();
      checkTasks();
    }, 3600000);

    return () => clearInterval(interval);
  }, [user?.uid, familyId]);

  const triggerAlert = (id: string, group: string, data: any) => {
    const uniqueId = `${id}_${group}_${format(new Date(), 'yyyyMMdd')}`;
    
    // Check both state and localStorage to be doubly sure
    const stored = localStorage.getItem(`notified_ids_${user.uid}`);
    const currentNotified = stored ? new Set(JSON.parse(stored)) : notifiedIds;

    if (currentNotified.has(uniqueId)) return;

    if (data.type === 'buzz') {
      setActiveAlert(data);
      // Play alert sound for buzz
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Audio playback failed", e));
      } catch (e) {
        console.warn("Could not play alert sound", e);
      }
    } else {
      showToast('info', { title: data.title, message: data.message });
    }

    setNotifiedIds(prev => {
      const next = new Set(prev).add(uniqueId);
      localStorage.setItem(`notified_ids_${user.uid}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  if (!activeAlert) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-600/95 backdrop-blur-xl p-10 overflow-hidden"
      >
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, -1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.1 }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] opacity-20"
        />

        <div className="relative z-10 max-w-2xl w-full text-center space-y-12">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                boxShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 50px rgba(255,255,255,0.5)", "0 0 0px rgba(255,255,255,0)"]
              }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-32 h-32 bg-white rounded-full mx-auto flex items-center justify-center"
            >
              <Zap className="w-16 h-16 text-blue-600 fill-current" />
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-6xl font-black italic serif text-white tracking-tighter uppercase">CRITICAL BUZZ</h1>
              <p className="text-xl text-blue-100 font-bold uppercase tracking-[0.3em]">{activeAlert.title}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-10 rounded-[3rem] border border-white/20 space-y-6">
               <h2 className="text-3xl font-bold text-white">{activeAlert.event?.title || activeAlert.title}</h2>
               <p className="text-blue-100 text-lg leading-relaxed">{activeAlert.message}</p>
               {activeAlert.event && (
                 <div className="flex items-center justify-center gap-8 pt-4">
                    <div className="flex flex-col items-center gap-1">
                       <CalendarIcon className="w-6 h-6 text-white/60" />
                       <span className="text-xs font-black text-white">{format(parseISO(activeAlert.event.date), 'MMM d, yyyy')}</span>
                    </div>
                    {activeAlert.event.venue && (
                       <div className="flex flex-col items-center gap-1">
                          <AlertTriangle className="w-6 h-6 text-white/60" />
                          <span className="text-xs font-black text-white">{activeAlert.event.venue}</span>
                       </div>
                    )}
                 </div>
               )}
            </div>

            <button 
              onClick={() => setActiveAlert(null)}
              className="w-full bg-white text-blue-600 py-8 rounded-[2rem] font-black italic serif text-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              Acknowledge & Sync
            </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
