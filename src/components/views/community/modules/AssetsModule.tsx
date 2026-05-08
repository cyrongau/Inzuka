import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Package, 
  Search, 
  Plus, 
  MoreVertical, 
  MapPin, 
  User as UserIcon, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Filter,
  History,
  Wrench,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  ClipboardList,
  ChevronRight,
  Settings,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

type AssetTab = 'inventory' | 'bookings' | 'maintenance' | 'financials';

export default function AssetsModule({ community, user }: { community: any, user: User }) {
  const [activeTab, setActiveTab] = useState<AssetTab>('inventory');
  const [assets, setAssets] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  
  const isOfficial = community.memberRoles?.[user.uid] === 'admin' || 
                     community.memberRoles?.[user.uid] === 'chairman' || 
                     community.memberRoles?.[user.uid] === 'treasurer' || 
                     community.memberRoles?.[user.uid] === 'secretary' ||
                     community.ownerId === user.uid;

  useEffect(() => {
    const unsubAssets = onSnapshot(
      query(collection(db, 'communities', community.id, 'assets'), orderBy('createdAt', 'desc')), 
      (snap) => setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubBookings = onSnapshot(
      query(collection(db, 'communities', community.id, 'bookings'), orderBy('createdAt', 'desc')), 
      (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubMaint = onSnapshot(
      query(collection(db, 'communities', community.id, 'maintenance'), orderBy('createdAt', 'desc')), 
      (snap) => setMaintenance(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubAssets();
      unsubBookings();
      unsubMaint();
    };
  }, [community.id]);

  return (
    <div className="space-y-8 animate-in fade-in transition-all pb-24">
      {/* Header with Stats Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         <div className="lg:col-span-3 bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl flex items-center justify-center">
                  <Package className="w-9 h-9" />
               </div>
               <div>
                  <h2 className="text-2xl font-black italic serif text-black dark:text-white leading-tight">Asset Management Hub</h2>
                  <p className="text-gray-400 dark:text-gray-500 text-xs font-bold mt-1 uppercase tracking-widest">Inventory, Bookings & Lifecycle</p>
               </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
               {['inventory', 'bookings', 'maintenance', 'financials'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as AssetTab)}
                    className={cn(
                      "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                      activeTab === tab 
                        ? "bg-black dark:bg-white text-white dark:text-black shadow-xl" 
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
               ))}
            </div>
         </div>

         <div className="bg-orange-600 p-8 rounded-[3rem] text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700" />
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Value</p>
               <h3 className="text-3xl font-black italic serif mb-1">
                  KES {assets.reduce((sum, a) => sum + (a.value || 0), 0).toLocaleString()}
               </h3>
               <p className="text-[10px] items-center gap-2 flex opacity-80">
                  <TrendingUp className="w-3 h-3" />
                  +12.5% this year
               </p>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
               <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Total Assets</p>
                  <p className="text-sm font-bold">{assets.length}</p>
               </div>
               <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Revenue</p>
                  <p className="text-sm font-bold">KES {bookings.reduce((sum, b) => sum + (b.fee || 0), 0).toLocaleString()}</p>
               </div>
            </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           className="min-h-[400px]"
        >
           {activeTab === 'inventory' && <InventoryTab community={community} assets={assets} isOfficial={isOfficial} />}
           {activeTab === 'bookings' && <BookingsTab community={community} assets={assets} bookings={bookings} isOfficial={isOfficial} user={user} />}
           {activeTab === 'maintenance' && <MaintenanceTab community={community} assets={assets} maintenance={maintenance} isOfficial={isOfficial} />}
           {activeTab === 'financials' && <FinancialsTab assets={assets} bookings={bookings} maintenance={maintenance} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function InventoryTab({ community, assets, isOfficial }: { community: any, assets: any[], isOfficial: boolean }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', category: 'Equipment', value: '', location: '', serialNumber: '' });

  const categories = ['Equipment', 'Furniture', 'Electronics', 'Vehicles', 'Tools', 'Land', 'Livestock', 'Other'];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'communities', community.id, 'assets'), {
        ...form,
        value: parseFloat(form.value) || 0,
        status: 'available',
        communityId: community.id,
        bookingsCount: 0,
        totalIncome: 0,
        createdAt: serverTimestamp()
      });
      toast.success("Asset registered");
      setShowAddModal(false);
      setForm({ name: '', description: '', category: 'Equipment', value: '', location: '', serialNumber: '' });
    } catch (e) { toast.error("Error adding asset"); }
  };

  const filtered = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Filter inventory..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full pl-12 pr-6 py-4 bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-black/5 dark:border-white/5 shadow-sm outline-none font-bold text-xs"
             />
          </div>
          {isOfficial && (
            <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-orange-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-lg shadow-orange-600/20 hover:scale-105 active:scale-95 transition-all">
               <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(asset => (
             <div key={asset.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm hover:border-orange-200 dark:hover:border-orange-900 transition-all flex flex-col justify-between group overflow-hidden relative">
                <div className="flex justify-between items-start mb-6 relative z-10">
                   <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-400">
                      <Package className="w-7 h-7" />
                   </div>
                   <span className={cn(
                     "text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm",
                     asset.status === 'available' ? "bg-green-500 text-white" : 
                     asset.status === 'hired-out' ? "bg-blue-500 text-white" : 
                     "bg-gray-100 dark:bg-zinc-800 text-gray-400"
                   )}>
                     {asset.status.replace('-', ' ')}
                   </span>
                </div>

                <div className="relative z-10">
                   <h4 className="text-xl font-bold italic serif text-black dark:text-white capitalize truncate">{asset.name}</h4>
                   <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mt-1">{asset.category}</p>
                   <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-3 line-clamp-2">{asset.description || 'No maintenance notes yet.'}</p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3 relative z-10">
                   <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                      <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 mb-1">Value</p>
                      <p className="text-sm font-black italic serif text-black dark:text-white">KES {asset.value?.toLocaleString()}</p>
                   </div>
                   <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                      <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 mb-1">Usage</p>
                      <p className="text-sm font-black italic serif text-black dark:text-white">{asset.bookingsCount || 0} Times</p>
                   </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-gray-400 text-[10px] font-bold relative z-10">
                   <MapPin className="w-3 h-3" />
                   {asset.location || 'Central Store'}
                </div>
             </div>
          ))}
       </div>

       {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[4rem] p-12 relative shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-orange-600/5 to-transparent" />
                <h2 className="text-3xl font-black italic serif mb-8 relative z-10">Asset Registration</h2>
                <form onSubmit={handleAdd} className="space-y-6 relative z-10">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2 md:col-span-1">
                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Asset Name</label>
                         <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Caterpillar Tractor" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-orange-500/20 text-sm" />
                      </div>
                      <div className="space-y-2 col-span-2 md:col-span-1">
                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Tag Category</label>
                         <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm appearance-none cursor-pointer">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Asset Description / Context</label>
                       <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What is it used for? Current condition?" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 h-24" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Current Market Value</label>
                          <input type="number" required value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="KES" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Primary Location</label>
                          <input type="text" required value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Storage Depot 1" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm" />
                       </div>
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="submit" className="flex-1 py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-600/20 hover:scale-105 transition-all">Submit Entry</button>
                      <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 bg-gray-100 dark:bg-zinc-800 text-gray-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:text-black dark:hover:text-white transition-all">Discard</button>
                   </div>
                </form>
             </motion.div>
          </div>
       )}
    </div>
  );
}

function BookingsTab({ community, assets, bookings, isOfficial, user }: { community: any, assets: any[], bookings: any[], isOfficial: boolean, user: User }) {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', purpose: '', type: 'member-use' as 'member-use' | 'external-hiring', fee: '' });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    try {
      await addDoc(collection(db, 'communities', community.id, 'bookings'), {
        assetId: asset.id,
        assetName: asset.name,
        userId: user.uid,
        userName: user.displayName || 'Anonymous Member',
        ...bookingForm,
        fee: parseFloat(bookingForm.fee) || 0,
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: serverTimestamp()
      });
      toast.success("Hiring application submitted!");
      setShowApplyModal(false);
    } catch (e) { toast.error("Submission failed"); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const booking = bookings.find(b => b.id === id);
      await updateDoc(doc(db, 'communities', community.id, 'bookings', id), { status });
      
      // If approved, update asset status
      if (status === 'approved' && booking) {
         await updateDoc(doc(db, 'communities', community.id, 'assets', booking.assetId), {
           status: 'hired-out',
           bookingsCount: (assets.find(a => a.id === booking.assetId)?.bookingsCount || 0) + 1
         });
      }
      
      toast.success(`Booking ${status}`);
    } catch (e) { toast.error("Update failed"); }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-xl font-black italic serif">Usage & Hiring Logs</h3>
             <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Active and previous hiring records</p>
          </div>
          <button onClick={() => setShowApplyModal(true)} className="px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all">
             <Calendar className="w-4 h-4" /> Book Asset
          </button>
       </div>

       <div className="grid grid-cols-1 gap-4">
          {bookings.map(booking => (
             <div key={booking.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-blue-600">
                      <Clock className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-black text-black dark:text-white uppercase tracking-widest text-xs">{booking.assetName}</h4>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{booking.userName} • {booking.type.replace('-', ' ')}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[8px] font-black uppercase tracking-widest bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-gray-400">{booking.status}</span>
                        {booking.fee > 0 && <span className="text-[8px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 px-2 py-1 rounded">KES {booking.fee.toLocaleString()} Paid</span>}
                      </div>
                   </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center gap-8 px-4 border-l border-black/5 dark:border-white/5">
                   <div>
                      <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 mb-1">Start Date</p>
                      <p className="text-[11px] font-bold text-black dark:text-white">{booking.startDate ? format(new Date(booking.startDate), 'MMM dd, p') : '---'}</p>
                   </div>
                   <ArrowRight className="w-4 h-4 text-gray-300 hidden lg:block" />
                   <div>
                      <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 mb-1">Return Date</p>
                      <p className="text-[11px] font-bold text-black dark:text-white">{booking.endDate ? format(new Date(booking.endDate), 'MMM dd, p') : '---'}</p>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   {isOfficial && booking.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpdateStatus(booking.id, 'approved')} className="px-6 py-3 bg-green-500 text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all">Approve</button>
                        <button onClick={() => handleUpdateStatus(booking.id, 'rejected')} className="px-6 py-3 bg-red-100 text-red-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-500 hover:text-white transition-all">Decline</button>
                      </>
                   )}
                   {booking.status === 'approved' && isOfficial && (
                      <button onClick={() => handleUpdateStatus(booking.id, 'completed')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest">Mark Returned</button>
                   )}
                   <button className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-black dark:hover:text-white transition-all">
                      <MoreVertical className="w-4 h-4" />
                   </button>
                </div>
             </div>
          ))}
          {bookings.length === 0 && <p className="text-center py-20 text-gray-400 italic">No usage or hiring records yet.</p>}
       </div>

       {showApplyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[4rem] p-12 relative shadow-2xl overflow-hidden">
                <h2 className="text-3xl font-black italic serif mb-8 relative z-10">Usage Application</h2>
                <form onSubmit={handleApply} className="space-y-6 relative z-10">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Select Asset</label>
                         <select required value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm appearance-none cursor-pointer">
                            <option value="">Choose an available asset...</option>
                            {assets.filter(a => a.status === 'available').map(a => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
                         </select>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Start From</label>
                          <input type="datetime-local" required value={bookingForm.startDate} onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-xs" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Until</label>
                          <input type="datetime-local" required value={bookingForm.endDate} onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-xs" />
                       </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Hiring Fee (Optional)</label>
                         <input type="number" value={bookingForm.fee} onChange={e => setBookingForm({...bookingForm, fee: e.target.value})} placeholder="KES" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Hiring Type</label>
                         <select value={bookingForm.type} onChange={e => setBookingForm({...bookingForm, type: e.target.value as any})} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm appearance-none cursor-pointer">
                            <option value="member-use">Member Use</option>
                            <option value="external-hiring">External Hiring</option>
                         </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Purpose of Use</label>
                       <input type="text" required value={bookingForm.purpose} onChange={e => setBookingForm({...bookingForm, purpose: e.target.value})} placeholder="e.g. Community Event at Nairobi Road" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm" />
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 transition-all text-center">Submit Booking</button>
                      <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 py-5 bg-gray-100 dark:bg-zinc-800 text-gray-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:text-black dark:hover:text-white transition-all">Cancel</button>
                   </div>
                </form>
             </motion.div>
          </div>
       )}
    </div>
  );
}

function MaintenanceTab({ community, assets, maintenance, isOfficial }: { community: any, assets: any[], maintenance: any[], isOfficial: boolean }) {
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintForm, setMaintForm] = useState({ assetId: '', type: 'routine' as 'routine' | 'repair' | 'replacement', description: '', cost: '' });

  const handleMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'communities', community.id, 'maintenance'), {
        ...maintForm,
        cost: parseFloat(maintForm.cost) || 0,
        status: 'reported',
        createdAt: serverTimestamp()
      });
      
      if (maintForm.type === 'repair' || maintForm.type === 'replacement') {
         await updateDoc(doc(db, 'communities', community.id, 'assets', maintForm.assetId), {
           status: 'maintenance'
         });
      }
      
      toast.success("Maintenance log created");
      setShowMaintModal(false);
      setMaintForm({ assetId: '', type: 'routine', description: '', cost: '' });
    } catch (e) { toast.error("Log failed"); }
  };

  const updateMaintStatus = async (id: string, status: string) => {
     try {
        const log = maintenance.find(m => m.id === id);
        await updateDoc(doc(db, 'communities', community.id, 'maintenance', id), {
          status,
          resolvedAt: status === 'resolved' ? serverTimestamp() : null
        });
        
        if (status === 'resolved' && log) {
           await updateDoc(doc(db, 'communities', community.id, 'assets', log.assetId), {
             status: 'available'
           });
        }
        toast.success(`Maintenance ${status}`);
     } catch (e) { toast.error("Failed to update"); }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-xl font-black italic serif">Lifecycle & Maintenance</h3>
             <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Health tracking of group resources</p>
          </div>
          <button onClick={() => setShowMaintModal(true)} className="px-8 py-4 bg-orange-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-lg shadow-orange-600/20 hover:scale-105 active:scale-95 transition-all">
             <Wrench className="w-4 h-4" /> Log Service
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {maintenance.map(log => {
             const asset = assets.find(a => a.id === log.assetId);
             return (
                <div key={log.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8">
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full",
                        log.status === 'resolved' ? "bg-green-500 text-white" : "bg-orange-500 text-white animate-pulse"
                      )}>{log.status}</span>
                   </div>
                   
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-orange-600">
                         <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="font-black text-xs uppercase tracking-widest text-black dark:text-white">{asset?.name || 'Deleted Asset'}</h4>
                         <p className="text-[9px] font-bold text-gray-400 mt-0.5 capitalize">{log.type} Request</p>
                      </div>
                   </div>

                   <p className="text-sm font-medium text-gray-800 dark:text-gray-300 leading-relaxed mb-6 italic">"{log.description}"</p>

                   <div className="flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5 mt-auto">
                      <div>
                         <p className="text-[7px] font-black uppercase tracking-widest text-gray-400">Total Cost</p>
                         <p className="text-xs font-black italic serif text-orange-600 dark:text-orange-400">KES {log.cost.toLocaleString()}</p>
                      </div>
                      {isOfficial && log.status !== 'resolved' && (
                         <button onClick={() => updateMaintStatus(log.id, 'resolved')} className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Mark Fixed</button>
                      )}
                   </div>
                </div>
             )
          })}
          {maintenance.length === 0 && <p className="col-span-full text-center py-20 text-gray-400 italic">No maintenance history recorded.</p>}
       </div>

       {showMaintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[4rem] p-12 relative shadow-2xl overflow-hidden">
                <h2 className="text-3xl font-black italic serif mb-8">Log Maintenance</h2>
                <form onSubmit={handleMaint} className="space-y-6">
                   <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Select Asset</label>
                       <select required value={maintForm.assetId} onChange={e => setMaintForm({...maintForm, assetId: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm appearance-none cursor-pointer">
                          <option value="">Which asset needs attention?</option>
                          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Service Type</label>
                         <select value={maintForm.type} onChange={e => setMaintForm({...maintForm, type: e.target.value as any})} className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm appearance-none">
                            <option value="routine">Routine Check</option>
                            <option value="repair">Breakdown / Repair</option>
                            <option value="replacement">Partial Replacement</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Estimated Cost</label>
                         <input type="number" required value={maintForm.cost} onChange={e => setMaintForm({...maintForm, cost: e.target.value})} placeholder="KES" className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none text-sm" />
                      </div>
                   </div>
                   <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2">Internal Notes</label>
                       <textarea required value={maintForm.description} onChange={e => setMaintForm({...maintForm, description: e.target.value})} placeholder="Describe the issue or service performed..." className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 h-24" />
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="submit" className="flex-1 py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-600/20 hover:scale-105 transition-all text-center">Save Record</button>
                      <button type="button" onClick={() => setShowMaintModal(false)} className="flex-1 py-5 bg-gray-100 dark:bg-zinc-800 text-gray-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:text-black dark:hover:text-white transition-all">Cancel</button>
                   </div>
                </form>
             </motion.div>
          </div>
       )}
    </div>
  );
}

function FinancialsTab({ assets, bookings, maintenance }: { assets: any[], bookings: any[], maintenance: any[] }) {
  const totalIncome = bookings.reduce((sum, b) => sum + (b.fee || 0), 0);
  const totalExpenses = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
  const netPosition = totalIncome - totalExpenses;

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm">
             <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                <DollarSign className="w-6 h-6" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Hiring Revenue</p>
             <h4 className="text-3xl font-black italic serif text-black dark:text-white">KES {totalIncome.toLocaleString()}</h4>
             <p className="text-[9px] font-bold text-gray-400 mt-2">Combined for {bookings.length} jobs</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm">
             <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Maintenance Costs</p>
             <h4 className="text-3xl font-black italic serif text-black dark:text-white">KES {totalExpenses.toLocaleString()}</h4>
             <p className="text-[9px] font-bold text-gray-400 mt-2">{maintenance.length} service entries logged</p>
          </div>

          <div className={cn(
             "p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm",
             netPosition >= 0 ? "bg-black dark:bg-white text-white dark:text-black" : "bg-red-600 text-white"
          )}>
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Net Position</p>
             <h4 className="text-3xl font-black italic serif">KES {netPosition.toLocaleString()}</h4>
             <p className="text-[9px] font-bold opacity-60 mt-2">Overall asset profitability</p>
          </div>
       </div>

       {/* Detailed Income History */}
       <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
             <h3 className="text-xl font-black italic serif">Recent Activity</h3>
             <span className="text-[9px] font-black uppercase bg-gray-100 dark:bg-zinc-800 text-gray-400 px-3 py-1 rounded-full">Top 5 Records</span>
          </div>

          <div className="space-y-4">
             {[...bookings, ...maintenance]
               .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
               .slice(0, 5)
               .map((item, idx) => {
                 const isExp = 'cost' in item;
                 return (
                   <div key={idx} className="flex items-center justify-between p-6 bg-gray-50/50 dark:bg-zinc-800/30 rounded-3xl border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-4">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isExp ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500")}>
                            {isExp ? <AlertTriangle className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                         </div>
                         <div>
                            <p className="text-xs font-black uppercase tracking-widest text-black dark:text-white truncate max-w-[150px] md:max-w-xs">
                               {isExp ? item.description : `Hiring: ${item.assetName}`}
                            </p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                               {item.createdAt ? format(new Date(item.createdAt.toDate()), 'MMM dd, p') : 'Processing...'}
                            </p>
                         </div>
                      </div>
                      <p className={cn("text-sm font-black italic serif", isExp ? "text-red-500" : "text-green-500")}>
                         {isExp ? '-' : '+'} KES {(isExp ? item.cost : item.fee).toLocaleString()}
                      </p>
                   </div>
                 )
             })}
          </div>
       </div>
    </div>
  );
}
