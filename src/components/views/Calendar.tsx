import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users as UsersIcon,
  DollarSign,
  Star,
  X,
  Camera,
  Bell,
  Trash2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
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
  getWeek,
  parseISO,
  isAfter,
  isBefore,
  addWeeks,
  subWeeks,
  startOfISOWeek,
  endOfISOWeek
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { showToast } from '../../services/notificationService';

interface Guest {
  name: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface Event {
  id: string;
  title: string;
  date: string;
  venue?: string;
  type: string;
  activities?: string;
  budget?: number;
  invitedGuests?: string[]; // Family member UIDs
  externalGuests?: Guest[]; // External people
  bannerURL?: string;
  familyId: string;
  createdAt: any;
  isTrip?: boolean; // New flag for trip integration
}

const handleImageUpload = (file: File, callback: (v: string) => void) => {
  const reader = new FileReader();
  reader.onloadend = () => callback(reader.result as string);
  reader.readAsDataURL(file);
};

export default function Calendar({ user, profile }: { user: User, profile: any }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);

  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const familyId = profile?.familyId;

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState('Birthday');
  const [venue, setVenue] = useState('');
  const [budget, setBudget] = useState('');
  const [bannerURL, setBannerURL] = useState('');
  const [activities, setActivities] = useState('');
  const [externalGuestName, setExternalGuestName] = useState('');
  const [externalGuestEmail, setExternalGuestEmail] = useState('');
  const [externalGuests, setExternalGuests] = useState<Guest[]>([]);

  useEffect(() => {
    if (!familyId) return;

    const q = query(collection(db, 'events'), where('familyId', '==', familyId));
    const unsubscribe = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'events'));

    const tripsQ = query(collection(db, 'trips'), where('familyId', '==', familyId));
    const unsubscribeTrips = onSnapshot(tripsQ, (snap) => {
      setTrips(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'trips'));

    const membersQ = query(collection(db, 'users'), where('familyId', '==', familyId));
    const unsubscribeMembers = onSnapshot(membersQ, (snap) => {
      setFamilyMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeTrips();
      unsubscribeMembers();
    };
  }, [familyId]);

  const allCalendarItems = [
    ...events,
    ...trips.map(t => ({
      id: t.id,
      title: `Vacation: ${t.title}`,
      date: t.startDate,
      venue: t.destination,
      type: 'Holiday',
      budget: t.budget,
      familyId: t.familyId,
      isTrip: true
    } as Event)),
    // Dynamically inject all family birthdays for the viewed year automatically
    ...familyMembers.filter(m => m.dateOfBirth).flatMap(m => {
      try {
        const bd = parseISO(m.dateOfBirth);
        // Project this birthday into the current viewing year and adjacent years
        const currentYear = currentMonth.getFullYear();
        return [-1, 0, 1].map(offset => {
          const projectedDate = new Date(currentYear + offset, bd.getMonth(), bd.getDate());
          return {
            id: `bday-${m.uid}-${currentYear + offset}`,
            title: `🎈 ${m.displayName}'s Birthday!`,
            date: format(projectedDate, 'yyyy-MM-dd'),
            type: 'Birthday',
            familyId: m.familyId,
            isTrip: false
          } as Event;
        });
      } catch(e) { return []; }
    })
  ].filter(Boolean);

  const handleSaveEvent = async () => {
    if (!title || !date || !familyId) return;
    try {
      if (editEventId) {
        await updateDoc(doc(db, 'events', editEventId), {
          title,
          date,
          type,
          venue,
          budget: Number(budget) || 0,
          bannerURL,
          activities,
          externalGuests
        });
        showToast('success', { title: 'Event Updated', message: `${title} has been updated.` });
      } else {
        await addDoc(collection(db, 'events'), {
          title,
          date,
          type,
          venue,
          budget: Number(budget) || 0,
          bannerURL,
          activities,
          externalGuests,
          familyId,
          createdAt: serverTimestamp()
        });
        showToast('success', { title: 'Event Created', message: `${title} has been scheduled.` });
      }
      setShowAddModal(false);
      resetForm();
    } catch (e) {
      handleFirestoreError(e, editEventId ? OperationType.UPDATE : OperationType.CREATE, 'events');
    }
  };

