import React, { useState, useEffect, useRef } from 'react';
import { User as AuthUser } from 'firebase/auth';
import { 
  Send, 
  Image as ImageIcon, 
  Video, 
  Smile, 
  Camera, 
  MoreVertical, 
  PhoneCall, 
  Video as VideoCam,
  Mic,
  Paperclip,
  Share2,
  Heart,
  MessageCircle,
  Sparkles,
  X
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  limit,
  doc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { getSmartReply } from '../../services/geminiService';
import VideoCallModal from './VideoCallModal';
import EmojiPicker from 'emoji-picker-react';

interface Message {
  id: string;
  familyId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: any;
}

export default function Chat({ user, profile }: { user: AuthUser, profile: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Record<string, any>>({});
  const [familyData, setFamilyData] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [activeChannel, setActiveChannel] = useState<'lounge' | string>('lounge');
  const [isTyping, setIsTyping] = useState(false);
  const [smartReply, setSmartReply] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callTarget, setCallTarget] = useState('');
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profile?.familyId) return;

    const q = query(
      collection(db, 'messages'),
      where('familyId', '==', profile.familyId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs.reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'messages');
    });

    const uq = query(
      collection(db, 'users'),
      where('familyId', '==', profile.familyId)
    );
    const unsubUsers = onSnapshot(uq, (snap) => {
      const users: Record<string, any> = {};
      snap.forEach(doc => {
        users[doc.id] = doc.data();
      });
      setFamilyMembers(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const fref = doc(db, 'families', profile.familyId);
    const unsubFam = onSnapshot(fref, (snap) => {
      if (snap.exists()) setFamilyData(snap.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `families/${profile.familyId}`);
    });

    return () => { unsub(); unsubUsers(); unsubFam(); };
  }, [profile?.familyId]);

  useEffect(() => {
    // Check for private chat target from Profile
    const target = localStorage.getItem('privateChatTarget');
    if (target) {
       setActiveChannel(target);
       localStorage.removeItem('privateChatTarget');
    }
  }, []);

  useEffect(() => {
    if (!profile?.familyId) return;

    let unsubMsgs: () => void;

    if (activeChannel === 'lounge') {
       const q = query(
         collection(db, 'messages'),
         where('familyId', '==', profile.familyId),
         orderBy('createdAt', 'desc'),
         limit(50)
       );
       unsubMsgs = onSnapshot(q, (snap) => {
         const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
         setMessages(msgs.reverse());
       });
    } else {
       // Private Chat
       const participants = [user.uid, activeChannel].sort();
       const q = query(
         collection(db, 'private_messages'),
         where('participants', '==', participants),
         orderBy('createdAt', 'desc'),
         limit(50)
       );
       unsubMsgs = onSnapshot(q, (snap) => {
         const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
         setMessages(msgs.reverse());
       });
    }

    return () => unsubMsgs?.();
  }, [profile?.familyId, activeChannel, user.uid]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-generate smart reply when last message is from someone else
    if (messages.length > 0 && messages[messages.length - 1].senderId !== user.uid) {
        generateSmartSuggestion();
    } else {
        setSmartReply('');
    }
  }, [messages]);

  const generateSmartSuggestion = async () => {
    if (loadingReply) return;
    setLoadingReply(true);
    try {
        const lastMsgs = messages.slice(-5).map(m => ({
            text: m.text,
            senderId: m.senderId === user.uid ? 'Me' : 'Family Member'
        }));
        const reply = await getSmartReply(lastMsgs);
        setSmartReply(reply);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingReply(false);
    }
  };

  const handleGroupCall = () => {
     setIsGroupCall(true);
     setCallTarget('');
     setShowCallModal(true);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !profile?.familyId) return;

    const textToSend = inputText;
    setInputText('');

    if (activeChannel === 'lounge') {
      await addDoc(collection(db, 'messages'), {
        familyId: profile.familyId,
        senderId: user.uid,
        text: textToSend,
        createdAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'private_messages'), {
        participants: [user.uid, activeChannel].sort(),
        senderId: user.uid,
        text: textToSend,
        createdAt: serverTimestamp()
      });
    }
  };

  const sendMedia = async (type: 'image' | 'video') => {
    // Simulated media upload
    const url = type === 'image' 
        ? `https://picsum.photos/seed/${Date.now()}/800/600`
        : 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';
    
    if (activeChannel === 'lounge') {
      await addDoc(collection(db, 'messages'), {
        familyId: profile.familyId,
        senderId: user.uid,
        text: type === 'image' ? 'Sent a photo' : 'Sent a video',
        mediaUrl: url,
        mediaType: type,
        createdAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'private_messages'), {
        participants: [user.uid, activeChannel].sort(),
        senderId: user.uid,
        text: type === 'image' ? 'Sent a photo' : 'Sent a video',
        mediaUrl: url,
        mediaType: type,
        createdAt: serverTimestamp()
      });
    }
  };

  if (!profile?.familyId) {
    return (
        <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 bg-white dark:bg-zinc-900 rounded-[3rem] border border-black/5 dark:border-white/5">
            <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                <MessageCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-bold italic serif text-black dark:text-white">Chat is Locked</h3>
                <p className="text-gray-400 dark:text-gray-500 max-w-xs mx-auto">You need to join or create a family group to start chatting with your loved ones.</p>
            </div>
        </div>
    );
  }

  const activePartner = activeChannel !== 'lounge' ? (familyMembers[activeChannel] as any) : null;

  return (
    <div className="h-[calc(100vh-180px)] flex bg-white dark:bg-black rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
      {/* Channels Sidebar */}
      <div className="w-80 bg-gray-50 dark:bg-zinc-900 border-r border-black/5 dark:border-white/5 flex flex-col shrink-0">
         <div className="p-8 pb-4">
            <h2 className="text-xl font-black italic serif text-black dark:text-white">Messages</h2>
         </div>
         <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
            <button 
               onClick={() => setActiveChannel('lounge')}
               className={cn(
                 "w-full flex items-center gap-3 p-4 rounded-2xl transition-all",
                 activeChannel === 'lounge' ? "bg-black dark:bg-white text-white dark:text-black shadow-xl shadow-black/10 dark:shadow-white/10" : "hover:bg-white dark:hover:bg-zinc-800 text-gray-400 dark:text-gray-500 font-bold"
               )}
            >
               <MessageCircle className="w-5 h-5" />
               <span className="text-sm tracking-tight">Family Lounge</span>
            </button>

            <div className="pt-6 pb-2 px-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-600">Direct Nodes</span>
            </div>

            {(Object.values(familyMembers) as any[]).filter(m => m.uid !== user.uid).map(member => (
              <button 
                key={member.uid}
                onClick={() => setActiveChannel(member.uid)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl transition-all",
                  activeChannel === member.uid ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-lg border border-black/5 dark:border-white/5" : "hover:bg-white dark:hover:bg-zinc-800 text-gray-400 dark:text-gray-500 font-bold"
                )}
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden relative border border-black/5 dark:border-white/5">
                   <img src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.uid}`} className="w-full h-full object-cover" alt="S" referrerPolicy="no-referrer" />
                   <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <span className="text-sm tracking-tight truncate">{member.displayName}</span>
              </button>
            ))}
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-8 py-6 bg-white dark:bg-zinc-900 border-b border-gray-50 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/20 border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
              <img 
                src={activePartner ? (activePartner.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activePartner.uid}`) : (familyData?.photoURL || `https://picsum.photos/seed/family-${profile.familyId}/200/200`)} 
                className="w-full h-full object-cover" 
                alt="Target" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/5 rounded-[2rem]" />
            </div>
            <div>
              <h3 className="font-bold text-xl italic serif leading-tight text-black dark:text-white truncate">
                {activePartner ? activePartner.displayName : (familyData?.name || 'Household Lounge')}
              </h3>
              <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {activePartner ? 'Private Communication' : `${Object.keys(familyMembers).length} Members Online`}
                  </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
              <button onClick={handleGroupCall} className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-colors"><PhoneCall className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
              <button onClick={handleGroupCall} className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-colors"><VideoCam className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
              <button className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-colors"><MoreVertical className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30 dark:bg-black">
          <div className="text-center py-10">
              <span className="bg-white dark:bg-zinc-900 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-600 border border-black/[0.03] dark:border-white/[0.03]">Today</span>
          </div>

          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user.uid;
            const sender = familyMembers[msg.senderId];
            const senderName = sender?.displayName || 'Family Member';
            const senderPhoto = sender?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            
            return (
              <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={cn("flex gap-4 group", isMe ? "flex-row-reverse" : "flex-row")}
              >
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-zinc-800 overflow-hidden shrink-0 shadow-md border-2 border-white dark:border-zinc-900 self-end mb-4">
                  <img src={senderPhoto} className="w-full h-full object-cover" alt="S" referrerPolicy="no-referrer" />
                </div>
                
                <div className={cn("flex flex-col gap-1 max-w-[75%]", isMe ? "items-end" : "items-start")}>
                   {!isMe && (
                     <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mb-1">{senderName.split(' ')[0]}</span>
                   )}
                   <div className={cn(
                       "p-5 rounded-[2.5rem] shadow-sm relative transition-all group-hover:shadow-md",
                       isMe ? "bg-black dark:bg-white text-white dark:text-black rounded-br-none" : "bg-white dark:bg-zinc-900 text-black dark:text-white rounded-bl-none border border-black/5 dark:border-white/5"
                   )}>
                     {msg.mediaUrl && (
                       <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 group-hover:scale-[1.02] transition-transform">
                        {msg.mediaType === 'image' ? (
                            <img src={msg.mediaUrl} alt="Shared" className="w-full h-auto" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="bg-gray-100 aspect-video flex items-center justify-center relative">
                                <Video className="w-10 h-10 text-gray-400" />
                                <span className="absolute bottom-4 right-4 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md font-bold">1.2 MB</span>
                            </div>
                        )}
                    </div>
                  )}
                  <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  </div>
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.createdAt ? (
                          typeof msg.createdAt.toDate === 'function' 
                              ? format(msg.createdAt.toDate(), 'h:mm a') 
                              : (typeof msg.createdAt === 'string' || typeof msg.createdAt === 'number' 
                                  ? format(new Date(msg.createdAt), 'h:mm a') 
                                  : 'Just now')
                      ) : 'Just now'}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-8 bg-white dark:bg-zinc-900 border-t border-gray-50 dark:border-white/5 space-y-4 shrink-0">
          <AnimatePresence>
              {smartReply && !loadingReply && (
                  <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     className="flex items-center gap-2"
                  >
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl border border-orange-100 dark:border-orange-500/20">
                          <Sparkles className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                      </div>
                      <button 
                          onClick={() => setInputText(smartReply)}
                          className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-2xl text-xs font-bold transition-all"
                      >
                          {smartReply}
                      </button>
                      <button onClick={() => setSmartReply('')} className="p-2 text-gray-300 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white"><X className="w-3 h-3" /></button>
                  </motion.div>
              )}
          </AnimatePresence>

          <form onSubmit={handleSend} className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => sendMedia('image')} className="p-3 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-all"><ImageIcon className="w-5 h-5" /></button>
              <button type="button" onClick={() => sendMedia('video')} className="p-3 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-all"><Video className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 relative min-w-0">
              <input 
                placeholder="Speak to your family..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-[2rem] p-5 text-sm font-medium outline-none text-black dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-300 dark:text-gray-500 hover:text-black dark:hover:text-white"
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-4 z-50">
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => {
                        setInputText(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="w-16 h-16 shrink-0 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] flex items-center justify-center shadow-xl shadow-black/20 dark:shadow-white/10 hover:scale-110 active:scale-95 transition-all disabled:opacity-20 disabled:hover:scale-100"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>

          <div className="flex items-center justify-between px-2 pt-2 gap-4">
              <div className="flex items-center gap-6">
                  <button className="flex items-center gap-2 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white"><Mic className="w-4 h-4" /> Voice</button>
                  <button className="flex items-center gap-2 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white"><Paperclip className="w-4 h-4" /> File</button>
              </div>
              <p className="text-[10px] font-black text-gray-200 dark:text-gray-700 uppercase tracking-widest truncate">End-to-End Encrypted Node</p>
          </div>
        </div>
      </div>

      {showCallModal && (
         <VideoCallModal 
            onClose={() => setShowCallModal(false)} 
            targetName={callTarget} 
            isGroup={isGroupCall} 
         />
      )}
    </div>
  );
}
