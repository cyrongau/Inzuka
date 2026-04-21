import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  ShieldAlert, 
  Trash2, 
  AlertTriangle, 
  Search,
  CheckCircle2,
  Ban,
  Activity,
  MessageSquare,
  Flag,
  Globe,
  Send,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, deleteDoc, orderBy, setDoc, serverTimestamp, addDoc, limit } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export default function SystemAdminDashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'hubs' | 'reports' | 'tickets' | 'chats'>('hubs');
  const [communities, setCommunities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Listen to all communities
    const unsubComm = onSnapshot(collection(db, 'communities'), (snap) => {
      setCommunities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubRep = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTick = onSnapshot(query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc')), (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConv = onSnapshot(query(collection(db, 'support_conversations'), orderBy('createdAt', 'desc')), (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubComm();
      unsubRep();
      unsubTick();
      unsubConv();
    };
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const unsubMsg = onSnapshot(query(
      collection(db, 'support_conversations', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    ), (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubMsg();
  }, [selectedChat]);

  const handleStartChat = async (targetUserId: string, email: string, subject: string, relatedId: string) => {
    try {
      const convId = `${relatedId}_support`;
      await setDoc(doc(db, 'support_conversations', convId), {
        userId: targetUserId,
        userEmail: email,
        adminId: user.uid,
        adminEmail: user.email,
        subject: `Support: ${subject}`,
        relatedId: relatedId,
        status: 'active',
        createdAt: serverTimestamp()
      }, { merge: true });
      setActiveTab('chats');
      setSelectedChat({ id: convId, userId: targetUserId, userEmail: email, subject: `Support: ${subject}` });
      toast.success("Direct support channel opened.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to open chat.");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;

    await addDoc(collection(db, 'support_conversations', selectedChat.id, 'messages'), {
      text: replyText,
      senderId: user.uid,
      senderEmail: user.email,
      isAdmin: true,
      createdAt: serverTimestamp()
    });

    setReplyText('');
  };

  const handleStatusChange = async (id: string, currentStatus: string, newStatus: string) => {
    if (newStatus === 'deleted') {
      if (window.confirm("CRITICAL WARNING: Are you sure you want to permanently delete this community? All records will be expunged.")) {
        try {
          await deleteDoc(doc(db, 'communities', id));
          toast.success("Community permanently expunged.");
        } catch (e) {
           console.error(e);
           toast.error("Failed to delete network.");
        }
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'communities', id), {
        status: newStatus,
        strikeCount: newStatus === 'warned' ? 1 : (newStatus === 'active' ? 0 : 3)
      });
      toast.success(`Community status updated to ${newStatus}`);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCommunities = communities.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 pb-24">
      {/* Admin Header */}
      <div className="bg-red-500 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
         <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/50 rounded-full blur-[100px] pointer-events-none"></div>
         
         <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/20">
               <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <div>
               <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">Overwatch</h1>
               <p className="text-red-100 font-medium">System Administration & Policy Enforcement Center</p>
            </div>
         </div>

         <div className="relative z-10 bg-black/20 p-6 rounded-[2rem] backdrop-blur-lg border border-white/10 flex gap-12 text-center">
            <div>
               <p className="text-4xl font-black">{communities.length}</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-red-200 mt-1">Total Hubs</p>
            </div>
            <div>
               <p className="text-4xl font-black">{communities.filter(c => c.status === 'suspended').length}</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-red-200 mt-1">Suspended</p>
            </div>
         </div>
      </div>

      {/* Control Panel Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-zinc-900 p-1 rounded-2xl w-full md:w-fit overflow-x-auto border border-black/5 dark:border-white/5 shadow-sm">
        {['hubs', 'reports', 'tickets', 'chats'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={cn(
              "flex-none px-6 py-3 rounded-xl font-bold mb-0 text-sm transition-all capitalize",
              activeTab === t ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-gray-500 hover:text-black dark:hover:text-white"
            )}
          >
            {t === 'hubs' && <Globe className="w-4 h-4 inline mr-2" />}
            {t === 'reports' && <Flag className="w-4 h-4 inline mr-2" />}
            {t === 'tickets' && <MessageSquare className="w-4 h-4 inline mr-2" />}
            {t === 'chats' && <MessageSquare className="w-4 h-4 inline mr-2" />}
            {t === 'hubs' ? 'Network Audits' : t === 'reports' ? `Violations (${reports.length})` : t === 'tickets' ? `Tickets (${tickets.length})` : 'Live Support'}
          </button>
        ))}
      </div>

      {/* Control Panel Body */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-black/5 dark:border-white/5 shadow-sm space-y-8">
         {activeTab === 'hubs' && (
           <>
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h2 className="text-xl font-bold italic serif flex items-center gap-2 text-black dark:text-white">
                   <Activity className="w-5 h-5 text-red-500" /> Network Audits
                </h2>
                <div className="relative w-full md:w-96">
                   <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                   <input 
                     type="text" 
                     placeholder="Search networks by ID or Name..."
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all font-medium text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                   />
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                     <tr className="border-b border-black/5 dark:border-white/5">
                       <th className="pb-4 pt-2 font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 w-1/3">Network Identity</th>
                       <th className="pb-4 pt-2 font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">Architecture</th>
                       <th className="pb-4 pt-2 font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">Population</th>
                       <th className="pb-4 pt-2 font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</th>
                       <th className="pb-4 pt-2 font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right pr-4">Enforcement</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.05]">
                     {filteredCommunities.map(comm => (
                       <tr key={comm.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4">
                            <p className="font-bold text-sm tracking-tight text-black dark:text-white">{comm.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">ID: {comm.id}</p>
                          </td>
                          <td className="py-4">
                            <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-black/5 dark:border-white/5">{comm.type || 'Standard'}</span>
                          </td>
                          <td className="py-4 text-black dark:text-white">
                            <span className="font-bold text-sm">{comm.memberIds?.length || 0}</span> <span className="text-xs text-gray-400 dark:text-gray-500">Members</span>
                          </td>
                          <td className="py-4">
                            <div className={cn(
                               "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                               comm.status === 'active' ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50" :
                               comm.status === 'warned' ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50" :
                               "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
                            )}>
                               {comm.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> :
                                comm.status === 'warned' ? <AlertTriangle className="w-3 h-3" /> :
                                <Ban className="w-3 h-3" />}
                               {comm.status || 'active'}
                            </div>
                          </td>
                          <td className="py-4 text-right flex justify-end gap-2 pr-4">
                            <button 
                              onClick={() => handleStatusChange(comm.id, comm.status, 'active')}
                              className="w-8 h-8 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/5 text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all font-bold"
                            > restore </button>
                          </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </div>
           </>
         )}

         {activeTab === 'reports' && (
           <div className="space-y-6">
              {reports.map(r => (
                <div key={r.id} className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-black/5 dark:border-white/5">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Reported</span>
                       <h4 className="font-bold text-lg mt-2 text-black dark:text-white">{r.subject}</h4>
                     </div>
                     <button 
                       onClick={() => handleStartChat(r.reporterId, r.reporterEmail, r.subject, r.id)}
                       className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 flex items-center gap-1 transition-all"
                     >
                       <MessageSquare className="w-3 h-3" /> Chat with Reporter
                     </button>
                   </div>
                   <p className="text-sm text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-black/5 dark:border-white/5">{r.reason}</p>
                </div>
              ))}
           </div>
         )}

         {activeTab === 'tickets' && (
           <div className="space-y-6">
              {tickets.map(t => (
                <div key={t.id} className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-black/5 dark:border-white/5">
                   <div className="flex justify-between items-start mb-4">
                     <h4 className="font-bold text-lg text-black dark:text-white">{t.subject}</h4>
                     <button 
                       onClick={() => handleStartChat(t.userId, t.userEmail, t.subject, t.id)}
                       className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 flex items-center gap-1 transition-all"
                     >
                       <MessageSquare className="w-3 h-3" /> Support
                     </button>
                   </div>
                   <p className="text-sm text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-black/5 dark:border-white/5">{t.message}</p>
                </div>
              ))}
           </div>
         )}

         {activeTab === 'chats' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
              <div className="space-y-3 lg:col-span-1 border-r border-black/5 dark:border-white/5 pr-4 overflow-y-auto max-h-[500px]">
                 {conversations.map(c => (
                   <div 
                     key={c.id} 
                     onClick={() => setSelectedChat(c)}
                     className={cn(
                       "p-4 border rounded-2xl cursor-pointer transition-all",
                       selectedChat?.id === c.id ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xl" : "bg-gray-50 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
                     )}
                   >
                      <p className={cn("text-[8px] font-black uppercase tracking-widest mb-1 opacity-60", selectedChat?.id === c.id ? "text-white/80 dark:text-black/80" : "text-gray-500 dark:text-gray-400")}>Target: {c.userEmail}</p>
                      <h4 className="font-bold text-sm truncate">{c.subject}</h4>
                   </div>
                 ))}
                 {conversations.length === 0 && <p className="text-center text-gray-400 dark:text-gray-600 py-12 text-xs italic">No active support channels.</p>}
              </div>

              <div className="lg:col-span-2 flex flex-col h-[500px] bg-gray-50 dark:bg-zinc-800/50 rounded-[2.5rem] border border-black/5 dark:border-white/5 overflow-hidden">
                 {selectedChat ? (
                    <>
                      <div className="p-6 border-b border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 flex items-center justify-between">
                         <div>
                            <h3 className="font-bold text-sm text-black dark:text-white">{selectedChat.subject}</h3>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Recipient: {selectedChat.userEmail}</p>
                         </div>
                         <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-[8px] font-black uppercase tracking-widest rounded-full">Official Channel</div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                         {messages.map((m, i) => (
                            <div key={m.id || i} className={cn("flex", m.isAdmin ? "justify-end" : "justify-start")}>
                               <div className="flex flex-col gap-1 max-w-[80%]">
                                  {m.isAdmin && (
                                    <div className="flex items-center gap-2 justify-end mb-1">
                                       <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-widest">System Admin</span>
                                       <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-black text-white border border-red-500">OA</div>
                                    </div>
                                  )}
                                  <div className={cn(
                                    "p-4 rounded-[1.8rem] text-sm font-medium shadow-sm transition-all",
                                    m.isAdmin ? "bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-100 border border-red-100 dark:border-red-500/20 rounded-tr-none" : "bg-white dark:bg-black text-black dark:text-white border border-black/5 dark:border-white/10 rounded-tl-none"
                                  )}>
                                     <p className="leading-relaxed">{m.text}</p>
                                     <p className="text-[8px] mt-2 opacity-40 font-mono text-right">
                                        {m.createdAt?.toDate ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                     </p>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>

                      <form onSubmit={handleSendReply} className="p-4 bg-white dark:bg-zinc-900 border-t border-black/5 dark:border-white/5 flex gap-2">
                         <input 
                           type="text" 
                           placeholder="Type administrative response..." 
                           value={replyText}
                           onChange={e => setReplyText(e.target.value)}
                           className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 text-black dark:text-white"
                         />
                         <button className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                            <Send className="w-5 h-5" />
                         </button>
                      </form>
                    </>
                 ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 font-medium italic text-sm">Select a channel.</div>
                 )}
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
