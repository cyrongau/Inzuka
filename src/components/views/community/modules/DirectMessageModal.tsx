import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../../../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit, doc, setDoc } from 'firebase/firestore';
import { X, Send, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../../lib/utils';

export default function DirectMessageModal({ 
  currentUser, 
  targetMember, 
  onClose,
  targetProfile
}: { 
  currentUser: any; 
  targetMember: any; 
  onClose: () => void;
  targetProfile: any;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageLimit, setMessageLimit] = useState(50);
  const [isTargetTyping, setIsTargetTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser?.uid || !targetMember?.uid) return;

    const participants = [currentUser.uid, targetMember.uid].sort();
    const channelId = participants.join('_');
    
    const unsubTyping = onSnapshot(doc(db, 'typing_status', channelId), (docSnap) => {
       if (docSnap.exists()) {
         const data = docSnap.data();
         if (data[targetMember.uid] && (Date.now() - data[targetMember.uid]) < 5000) {
           setIsTargetTyping(true);
         } else {
           setIsTargetTyping(false);
         }
       } else {
         setIsTargetTyping(false);
       }
    });

    // Using exact match on sorted array avoids composite index error for array-contains + orderBy
    const q = query(
      collection(db, 'private_messages'),
      where('participants', '==', participants),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );

    const unsub = onSnapshot(q, (snap) => {
      let msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
      // Sort ascending for display
      msgs.sort((a: any, b: any) => {
         const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
         const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
         return tA - tB;
      });
      
      setMessages(msgs);
      // Auto-scroll on initial load when limit is 50
      if (messageLimit === 50) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'private_messages');
    });
    return () => { unsub(); unsubTyping(); };
  }, [currentUser?.uid, targetMember?.uid, messageLimit]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const participants = [currentUser.uid, targetMember.uid].sort();
    const channelId = participants.join('_');
    const docRef = doc(db, 'typing_status', channelId);
    setDoc(docRef, { [currentUser.uid]: Date.now() }, { merge: true }).catch(() => {});
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    
    const participants = [currentUser.uid, targetMember.uid].sort();

    try {
      await addDoc(collection(db, 'private_messages'), {
        participants,
        senderId: currentUser.uid,
        text: msgText,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: targetMember.uid,
        type: 'message',
        title: 'New Community Message',
        message: `New message from ${currentUser.displayName || 'a member'}: ${msgText.substring(0, 30)}${msgText.length > 30 ? '...' : ''}`,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/5 flex flex-col overflow-hidden h-[80vh]"
      >
        <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-800 flex items-center justify-center">
                {targetProfile?.photoURL ? (
                  <img src={targetProfile.photoURL} alt={targetProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-gray-400" />
                )}
             </div>
             <div>
                <h3 className="font-bold text-black dark:text-white text-sm">
                  {targetProfile?.displayName || 'Anonymous'}
                </h3>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active Chat</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length >= messageLimit && (
            <div className="text-center pb-2">
               <button 
                 onClick={() => setMessageLimit(prev => prev + 50)}
                 className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-full text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors border border-black/5 dark:border-white/5 shadow-sm uppercase tracking-widest"
               >
                 Load Earlier Messages
               </button>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-3">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center">
                <Send className="w-6 h-6 ml-1" />
              </div>
              <div>
                <p className="text-sm font-bold text-black dark:text-white">Start a conversation</p>
                <p className="text-xs text-gray-500">Say hello to {targetProfile?.displayName?.split(' ')[0]}</p>
              </div>
            </div>
          ) : (
             messages.map((m) => {
               const isMe = m.senderId === currentUser.uid;
               return (
                 <div key={m.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                   <div className={cn(
                     "max-w-[75%] p-3 rounded-2xl text-sm",
                     isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 dark:bg-zinc-900 text-black dark:text-white rounded-bl-sm"
                   )}>
                     <p>{m.text}</p>
                     <p className={cn(
                       "text-[8px] mt-1 text-right",
                       isMe ? "text-blue-200" : "text-gray-400"
                     )}>
                       {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                     </p>
                   </div>
                 </div>
               );
             })
          )}
          {isTargetTyping && (
             <div className="flex w-full justify-start mt-2">
               <div className="bg-gray-100 dark:bg-zinc-900 rounded-2xl p-3 flex items-center gap-1 w-12 rounded-bl-sm border border-black/5 dark:border-white/5">
                  <span className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
               </div>
             </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 bg-white dark:bg-zinc-950 border-t border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-900 p-1 pl-3 rounded-2xl border border-black/5 dark:border-white/5">
            <input 
              type="text" 
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTyping}
              className="flex-1 bg-transparent border-none outline-none text-sm dark:text-white"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
