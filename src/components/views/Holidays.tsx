import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Plane, 
  MapPin, 
  Calendar, 
  DollarSign,
  Briefcase,
  ChevronRight,
  ChevronDown,
  Clock,
  Luggage,
  Sparkles
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { format, differenceInDays } from 'date-fns';

import CalendarView from './Calendar';

export default function Holidays({ user, profile }: { user: User, profile: any }) {
  const [activeTab, setActiveTab] = useState<'vacations' | 'calendar'>('calendar');
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const familyId = profile?.familyId;

  // Form State
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const q = query(collection(db, 'trips'), where('familyId', '==', familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      clearTimeout(safetyTimeout);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [familyId]);

  const addTrip = async () => {
    if (!title.trim() || !destination.trim() || !familyId) return;
    try {
      await addDoc(collection(db, 'trips'), {
        title,
        destination,
        startDate,
        endDate,
        budget: parseInt(budget) || 0,
        packingList: [
          { item: 'Passports', packed: false },
          { item: 'Tickets', packed: false },
          { item: 'Chargers', packed: false }
        ],
        userId: user.uid,
        familyId: familyId,
        createdAt: serverTimestamp()
      });
      setTitle('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setBudget('');
      setShowAdd(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'trips');
    }
  };

  const togglePacked = async (tripId: string, itemIdx: number) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    try {
      const newList = [...trip.packingList];
      newList[itemIdx] = { ...newList[itemIdx], packed: !newList[itemIdx].packed };
      await updateDoc(doc(db, 'trips', tripId), {
        packingList: newList
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'trips');
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'trips', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'trips');
    }
  };

  if (!familyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-500/10 text-blue-400 rounded-[2.5rem] flex items-center justify-center">
          <Plane className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold italic serif tracking-tight text-black dark:text-white">Family Travel Required</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mt-2 font-light">Vacation planning and packing lists are shared with your household. Please setup your household in your profile to start exploring together.</p>
        </div>
        <button 
          onClick={() => window.location.hash = '#profile'}
          className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
        >
          Setup My Family
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
            {activeTab === 'vacations' ? <Plane className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight uppercase italic serif text-black dark:text-white">{activeTab === 'vacations' ? 'Vacation Planning' : 'Family Calendar'}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{activeTab === 'vacations' ? 'Explore the world together.' : 'Marking family milestones.'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
           <button 
             onClick={() => setActiveTab('calendar')}
             className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'calendar' ? "bg-black dark:bg-white text-white dark:text-black shadow-lg" : "text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5")}
           >
             Timeline Map
           </button>
           <button 
             onClick={() => setActiveTab('vacations')}
             className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'vacations' ? "bg-black dark:bg-white text-white dark:text-black shadow-lg" : "text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5")}
           >
             Vacation Hub
           </button>
        </div>

        {activeTab === 'vacations' && (
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" /> Plan Trip
          </button>
        )}
      </div>

      {activeTab === 'calendar' ? (
        <CalendarView user={user} profile={profile} />
      ) : (
        <>
          {showAdd && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Trip Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Summer Vacation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 font-medium text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Destination</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Where to?"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 font-medium text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 font-medium text-black dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">End Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 font-medium text-black dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Budget (KES)</label>
                <input 
                  type="number" 
                  placeholder="50000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 font-medium text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
              </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={addTrip}
              className="flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg"
            >
              Plan it!
            </button>
            <button 
              onClick={() => setShowAdd(false)}
              className="px-8 py-4 border border-black/5 dark:border-white/5 rounded-2xl font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Loading your itineraries...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-20 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Luggage className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-2xl font-light italic serif text-gray-400 dark:text-gray-500">No trips planned yet</h3>
            <p className="text-sm text-gray-300 dark:text-gray-600 mt-2">Pack your bags and explore new horizons.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {[...trips].sort((a,b) => {
            const da = new Date(a.startDate || 0).getTime();
            const db = new Date(b.startDate || 0).getTime();
            return da - db;
          }).map(trip => {
            const tripDate = trip.startDate ? new Date(trip.startDate) : new Date();
            const daysRemaining = isNaN(tripDate.getTime()) ? 0 : differenceInDays(tripDate, new Date());
            const packedCount = trip.packingList?.filter((i: any) => i.packed).length || 0;
            const progress = trip.packingList?.length ? (packedCount / trip.packingList.length) * 100 : 0;
            const isExpanded = expandedTripId === trip.id;

            return (
              <div key={trip.id} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm overflow-hidden group">
                <div className="p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-black dark:bg-white rounded-3xl flex flex-col items-center justify-center text-white dark:text-black shrink-0 shadow-xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{daysRemaining > 0 ? 'Starts in' : 'In'}</span>
                        <span className="text-3xl font-bold">{Math.max(0, daysRemaining)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Days</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold tracking-tight mb-2 uppercase italic serif text-black dark:text-white">{trip.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                <MapPin className="w-4 h-4" /> {trip.destination}
                            </div>
                            <span className="text-gray-200 dark:text-zinc-700">•</span>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <Calendar className="w-4 h-4" /> 
                                {trip.startDate && trip.endDate && trip.startDate !== '' && trip.endDate !== '' 
                                  ? `${format(new Date(trip.startDate), 'MMM d')} - ${format(new Date(trip.endDate), 'MMM d, yyyy')}` 
                                  : 'Dates TBD'}
                            </div>
                            <span className="text-gray-200 dark:text-zinc-700">•</span>
                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <DollarSign className="w-4 h-4" /> KES {trip.budget.toLocaleString()}
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                     <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Packing Status</p>
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="font-bold text-sm text-black dark:text-white">{Math.round(progress)}%</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            isExpanded ? "bg-black dark:bg-white text-white dark:text-black" : "bg-gray-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700"
                          )}
                        >
                          <ChevronDown className={cn("w-6 h-6 transition-transform", isExpanded && "rotate-180")} />
                        </button>
                        <button 
                          onClick={() => deleteTrip(trip.id)}
                          className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                     </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-8 lg:px-10 pb-10 pt-4 border-t border-black/[0.03] dark:border-white/[0.05] animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-bold flex items-center gap-2 text-black dark:text-white">
                                    <Luggage className="w-5 h-5" /> Packing List
                                </h4>
                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{packedCount}/{trip.packingList?.length} Packed</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {trip.packingList?.map((item: any, idx: number) => (
                                    <div 
                                      key={idx}
                                      onClick={() => togglePacked(trip.id, idx)}
                                      className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all",
                                        item.packed ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 opacity-60" : "bg-gray-50 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                                      )}
                                    >
                                        <span className={cn("font-medium text-black dark:text-white", item.packed && "line-through text-gray-400 dark:text-gray-500")}>{item.item}</span>
                                        {item.packed ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-lg font-bold flex items-center gap-2 text-black dark:text-white">
                                <Sparkles className="w-5 h-5 text-blue-500" /> AI Trip Suggestions
                            </h4>
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-500/20 italic font-light text-blue-900 dark:text-blue-100 leading-relaxed text-sm">
                                "Since you're heading to {trip.destination} in {trip.startDate && trip.startDate !== '' ? format(new Date(trip.startDate), 'MMMM') : 'the future'}, consider booking your dinner reservations early. It's peak season and popular spots like the beach-front grills tend to fill up fast!"
                            </div>
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Preparation Tips</p>
                                {[
                                    'Check visa requirements',
                                    'Call bank for international travel',
                                    'Organize airport transfer'
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        {tip}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
</>
)}
    </div>
  );
}
