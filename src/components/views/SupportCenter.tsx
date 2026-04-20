import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  HelpCircle, 
  MessageSquare, 
  AlertTriangle, 
  Send,
  Ticket,
  Clock,
  CheckCircle2,
  ChevronDown,
  Flag,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export default function SupportCenter({ user, profile }: { user: User, profile: any }) {
  const [activeTab, setActiveTab] = useState<'help' | 'report' | 'chats'>('help');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetId, setTargetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myReports, setMyReports] = useState<any[]>([]);
  const [myConversations, setMyConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const unsubTickets = onSnapshot(query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ), snap => setMyTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubReports = onSnapshot(query(
      collection(db, 'reports'),
      where('reporterId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ), snap => setMyReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubConvs = onSnapshot(query(
      collection(db, 'support_conversations'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ), snap => setMyConversations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => {
      unsubTickets();
      unsubReports();
      unsubConvs();
    };
  }, [user.uid]);

  useEffect(() => {
    if (!selectedChat) return;
    const unsubMsg = onSnapshot(query(
      collection(db, 'support_conversations', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    ), snap => setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubMsg();
  }, [selectedChat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (activeTab === 'help') {
        await addDoc(collection(db, 'support_tickets'), {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
          subject,
          message,
          status: 'open',
          createdAt: serverTimestamp()
        });
        toast.success("Support ticket submitted. Our team will review it shortly.");
      } else {
        await addDoc(collection(db, 'reports'), {
          reporterId: user.uid,
          reporterEmail: user.email,
          targetId: targetId || 'general',
          subject,
          reason: message,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        toast.success("Report submitted securely to Overwatch Administration.");
      }
      setSubject('');
      setMessage('');
      setTargetId('');
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;

    await addDoc(collection(db, 'support_conversations', selectedChat.id, 'messages'), {
      text: replyText,
      senderId: user.uid,
      senderEmail: user.email,
      isAdmin: false,
      createdAt: serverTimestamp()
    });

    setReplyText('');
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="bg-black text-white p-8 md:p-12 rounded-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black italic serif tracking-tight mb-2">Help & Resolution</h1>
          <p className="text-gray-400 font-medium max-w-md">Our Overwatch administrators are here to support you. Ask a question or report violations to keep our community safe.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-full md:w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('help')}
          className={cn(
            "flex-none px-6 py-3 rounded-xl font-bold mb-0 text-sm transition-all",
            activeTab === 'help' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"
          )}
        >
          <div className="flex items-center gap-2 justify-center">
             <MessageSquare className="w-4 h-4" /> Get Support
          </div>
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={cn(
            "flex-none px-6 py-3 rounded-xl font-bold mb-0 text-sm transition-all",
            activeTab === 'report' ? "bg-white shadow-sm text-red-600" : "text-gray-500 hover:text-red-500"
          )}
        >
          <div className="flex items-center gap-2 justify-center">
             <AlertTriangle className="w-4 h-4" /> Report an Issue
          </div>
        </button>
        {myConversations.length > 0 && (
          <button
            onClick={() => setActiveTab('chats')}
            className={cn(
              "flex-none px-6 py-3 rounded-xl font-bold mb-0 text-sm transition-all",
              activeTab === 'chats' ? "bg-white shadow-sm text-purple-600" : "text-gray-500 hover:text-purple-500"
            )}
          >
            <div className="flex items-center gap-2 justify-center">
               <ShieldCheck className="w-4 h-4" /> Official Support Channels
            </div>
          </button>
        )}
      </div>

      {/* Conditional Rendering Area */}
      {activeTab === 'chats' ? (
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
           <h3 className="text-xl font-bold italic serif">Support Channels</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                 {myConversations.map(c => (
                   <div 
                     key={c.id} 
                     onClick={() => setSelectedChat(c)}
                     className={cn(
                       "p-4 border rounded-2xl cursor-pointer transition-all",
                       selectedChat?.id === c.id ? "bg-black text-white border-black" : "bg-gray-50 border-black/5 hover:border-black/20"
                     )}
                   >
                      <h4 className="font-bold text-sm truncate">{c.subject}</h4>
                      <p className={cn("text-[8px] font-mono mt-1", selectedChat?.id === c.id ? "text-white/40" : "text-gray-400")}>Ref: {c.relatedId}</p>
                   </div>
                 ))}
              </div>
              <div className="md:col-span-2 flex flex-col h-[400px] bg-gray-50 rounded-3xl border border-black/5 overflow-hidden">
                 {selectedChat ? (
                    <>
                      <div className="p-4 bg-white border-b border-black/5">
                         <h4 className="font-bold text-sm">{selectedChat.subject}</h4>
                         <p className="text-[10px] text-gray-400">Communication with Overwatch Administration</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                         {chatMessages.map((m, i) => (
                             <div key={m.id || i} className={cn("flex", m.isAdmin ? "justify-start" : "justify-end")}>
                                <div className="flex flex-col gap-1 max-w-[85%]">
                                   {m.isAdmin && (
                                     <div className="flex items-center gap-2 mb-1">
                                       <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">OA</div>
                                       <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Overwatch Official</span>
                                     </div>
                                   )}
                                   <div className={cn(
                                     "p-4 rounded-[2rem] text-sm font-medium shadow-sm transition-all",
                                     m.isAdmin 
                                       ? "bg-red-50 text-red-900 border border-red-100 rounded-tl-none ring-1 ring-red-200/50" 
                                       : "bg-black text-white rounded-tr-none"
                                   )}>
                                     <p className="leading-relaxed">{m.text}</p>
                                     <p className={cn("text-[8px] mt-2 opacity-50 font-mono", m.isAdmin ? "text-red-700" : "text-white/70")}>
                                        {m.createdAt?.toDate() ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                     </p>
                                   </div>
                                </div>
                             </div>
                         ))}
                      </div>
                      <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-black/5 flex gap-2">
                         <input 
                           type="text" 
                           placeholder="Type your reply..." 
                           value={replyText}
                           onChange={e => setReplyText(e.target.value)}
                           className="flex-1 bg-gray-50 border border-black/5 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black/10"
                         />
                         <button className="p-2 bg-black text-white rounded-xl">
                            <Send className="w-4 h-4" />
                         </button>
                      </form>
                    </>
                 ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 italic text-sm p-12 text-center">
                       Select an official channel to begin correspondence.
                    </div>
                 )}
              </div>
           </div>
        </div>
      ) : (
        <>
          {/* Form Area */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
               <AnimatePresence mode="popLayout">
                  {activeTab === 'report' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter Network/Community ID if applicable"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-red-100"
                      />
                      <p className="text-xs text-gray-400">Leave blank if this is a general platform complaint.</p>
                    </motion.div>
                  )}
               </AnimatePresence>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subject</label>
                 <input
                    type="text"
                    placeholder={activeTab === 'help' ? "How can we help you today?" : "Reason for reporting"}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-black/10"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Detailed Description</label>
                 <textarea
                    placeholder="Please provide as much detail as possible..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl p-4 min-h-[150px] font-medium outline-none focus:ring-2 focus:ring-black/10"
                 />
               </div>

               <div className="pt-4 flex justify-end">
                 <button
                   type="submit"
                   disabled={isSubmitting || !subject.trim() || !message.trim()}
                   className={cn(
                     "px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest",
                     activeTab === 'help' ? "bg-black text-white hover:scale-[1.02]" : "bg-red-500 text-white hover:bg-red-600"
                   )}
                 >
                   {isSubmitting ? 'Transmitting...' : (activeTab === 'help' ? 'Submit Ticket' : 'Submit Report')}
                   <Send className="w-4 h-4" />
                 </button>
               </div>
            </form>
          </div>

          {/* History Area */}
          <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden">
             <button 
               onClick={() => setShowHistory(!showHistory)}
               className="w-full flex items-center justify-between p-8 hover:bg-gray-50 transition-colors"
             >
               <div className="flex items-center gap-3 text-left">
                 <Clock className="w-6 h-6 text-gray-400" />
                 <div>
                   <h3 className="font-bold text-lg">My Submissions History</h3>
                   <p className="text-sm text-gray-500">View your past tickets, reports, and administrative responses.</p>
                 </div>
               </div>
               <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", showHistory && "rotate-180")} />
             </button>
             
             <AnimatePresence>
                {showHistory && (
                  <motion.div 
                   initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                   className="border-t border-black/5 overflow-hidden"
                  >
                     <div className="p-8 space-y-8">
                        <div className="space-y-4">
                           <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400">Support Tickets ({myTickets.length})</h4>
                           {myTickets.map(t => (
                             <div key={t.id} className="bg-gray-50 p-6 rounded-3xl border border-black/5">
                                <div className="flex justify-between items-start mb-2">
                                   <h5 className="font-bold">{t.subject}</h5>
                                   <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md", t.status === 'open' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>{t.status}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">{t.message}</p>
                                {t.adminResponse && (
                                   <div className="bg-green-50/50 p-4 rounded-xl border border-green-100/50 mt-4">
                                      <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1 shadow-sm">Resolution Feedback</p>
                                      <p className="text-sm font-medium text-green-900">{t.adminResponse}</p>
                                   </div>
                                )}
                             </div>
                           ))}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-black/5">
                           <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex flex-row items-center gap-2">Reports <Flag className="w-4 h-4"/> ({myReports.length})</h4>
                           {myReports.map(r => (
                             <div key={r.id} className="bg-gray-50 p-6 rounded-3xl border border-black/5">
                                <div className="flex justify-between items-start mb-2">
                                   <h5 className="font-bold">{r.subject}</h5>
                                   <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md", r.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-700")}>{r.status}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">{r.reason}</p>
                                {r.adminResponse && (
                                   <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 mt-4">
                                      <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1 shadow-sm">Overwatch Action</p>
                                      <p className="text-sm font-medium text-blue-900">{r.adminResponse}</p>
                                   </div>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
