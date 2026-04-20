import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  FileText, 
  Megaphone, 
  Plus, 
  Clock, 
  Send,
  Calendar,
  Users,
  ChevronRight,
  ShieldCheck,
  Globe,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

export default function SecretaryModule({ community, user }: { community: any, user: User }) {
  const [activeView, setActiveView] = useState<'announcements' | 'minutes'>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [minutes, setMinutes] = useState<any[]>([]);
  const [showAddAnn, setShowAddAnn] = useState(false);
  const [showAddMinutes, setShowAddMinutes] = useState(false);

  // Form states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState('general');

  const [minNotes, setMinNotes] = useState('');
  const [minDate, setMinDate] = useState('');

  const isSecretary = community.memberRoles?.[user.uid] === 'secretary' || community.creatorId === user.uid;
  const isAdmin = community.creatorId === user.uid || community.moderatorIds?.includes(user.uid);

  useEffect(() => {
    const unsubAnn = onSnapshot(query(collection(db, 'communities', community.id, 'announcements'), orderBy('createdAt', 'desc')), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMin = onSnapshot(query(collection(db, 'communities', community.id, 'minutes'), orderBy('createdAt', 'desc')), (snap) => {
      setMinutes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubAnn();
      unsubMin();
    };
  }, [community.id]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      await addDoc(collection(db, 'communities', community.id, 'announcements'), {
        title: annTitle,
        content: annContent,
        type: annType,
        authorId: user.uid,
        authorName: user.displayName,
        createdAt: serverTimestamp()
      });
      toast.success("Community announcement posted.");
      setAnnTitle(''); setAnnContent(''); setShowAddAnn(false);
    } catch (e) {
      toast.error("Failed to post update.");
    }
  };

  const handleSaveMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minNotes.trim() || !minDate) return;

    try {
      await addDoc(collection(db, 'communities', community.id, 'minutes'), {
        notes: minNotes,
        meetingDate: minDate,
        secretaryId: user.uid,
        attendees: community.memberIds, // Simplification
        createdAt: serverTimestamp()
      });
      toast.success("Meeting minutes filed successfully.");
      setMinNotes(''); setMinDate(''); setShowAddMinutes(false);
    } catch (e) {
      toast.error("Failed to file minutes.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in transition-all pb-12">
      {/* Secretary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
               <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
               <h2 className="text-xl font-bold italic serif tracking-tight">Administrative Bureau</h2>
               <p className="text-gray-400 text-xs font-medium mt-1">Official records and community communications center.</p>
            </div>
         </div>
         <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            <button 
              onClick={() => setActiveView('announcements')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === 'announcements' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"
              )}
            >
               Announcements
            </button>
            <button 
              onClick={() => setActiveView('minutes')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === 'minutes' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"
              )}
            >
               Minutes
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 space-y-6">
            {activeView === 'announcements' ? (
               <>
                 <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                       <Megaphone className="w-5 h-5 text-indigo-500" /> Community Newsreel
                    </h3>
                    {(isSecretary || isAdmin) && (
                       <button onClick={() => setShowAddAnn(true)} className="p-2 bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all">
                          <Plus className="w-5 h-5" />
                       </button>
                    )}
                 </div>

                 <div className="space-y-4">
                    {announcements.map(a => (
                       <div key={a.id} className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm group">
                          <div className="flex justify-between items-start mb-6">
                             <div>
                                <span className={cn(
                                   "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                                   a.type === 'urgent' ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-500"
                                )}>{a.type} Update</span>
                                <h4 className="text-xl font-bold italic serif mt-2">{a.title}</h4>
                             </div>
                             {(isSecretary || isAdmin) && (
                                <button onClick={() => deleteDoc(doc(db, 'communities', community.id, 'announcements', a.id))} className="p-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             )}
                          </div>
                          <div className="markdown-body prose prose-sm max-w-none text-gray-700 font-medium">
                             <Markdown>{a.content}</Markdown>
                          </div>
                          <div className="mt-8 pt-6 border-t border-black/5 flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-gray-50 border border-black/5 flex items-center justify-center font-bold text-gray-400 text-[10px]">
                                {a.authorName?.slice(0, 1) || 'O'}
                             </div>
                             <div>
                                <p className="text-[10px] font-bold">{a.authorName}</p>
                                <p className="text-[8px] text-gray-400 font-mono italic">Posted {a.createdAt?.toDate() ? new Date(a.createdAt.toDate()).toLocaleDateString() : 'Just now'}</p>
                             </div>
                          </div>
                       </div>
                    ))}
                    {announcements.length === 0 && <p className="text-center py-20 text-gray-400 italic text-sm">No announcements broadcast yet.</p>}
                 </div>
               </>
            ) : (
               <>
                 <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                       <FileText className="w-5 h-5 text-indigo-500" /> Archived Minutes
                    </h3>
                    {(isSecretary || isAdmin) && (
                       <button onClick={() => setShowAddMinutes(true)} className="p-2 bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all">
                          <Plus className="w-5 h-5" />
                       </button>
                    )}
                 </div>

                 <div className="space-y-4">
                    {minutes.map(m => (
                       <div key={m.id} className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
                          <div className="flex items-center gap-4 mb-6">
                             <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-black/5">
                                <Calendar className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Meeting Record</p>
                                <h4 className="text-xl font-bold italic serif tracking-tight">Session: {new Date(m.meetingDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</h4>
                             </div>
                          </div>
                          <div className="bg-gray-50/50 p-6 rounded-3xl border border-black/[0.02]">
                             <div className="markdown-body prose prose-sm max-w-none text-gray-800 font-medium whitespace-pre-wrap">
                                <Markdown>{m.notes}</Markdown>
                             </div>
                          </div>
                       </div>
                    ))}
                    {minutes.length === 0 && <p className="text-center py-20 text-gray-400 italic text-sm">No meeting minutes filed.</p>}
                 </div>
               </>
            )}
         </div>

         <div className="space-y-6">
            <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm">
               <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Official Bureau
               </h4>
               <div className="space-y-4">
                  {Object.entries(community.memberRoles || {}).filter(([_, role]) => role !== 'member').map(([mid, role]) => (
                     <div key={mid} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-black/5 flex items-center justify-center font-bold text-gray-400 text-[10px]">
                           {mid.slice(-2)}
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{role as string}</p>
                           <p className="text-xs font-bold text-gray-500">Official Holder</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-indigo-600 text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="relative z-10">
                  <h4 className="text-lg font-black italic serif mb-4">Bureau Notice</h4>
                  <p className="text-xs font-medium text-indigo-100 leading-relaxed">Officials are responsible for the transparency and accountability of this community network. All records are time-stamped and signed.</p>
               </div>
            </div>
         </div>
      </div>

      {/* Announcements Modal */}
      {showAddAnn && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-[3rem] p-10 relative">
               <h2 className="text-2xl font-black serif italic mb-8">Broadcast Update</h2>
               <form onSubmit={handlePostAnnouncement} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Announcement Title</label>
                     <input type="text" required value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="e.g. Welfare Fund Update" className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Content (Markdown Supported)</label>
                     <textarea required value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Type announcement details here..." className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-sm font-medium outline-none h-48" />
                  </div>
                  <div className="flex gap-4">
                     <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Broadcast</button>
                     <button type="button" onClick={() => setShowAddAnn(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-xs">Cancel</button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}

      {/* Minutes Modal */}
      {showAddMinutes && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-[3rem] p-10 relative">
               <h2 className="text-2xl font-black serif italic mb-8">File Meeting Minutes</h2>
               <form onSubmit={handleSaveMinutes} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Meeting Date</label>
                     <input type="date" required value={minDate} onChange={e => setMinDate(e.target.value)} className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Minute Notes (Markdown)</label>
                     <textarea required value={minNotes} onChange={e => setMinNotes(e.target.value)} placeholder="Resolutions, points discussed, etc..." className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 text-sm font-medium outline-none h-48" />
                  </div>
                  <div className="flex gap-4">
                     <button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-xs">File Minutes</button>
                     <button type="button" onClick={() => setShowAddMinutes(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-xs">Close</button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}
    </div>
  );
}