  const getGoogleCalendarLink = (event: Event) => {
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const text = `&text=${encodeURIComponent(event.title)}`;
    const dates = `&dates=${event.date.replace(/-/g, '')}/${event.date.replace(/-/g, '')}`; // Simple same-day
    const details = `&details=${encodeURIComponent(event.activities || '')}`;
    const location = `&location=${encodeURIComponent(event.venue || '')}`;
    return `${baseUrl}${text}${dates}${details}${location}`;
  };

  const addExternalGuest = () => {
    if (!externalGuestName.trim() || !externalGuestEmail.trim()) return;
    setExternalGuests([...externalGuests, { name: externalGuestName, email: externalGuestEmail, status: 'pending' }]);
    setExternalGuestName('');
    setExternalGuestEmail('');
  };

  const resetForm = () => {
    setTitle('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setType('Birthday');
    setVenue('');
    setBudget('');
    setBannerURL('');
    setActivities('');
    setExternalGuests([]);
    setEditEventId(null);
  };

  const openEditModal = (evt: Event) => {
    setTitle(evt.title);
    setDate(evt.date);
    setType(evt.type);
    setVenue(evt.venue || '');
    setBudget(String(evt.budget || ''));
    setBannerURL(evt.bannerURL || '');
    setActivities(evt.activities || '');
    setExternalGuests(evt.externalGuests || []);
    setEditEventId(evt.id);
    setSelectedEvent(null);
    setShowAddModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      showToast('success', { title: 'Event Removed' });
      setSelectedEvent(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'events');
    }
  };

