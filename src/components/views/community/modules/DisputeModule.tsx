import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  LifeBuoy, 
  Search, 
  Plus, 
  MessageSquare, 
  AlertCircle,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Tag,
  Filter,
  Send,
  ShieldAlert,
  ChevronRight,
  Gavel
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function DisputeModule({ community, user }: { community: any, user: User }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('finance');
  const [priority, setPriority] = useState('medium');
  const [resolutionText, setResolutionText] = useState('');

  const isModerator = community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid;

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'communities', community.id, 'tickets'), orderBy('createdAt', 'desc')), (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [community.id]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      await addDoc(collection(db, 'communities', community.id, 'tickets'), {
        title,
        description,
        category,
        priority,
        status: 'open',
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous Member',
        communityId: community.id,
        createdAt: serverTimestamp()
      });
      toast.success("Issue ticket raised. Officials have been notified.");
      setTitle(''); setDescription(''); setShowAddModal(false);
    } catch (e) {
      toast.error("Failed to raise ticket.");
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    if (!resolutionText.trim()) return;
    try {
      await updateDoc(doc(db, 'communities', community.id, 'tickets', ticketId), {
        status: 'resolved',
        resolution: resolutionText,
        resolvedBy: user.uid,
        resolvedByName: user.displayName,
        resolvedAt: serverTimestamp()
      });
      toast.success("Ticket marked as resolved.");
      setResolutionText('');
      setSelectedTicket(null);
    } catch (e) {
      toast.error("Resolution failed.");
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in transition-all pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
               <Gavel className="w-8 h-8" />
            </div>
            <div>
               <h2 className="text-xl font-bold italic serif tracking-tight text-black dark:text-white">Dispute & Resolution</h2>
               <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mt-1">Structured governance and accountability portal.</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
            >
               <Plus className="w-4 h-4" /> Raise Issue
            </button>
         </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
         {['all', 'open', 'investigating', 'resolved'].map(status => (
           <button 
             key={status}
             onClick={() => setFilterStatus(status)}
             className={cn(
               "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
               filterStatus === status ? "bg-red-600 text-white border-transparent shadow-lg shadow-red-600/20" : "bg-white dark:bg-zinc-900 text-gray-400 border-black/5 dark:border-white/5"
             )}
           >{status} Tickets</button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {filteredTickets.map(ticket => (
           <div 
             key={ticket.id} 
             onClick={() => setSelectedTicket(ticket)}
             className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm p-8 group hover:border-red-500/30 transition-all cursor-pointer relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/10 -mr-8 -mt-8 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-6">
                 <div className="flex flex-col gap-1">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded w-fit",
                      ticket.priority === 'urgent' ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-400"
                    )}>{ticket.priority} Priority</span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                       <Tag className="w-3 h-3" /> {ticket.category}
                    </span>
                 </div>
                 <div className={cn(
                   "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                   ticket.status === 'open' ? "text-red-500 border-red-500/20 bg-red-50/50" :
                   ticket.status === 'resolved' ? "text-green-500 border-green-500/20 bg-green-50/50" :
                   "text-blue-500 border-blue-500/20 bg-blue-50/50"
                 )}>
                    {ticket.status}
                 </div>
              </div>

              <h4 className="text-xl font-bold italic serif text-black dark:text-white mb-2">{ticket.title}</h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium line-clamp-3 mb-6">{ticket.description}</p>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-black/5 dark:border-white/5">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-gray-400">
                       {ticket.authorName.slice(0, 1)}
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-black dark:text-white uppercase">{ticket.authorName}</p>
                       <p className="text-[8px] text-gray-400 font-medium tracking-widest">{ticket.createdAt?.toDate ? format(ticket.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}</p>
                    </div>
                 </div>
                 <ChevronRight className="w-5 h-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
              </div>
           </div>
         ))}
         {filteredTickets.length === 0 && <p className="col-span-full text-center py-20 text-gray-400 dark:text-gray-600 italic text-sm border-2 border-dashed border-black/5 dark:border-white/5 rounded-[3rem]">No tickets found matching current filter.</p>}
      </div>

      {/* Raised Ticket Detail View */}
      {selectedTicket && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3.5rem] p-10 relative border border-black/5 dark:border-white/5 shadow-2xl overflow-y-auto max-h-[90vh]">
               <button onClick={() => setSelectedTicket(null)} className="absolute top-8 right-8 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400">
                  <Plus className="w-6 h-6 rotate-45" />
               </button>

               <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-full">{selectedTicket.category}</span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-full">{selectedTicket.status}</span>
               </div>

               <h2 className="text-3xl font-black serif italic mb-4 text-black dark:text-white">{selectedTicket.title}</h2>
               <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-3xl mb-8 border border-black/5 dark:border-white/5">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
               </div>

               {selectedTicket.status === 'resolved' ? (
                 <div className="bg-green-50 dark:bg-green-900/10 p-8 rounded-3xl border border-green-200 dark:border-green-900/30">
                    <div className="flex items-center gap-3 mb-4">
                       <ShieldAlert className="w-6 h-6 text-green-600" />
                       <h3 className="text-sm font-black uppercase tracking-widest text-green-600">Final Resolution</h3>
                    </div>
                    <p className="text-xs font-bold text-green-800 dark:text-green-400 mb-6 italic">"{selectedTicket.resolution}"</p>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-green-600/50">
                       <span>Resolved by: {selectedTicket.resolvedByName}</span>
                       <span>{selectedTicket.resolvedAt?.toDate ? format(selectedTicket.resolvedAt.toDate(), 'MMM dd, yyyy') : 'N/A'}</span>
                    </div>
                 </div>
               ) : (
                 isModerator && (
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Official Response / Resolution</h3>
                      <textarea 
                        value={resolutionText}
                        onChange={e => setResolutionText(e.target.value)}
                        placeholder="Detail the steps taken or final ruling..."
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-6 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/10 transition-all h-32"
                      />
                      <button 
                        onClick={() => handleResolveTicket(selectedTicket.id)}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                      >
                         Mark as Resolved & Close Ticket
                      </button>
                   </div>
                 )
               )}
            </motion.div>
         </div>
      )}

      {/* Add Issue Modal */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[3.5rem] p-10 relative border border-black/5 dark:border-white/5 shadow-2xl">
               <h2 className="text-2xl font-black serif italic mb-8 text-black dark:text-white">Raise Community Ticket</h2>
               <form onSubmit={handleCreateTicket} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Issue Title</label>
                     <input 
                        type="text" 
                        required 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="Brief summary of the issue..." 
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-red-500/10 transition-all text-black dark:text-white" 
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-red-500/10 transition-all text-black dark:text-white appearance-none">
                           <option value="finance">Financial Accountability</option>
                           <option value="asset">Asset Misuse/Conflict</option>
                           <option value="governance">Governance Dispute</option>
                           <option value="other">General Grievance</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Priority</label>
                        <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-red-500/10 transition-all text-black dark:text-white appearance-none">
                           <option value="low">Low</option>
                           <option value="medium">Medium</option>
                           <option value="high">High</option>
                           <option value="urgent">Urgent</option>
                        </select>
                     </div>
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Detailed Description</label>
                     <textarea 
                       required 
                       value={description} 
                       onChange={e => setDescription(e.target.value)} 
                       placeholder="Please provide specifics: dates, amounts, or parties involved..." 
                       className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/10 transition-all h-32 text-black dark:text-white" 
                     />
                  </div>

                  <div className="flex gap-4">
                     <button type="submit" className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-red-600/20">Submit Ticket</button>
                     <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white font-black uppercase tracking-widest text-xs transition-colors">Cancel</button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}
    </div>
  );
}
