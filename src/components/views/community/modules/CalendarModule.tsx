import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  MoreVertical,
  CheckCircle2,
  Bell,
  Users
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';

export default function CommunityCalendarModule({ community, user }: { community: any, user: User }) {
  const [events, setEvents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [rsvps, setRsvps] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const q = query(
      collection(db, 'communities', community.id, 'events'),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const eventData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(eventData);

      // Setup RSVP listeners for each event
      eventData.forEach(ev => {
        onSnapshot(collection(db, 'communities', community.id, 'events', ev.id, 'rsvps'), (rsvpSnap) => {
          setRsvps(prev => ({
            ...prev,
            [ev.id]: rsvpSnap.docs.map(d => d.id)
          }));
        });
      });
    });
    return () => unsub();
  }, [community.id]);

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    await addDoc(collection(db, 'communities', community.id, 'events'), {
      title,
      date,
      location: location || 'Remote / Online',
      creatorId: user.uid,
      createdAt: serverTimestamp()
    });

    setTitle('');
    setDate('');
    setLocation('');
    setShowAdd(false);
    toast.success("Event scheduled on community calendar.");
  };

  const handleRSVP = async (eventId: string) => {
    const isAttending = rsvps[eventId]?.includes(user.uid);
    const rsvpRef = doc(db, 'communities', community.id, 'events', eventId, 'rsvps', user.uid);

    if (isAttending) {
      await deleteDoc(rsvpRef);
      toast.info("RSVP cancelled.");
    } else {
      await setDoc(rsvpRef, {
        userId: user.uid,
        userEmail: user.email,
        timestamp: serverTimestamp()
      });
      toast.success("RSVP confirmed!");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h2 className="text-xl font-bold italic serif flex items-center gap-2">
               <CalendarIcon className="w-6 h-6 text-purple-500" /> Event Schedule
            </h2>
            <p className="text-gray-400 text-xs font-medium mt-1">Coordination layer for {community.name} meetings.</p>
         </div>
         <button 
           onClick={() => setShowAdd(true)}
           className="px-6 py-2 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
         >
            <Plus className="w-4 h-4" /> Schedule Event
         </button>
      </div>

      <div className="space-y-4">
         {events.map((ev, i) => {
           const attending = rsvps[ev.id]?.includes(user.uid);
           const attendeeCount = rsvps[ev.id]?.length || 0;

           return (
             <div key={ev.id || i} className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm flex flex-col md:flex-row md:items-center gap-6 group hover:border-purple-200 transition-all">
                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl w-16 h-16 shrink-0 group-hover:bg-purple-50 transition-colors">
                   <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-purple-400">
                     {new Date(ev.date).toLocaleString('default', { month: 'short' })}
                   </p>
                   <p className="text-xl font-black">{new Date(ev.date).getDate()}</p>
                </div>
                
                <div className="flex-1">
                   <h4 className="font-bold text-lg">{ev.title}</h4>
                   <div className="flex flex-wrap items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                         <Clock className="w-3.5 h-3.5" />
                         {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                         <MapPin className="w-3.5 h-3.5" />
                         {ev.location}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold">
                         <Users className="w-3.5 h-3.5" />
                         {attendeeCount} Attending
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleRSVP(ev.id)}
                     className={cn(
                       "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                       attending ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" : "bg-gray-50 text-gray-500 border border-black/5 hover:bg-black hover:text-white"
                     )}
                   >
                      {attending ? 'Attending ✓' : 'RSVP'}
                   </button>
                   <button className="p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-400">
                      <Bell className="w-4 h-4" />
                   </button>
                </div>
             </div>
           );
         })}

         {events.length === 0 && (
           <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-black/5 border-dashed">
              <p className="text-sm font-bold text-gray-400 italic">No upcoming events scheduled.</p>
           </div>
         )}
      </div>

      {showAdd && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
               <h3 className="text-2xl font-black serif italic mb-8">Schedule Event</h3>
               <form onSubmit={addEvent} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Event Title</label>
                     <input 
                       type="text" 
                       required 
                       value={title}
                       onChange={e => setTitle(e.target.value)}
                       placeholder="e.g. Monthly Review" 
                       className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 font-bold min-w-0 outline-none focus:ring-2 focus:ring-purple-100"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Date & Time</label>
                     <input 
                       type="datetime-local" 
                       required 
                       value={date}
                       onChange={e => setDate(e.target.value)}
                       className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-sm font-medium outline-none"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Location</label>
                     <input 
                       type="text" 
                       value={location}
                       onChange={e => setLocation(e.target.value)}
                       placeholder="e.g. Community Center" 
                       className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-sm font-medium outline-none"
                     />
                  </div>
                  <div className="flex gap-4 pt-4">
                     <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-[10px]">
                        Cancel
                     </button>
                     <button type="submit" className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-purple-600/20 active:scale-95 transition-all">
                        Schedule
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