  const renderHeader = () => {
    const dateFormat = "MMMM yyyy";
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic serif tracking-tight">Family Calendar</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{format(currentMonth, dateFormat)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-black/5 shadow-sm">
           <button 
             onClick={() => setView('month')}
             className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", view === 'month' ? "bg-black text-white" : "text-gray-400 hover:text-black")}
           >
             Month
           </button>
           <button 
             onClick={() => setView('week')}
             className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", view === 'week' ? "bg-black text-white" : "text-gray-400 hover:text-black")}
           >
             Week
           </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-black/5 rounded-2xl overflow-hidden">
            <button 
              onClick={() => setCurrentMonth(view === 'month' ? subMonths(currentMonth, 1) : subWeeks(currentMonth, 1))}
              className="p-3 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 border-x border-black/5 bg-gray-50/50">
               <button 
                onClick={() => setCurrentMonth(new Date())}
                className="text-[10px] font-black uppercase tracking-widest"
               >
                 Today
               </button>
            </div>
            <button 
              onClick={() => setCurrentMonth(view === 'month' ? addMonths(currentMonth, 1) : addWeeks(currentMonth, 1))}
              className="p-3 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white p-3 rounded-2xl hover:scale-110 active:scale-95 transition-transform shadow-xl"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4" key={i}>
          {dateNames[i]}
        </div>
      );
    }
    return <div className="grid grid-cols-7">{days}</div>;
  };

  const renderMonthCells = () => {
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
        const dayEvents = allCalendarItems.filter(e => isSameDay(parseISO(e.date), cloneDay));
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const isOtherMonth = !isSameMonth(day, monthStart);

        days.push(
          <div
            className={cn(
              "relative min-h-[120px] bg-white border border-black/[0.03] p-3 transition-all cursor-pointer group hover:bg-gray-50/50",
              isSelected && "ring-2 ring-black/10 z-10",
              isOtherMonth && "bg-gray-50/30 opacity-40 grayscale"
            )}
            key={day.toString()}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="flex items-center justify-between">
               <span className={cn(
                 "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg",
                 isToday ? "bg-black text-white" : "text-gray-900"
               )}>
                 {formattedDate}
               </span>
               {dayEvents.length > 0 && (
                 <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {dayEvents.length} Event{dayEvents.length > 1 && 's'}
                 </span>
               )}
            </div>

            <div className="mt-3 space-y-1">
              {dayEvents.slice(0, 3).map(event => (
                <div 
                  key={event.id} 
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                  className="bg-black/5 px-2 py-1.5 rounded-lg border border-black/5 flex items-center gap-2 hover:bg-black hover:text-white transition-all overflow-hidden"
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span className="text-[10px] font-bold truncate leading-none">{event.title}</span>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[8px] font-black text-gray-400 pl-2">+{dayEvents.length - 3} More</div>
              )}
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); setDate(format(cloneDay, 'yyyy-MM-dd')); setShowAddModal(true); }}
              className="absolute bottom-2 right-2 p-2 bg-white rounded-lg border border-black/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black hover:text-white"
            >
              <Plus className="w-3 h-3" />
            </button>
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
    return <div className="rounded-[2rem] overflow-hidden border border-black/5 shadow-inner">{rows}</div>;
  };

  const renderWeekCells = () => {
    const weekStart = startOfISOWeek(currentMonth);
    const weekEnd = endOfISOWeek(weekStart);
    const dayInterval = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekNumber = getWeek(weekStart);

    return (
      <div className="space-y-4">
        <div className="bg-black text-white p-4 rounded-2xl flex items-center justify-between">
           <span className="text-xs font-black uppercase tracking-widest">ISO Week {weekNumber}</span>
           <span className="text-xs opacity-60 italic serif">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {dayInterval.map((day, idx) => {
            const dayEvents = allCalendarItems.filter(e => isSameDay(parseISO(e.date), day));
            const isToday = isSameDay(day, new Date());

            return (
              <div key={idx} className={cn(
                "bg-white p-6 rounded-[2.5rem] border border-black/5 min-h-[300px] flex flex-col space-y-4",
                isToday && "ring-2 ring-black bg-gray-50"
              )}>
                <div className="text-center pb-4 border-b border-black/[0.03]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{format(day, 'EEE')}</p>
                  <p className={cn(
                    "text-2xl font-black italic serif",
                    isToday ? "text-blue-600" : "text-black"
                  )}>{format(day, 'd')}</p>
                </div>

                <div className="flex-1 space-y-3">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="bg-gray-50 p-4 rounded-2xl border border-black/5 hover:border-black transition-all cursor-pointer group"
                    >
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mb-1">{event.type}</span>
                      <h4 className="text-xs font-black truncate">{event.title}</h4>
                      <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => { setDate(format(day, 'yyyy-MM-dd')); setShowAddModal(true); }}
                    className="w-full py-4 border border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-300 hover:text-black hover:border-black transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {renderHeader()}

      <div className="bg-gray-50/50 p-4 rounded-[3rem] border border-black/5">
        {view === 'month' ? (
          <>
            {renderDays()}
            {renderMonthCells()}
          </>
        ) : (
          renderWeekCells()
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm space-y-6">
              <h3 className="text-xl font-bold italic serif tracking-tight flex items-center gap-3">
                <Star className="w-5 h-5 text-yellow-400" /> Key Anniversaries
              </h3>
              <div className="space-y-4">
                {[
                  { title: "Wedding Anniversary", date: "June 15", color: "bg-pink-100 text-pink-600" },
                  { title: "Graduation: Sarah", date: "Sept 22", color: "bg-blue-100 text-blue-600" },
                  { title: "Grandma's 80th", date: "Jan 12", color: "bg-orange-100 text-orange-600" }
                ].map((ann, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-black/[0.02]">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", ann.color)}>
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{ann.title}</p>
                      <p className="text-[10px] font-black uppercase text-gray-400 mt-0.5">{ann.date}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <Bell className="w-10 h-10 text-blue-400 mb-6 animate-bounce" />
                <h4 className="text-xl font-bold italic serif mb-4">Notification Logic</h4>
                <p className="text-xs text-white/50 font-light leading-relaxed">
                  System triggers automatic pulses at:
                  <br />• 7 Days Before: Strategy Warning
                  <br />• 3 Days Before: Preparation Check
                  <br />• 24 Hours Before: Critical Buzz
                </p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between px-2">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Upcoming Missions</h3>
           </div>

           <div className="grid grid-cols-1 gap-4">
             {allCalendarItems
               .filter(e => isAfter(parseISO(e.date), new Date()))
               .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
               .slice(0, 4)
               .map(event => (
                 <div 
                   key={event.id}
                   onClick={() => setSelectedEvent(event)}
                   className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm group hover:border-black transition-all flex items-center justify-between cursor-pointer"
                 >
                    <div className="flex items-start gap-6">
                       <div className="w-20 h-20 bg-gray-50 rounded-3xl flex flex-col items-center justify-center border border-black/5 overflow-hidden group-hover:bg-black group-hover:text-white transition-colors">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{format(parseISO(event.date), 'MMM')}</span>
                          <span className="text-3xl font-black italic serif">{format(parseISO(event.date), 'd')}</span>
                       </div>
                       <div className="space-y-1 pt-2">
                          <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{event.type}</span>
                          <h4 className="text-2xl font-bold tracking-tight">{event.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                             <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.venue || 'TBD'}</div>
                          </div>
                       </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-black group-hover:translate-x-2 transition-all" />
                 </div>
               ))
             }
             {events.length === 0 && (
               <div className="bg-white p-20 rounded-[3rem] border border-black/5 text-center flex flex-col items-center gap-4 opacity-50">
                  <CalendarIcon className="w-12 h-12 text-gray-300" />
                  <p className="text-lg italic font-light italic serif">The horizon is clear.</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/40"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/40 transition-all z-20"
              >
                <X className="w-6 h-6" />
              </button>

              <div 
                className="h-64 bg-gray-900 relative flex items-end p-10"
                style={{ 
                  backgroundImage: selectedEvent.bannerURL ? `url(${selectedEvent.bannerURL})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!selectedEvent.bannerURL && (
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-800 opacity-20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="relative z-10 space-y-2">
                   <span className="px-4 py-1.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                     {selectedEvent.type}
                   </span>
                   <h2 className="text-5xl font-black italic serif text-white tracking-tighter uppercase">{selectedEvent.title}</h2>
                </div>
              </div>

              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</p>
                       <p className="text-sm font-bold flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> {format(parseISO(selectedEvent.date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Venue</p>
                       <p className="text-sm font-bold flex items-center gap-2"><MapPin className="w-4 h-4" /> {selectedEvent.venue || 'TBD'}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Budget</p>
                       <p className="text-sm font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> {selectedEvent.budget?.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Guests</p>
                       <p className="text-sm font-bold flex items-center gap-2"><UsersIcon className="w-4 h-4" /> {selectedEvent.externalGuests?.length ? `${selectedEvent.externalGuests.length} Guests` : 'Family Group'}</p>
                    </div>
                 </div>

                 {selectedEvent.externalGuests && selectedEvent.externalGuests.length > 0 && (
                   <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-300">Invite List</h4>
                      <div className="flex flex-wrap gap-2">
                         {selectedEvent.externalGuests.map((g, i) => (
                           <div key={i} className="bg-gray-50 px-4 py-2 rounded-xl text-xs flex flex-col">
                              <span className="font-bold">{g.name}</span>
                              <span className="text-[10px] text-gray-400">{g.email}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-300">Planned Activities</h4>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                      {selectedEvent.activities || 'No activities detailed yet. Time to brainstorm together?'}
                    </p>
                 </div>

                 <div className="flex gap-4 pt-6">
                    <a 
                      href={getGoogleCalendarLink(selectedEvent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20 text-center flex items-center justify-center"
                    >
                      Sync to Google
                    </a>
                    {!selectedEvent.isTrip && (
                      <button 
                        onClick={() => openEditModal(selectedEvent)}
                        className="px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl hover:bg-gray-100 transition-all shadow-sm font-black uppercase text-xs tracking-widest"
                      >
                        Edit
                      </button>
                    )}
                    {!selectedEvent.isTrip && (
                      <button 
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                        className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 group"
                      >
                        <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/20"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl relative space-y-8"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-8 right-8 text-gray-300 hover:text-black transition-colors"
              >
                <X className="w-8 h-8" />
              </button>

              <div>
                <h3 className="text-3xl font-black italic serif tracking-tight">Construct Event</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Initialize new family timeline node.</p>
              </div>

              <div className="space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Event Title</label>
                    <input 
                      placeholder="e.g. Grandma's 80th Bash"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-gray-50 border border-black/5 p-5 rounded-2xl font-bold focus:ring-1 focus:ring-black/10 outline-none"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Date</label>
                        <input 
                          type="date"
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          className="w-full bg-gray-50 border border-black/5 p-5 rounded-2xl font-bold focus:ring-1 focus:ring-black/10 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Type</label>
                        <select 
                          value={type}
                          onChange={e => setType(e.target.value)}
                          className="w-full bg-gray-50 border border-black/5 p-5 rounded-2xl font-bold focus:ring-1 focus:ring-black/10 outline-none appearance-none"
                        >
                          <option>Birthday</option>
                          <option>Anniversary</option>
                          <option>Graduation</option>
                          <option>Holiday</option>
                          <option>Reunion</option>
                          <option>Other</option>
                        </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Venue</label>
                        <input 
                          placeholder="Location"
                          value={venue}
                          onChange={e => setVenue(e.target.value)}
                          className="w-full bg-gray-50 border border-black/5 p-5 rounded-2xl font-bold focus:ring-1 focus:ring-black/10 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Budget (KES)</label>
                        <input 
                          type="number"
                          placeholder="0.00"
                          value={budget}
                          onChange={e => setBudget(e.target.value)}
                          className="w-full bg-gray-50 border border-black/5 p-5 rounded-2xl font-bold focus:ring-1 focus:ring-black/10 outline-none"
                        />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Banner Asset</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <input 
                        placeholder="https://images.unsplash.com/..."
                        value={bannerURL}
                        onChange={e => setBannerURL(e.target.value)}
                        className="flex-1 bg-gray-50 border border-black/5 p-4 rounded-2xl font-bold focus:ring-1 focus:ring-black/10 outline-none text-sm"
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-gray-300">OR</span>
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleImageUpload(e.target.files[0], setBannerURL);
                            }
                          }}
                          className="text-xs max-w-[180px] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 transition-all cursor-pointer"
                        />
                      </div>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">External Invites</label>
                    <div className="flex gap-2">
                       <input 
                        placeholder="Name"
                        value={externalGuestName}
                        onChange={e => setExternalGuestName(e.target.value)}
                        className="flex-1 bg-gray-50 border border-black/5 p-4 rounded-2xl font-bold text-sm focus:ring-1 focus:ring-black/10 outline-none"
                      />
                      <input 
                        placeholder="Email"
                        value={externalGuestEmail}
                        onChange={e => setExternalGuestEmail(e.target.value)}
                        className="flex-1 bg-gray-50 border border-black/5 p-4 rounded-2xl font-bold text-sm focus:ring-1 focus:ring-black/10 outline-none"
                      />
                      <button 
                        onClick={addExternalGuest}
                        className="bg-black text-white px-4 rounded-2xl hover:scale-105 active:scale-95 transition-transform shrink-0"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {externalGuests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 px-2">
                         {externalGuests.map((g, i) => (
                           <div key={i} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-bold">
                             {g.name} 
                             <X 
                               className="w-3 h-3 cursor-pointer hover:text-red-400" 
                               onClick={() => setExternalGuests(externalGuests.filter((_, idx) => idx !== i))}
                             />
                           </div>
                         ))}
                      </div>
                    )}
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Activities</label>
                    <textarea 
                      placeholder="Planned events, games, dinner menu..."
                      value={activities}
                      onChange={e => setActivities(e.target.value)}
                      className="w-full bg-gray-50 border border-black/5 p-5 rounded-2xl font-bold min-h-[100px] focus:ring-1 focus:ring-black/10 outline-none leading-relaxed"
                    />
                 </div>

                 <button 
                  onClick={handleSaveEvent}
                  className="w-full bg-black text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-2xl shadow-black/20"
                 >
                   {editEventId ? 'Update Event Node' : 'Launch Event Node'}
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
