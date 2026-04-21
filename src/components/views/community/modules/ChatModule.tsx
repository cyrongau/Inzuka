import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { cn } from '../../../../lib/utils';

export default function CommunityChatModule({ community, user }: { community: any, user: User }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'communities', community.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    return () => unsub();
  }, [community.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      text: newMessage,
      userId: user.uid,
      userName: user.displayName || 'Anonymous User',
      userPhoto: user.photoURL,
      createdAt: serverTimestamp(),
      isModerator: community.moderatorIds?.includes(user.uid) || community.creatorId === user.uid
    };

    setNewMessage('');
    await addDoc(collection(db, 'communities', community.id, 'messages'), messageData);
  };

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm h-[600px] flex flex-col overflow-hidden">
      {/* Feed Header */}
      <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold">
               {community.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
               <h3 className="text-sm font-bold text-black dark:text-white">Main Chat</h3>
               <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Real-time chat with {community.name}</p>
            </div>
         </div>
         <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-400 dark:text-gray-500" />
         </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => {
             const isMe = m.userId === user.uid;
             const role = community.memberRoles?.[m.userId] || (community.creatorId === m.userId ? 'admin' : 'member');
             const isOfficial = m.isModerator || community.creatorId === m.userId || ['chairman', 'treasurer', 'secretary'].includes(role);
             
             return (
               <div key={m.id || i} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                  {!isMe && (
                    <div className={cn(
                      "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-black border border-black/5 dark:border-white/5 shadow-sm relative transition-all",
                      isOfficial ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20 ring-4 ring-red-500/5 dark:ring-red-500/10 scale-110" : "bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-gray-500"
                    )}>
                      {isOfficial ? role.slice(0, 1).toUpperCase() : (
                        m.userPhoto ? <img src={m.userPhoto} alt="img" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" /> : m.userName?.slice(0, 2).toUpperCase()
                      )}
                      {isOfficial && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                           <ShieldCheck className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className={cn("max-w-[70%] space-y-1", isMe ? "items-end" : "items-start")}>
                     <div className={cn("flex items-center gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                        <p className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          isOfficial ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                        )}>{m.userName} {isOfficial && `• ${role}`}</p>
                     </div>
                     <div className={cn(
                       "p-4 rounded-[1.8rem] text-sm font-medium shadow-xs transition-all",
                       isMe ? "bg-black dark:bg-white text-white dark:text-black rounded-tr-none" : 
                       isOfficial ? "bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-200 border border-red-100 dark:border-red-500/20 rounded-tl-none" : 
                       "bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/5 rounded-tl-none"
                     )}>
                        {m.text}
                     </div>
                     <p className="text-[8px] text-gray-400 dark:text-gray-600 font-mono italic">
                        {m.createdAt?.toDate ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                     </p>
                  </div>
               </div>
             );
          })}
         {messages.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center opacity-30">
              <Clock className="w-12 h-12 mb-4 text-black dark:text-white" />
              <p className="text-xs font-bold uppercase tracking-widest text-black dark:text-white">No previous history found</p>
           </div>
         )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/50">
         <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl p-2 pl-4">
            <input 
              type="text" 
              placeholder="Send a message to the group..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium py-2 dark:text-white dark:placeholder:text-gray-500"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
            >
               <Send className="w-4 h-4" />
            </button>
         </div>
      </form>
    </div>
  );
}
