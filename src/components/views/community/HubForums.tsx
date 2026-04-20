import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  MessageCircle, 
  Search, 
  Plus, 
  ArrowRight, 
  MessageSquare, 
  HandHelping,
  ShieldCheck,
  Flame,
  Clock,
  ArrowUpRight,
  X,
  Send,
  Loader2,
  ChevronLeft,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, addDoc, serverTimestamp, where, doc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface ForumThread {
  id: string;
  title: string;
  content: string;
  featuredImage?: string;
  authorId: string;
  authorName: string;
  category: string;
  communityId?: string;
  communityName?: string;
  views: number;
  replyCount: number;
  tags: string[];
  createdAt: any;
}

const FEATURED_THREADS: Record<string, any> = {
  'table-banking-guide': {
    id: 'table-banking-guide',
    title: 'Mastering Communal Wealth: A Guide to Table Banking 2026',
    content: 'Table Banking is the backbone of communal growth in Kenya. In this comprehensive guide, we explore how to structure your Chama for maximum yield while ensuring 100% transparency.\n\n### Topics covered include:\n\n* **Distribution of Dividends**: How to calculate returns fairly.\n* **Fine Structures**: Managing late payments without friction.\n* **Emergency Loan Management**: Setting up liquidity buffers.\n* **Digital Record Keeping**: Leveraging the Inzuka platform for trust.',
    category: 'Governance Models',
    authorName: 'Inzuka Editorial',
    views: 1240,
    replyCount: 12,
    createdAt: { toDate: () => new Date('2026-04-15') },
    featuredImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=2013'
  },
  'governance-rules': {
    id: 'governance-rules',
    title: 'The 5 Golden Rules of Transparent Chama Leadership',
    content: 'Leadership in a community group requires more than just goodwill. It requires systems. This article outlines the five non-negotiable rules for secretaries and treasurers to maintain trust within their networks.\n\n1. **Real-time settlement feeds**: Instant visibility for all members.\n2. **Dual-approval**: Security for large withdrawals.\n3. **Monthly auditing**: Digitized records for transparency.\n4. **Democratic voting**: Clear processes for projects.\n5. **Zero-tolerance**: Eliminating shadow accounting.',
    category: 'Governance Models',
    authorName: 'Governance Hub',
    views: 890,
    replyCount: 5,
    createdAt: { toDate: () => new Date('2026-04-18') },
    featuredImage: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?auto=format&fit=crop&q=80&w=2070'
  },
  'funeral-planning-guide': {
    id: 'funeral-planning-guide',
    title: 'Dignified Farewells: The Ultimate Guide to Funeral Committee Governance',
    content: 'Organizing a funeral committee requires sensitive yet firm governance. This guide covers how to handle contributions, record keeping, and service provider payments transparently during difficult times.\n\n### Key Daily Procedures:\n\n* **Dedicated Sub-accounts**: Keeping funeral funds separate from general welfare.\n* **Transparent Trackers**: Daily contribution reporting to the family.\n* **Provider Audits**: Verifying service deliveries before final payment clusters.',
    category: 'Success Stories',
    authorName: 'Inzuka Support',
    views: 2100,
    replyCount: 45,
    createdAt: { toDate: () => new Date('2026-04-10') },
    featuredImage: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=2070'
  },
  'chama-governance-101': {
    id: 'chama-governance-101',
    title: 'Chama Governance 101: From Table Banking to Prosperity',
    content: 'New to Chamas? This foundational article explains the legal and social structures required to turn a small group of savers into a powerful investment vehicle.\n\n### Learning Path:\n\n1. **Group Charter**: Defining the constitutional DNA.\n2. **Chairperson Role**: Leadership versus dictatorship.\n3. **Dispute Resolution**: Maintaining harmony through structured mediation.',
    category: 'Governance Models',
    authorName: 'Inzuka Editorial',
    views: 1560,
    replyCount: 18,
    createdAt: { toDate: () => new Date('2026-04-12') },
    featuredImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=2070'
  }
};

export default function HubForums({ user, initialThreadId }: { user: User, initialThreadId?: string }) {
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  
  // Create Thread State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General Discussion');
  const [featuredImage, setFeaturedImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thread Detail State
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const categories = [
    { icon: MessageSquare, label: "General Discussion" },
    { icon: HandHelping, label: "Support & Help" },
    { icon: ShieldCheck, label: "Governance Models" },
    { icon: Flame, label: "Success Stories" }
  ];

  useEffect(() => {
    // We use a simpler query and sort in memory to avoid index requirements for Category + CreatedAt
    const q = query(collection(db, 'forumThreads'), limit(100));

    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ForumThread));
      
      // If collection is empty, the user might want to see the "mocked" data they had before
      // but we prefer showing them how to create it. We'll handle empty state gracefully.

      // Filter by category if not 'all'
      if (activeCategory !== 'all') {
        data = data.filter(t => t.category === activeCategory);
      }

      // Sort by createdAt descending
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setThreads(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Forum Listener Error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [activeCategory]);

  useEffect(() => {
    if (initialThreadId) {
      const fetchThread = async () => {
        try {
          // Check editorial first
          if (FEATURED_THREADS[initialThreadId]) {
            setSelectedThread(FEATURED_THREADS[initialThreadId] as ForumThread);
            return;
          }

          const threadDoc = await getDocs(query(collection(db, 'forumThreads'), where('id', '==', initialThreadId), limit(1)));
          if (!threadDoc.empty) {
            setSelectedThread({ id: threadDoc.docs[0].id, ...threadDoc.docs[0].data() } as ForumThread);
          } else {
             const directDoc = await getDocs(query(collection(db, 'forumThreads'), limit(100)));
             const found = directDoc.docs.find(d => d.id === initialThreadId);
             if (found) {
               setSelectedThread({ id: found.id, ...found.data() } as ForumThread);
             }
          }
        } catch (err) {
          console.error("Deep link thread fetch error:", err);
        }
      };
      fetchThread();
    }
  }, [initialThreadId]);

  useEffect(() => {
    if (selectedThread) {
      const q = query(collection(db, 'forumThreads', selectedThread.id, 'comments'), orderBy('createdAt', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        const qNoSort = query(collection(db, 'forumThreads', selectedThread.id, 'comments'));
        onSnapshot(qNoSort, (snap) => {
           const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
           setComments(data.sort((a: any, b: any) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)));
        });
      });
      try {
        updateDoc(doc(db, 'forumThreads', selectedThread.id), {
          views: increment(1)
        });
      } catch (err) {
        // Silent catch for editorial articles
      }
      return () => unsub();
    }
  }, [selectedThread]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'forumThreads'), {
        title: newTitle,
        content: newContent,
        category: newCategory,
        featuredImage: featuredImage || null,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        views: 0,
        replyCount: 0,
        tags: [],
        createdAt: serverTimestamp()
      });
      toast.success("Article published to hub.");
      setShowCreate(false);
      setNewTitle('');
      setNewContent('');
      setFeaturedImage('');
    } catch (e) {
      toast.error("Failed to publish.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedThread) return;
    try {
      await addDoc(collection(db, 'forumThreads', selectedThread.id, 'comments'), {
        content: newComment,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        threadId: selectedThread.id,
        createdAt: serverTimestamp()
      });
      
      // Attempt to update reply count, but catch if document doesn't exist (e.g. static articles)
      try {
        await updateDoc(doc(db, 'forumThreads', selectedThread.id), {
          replyCount: increment(1)
        });
      } catch (err) {
        console.warn("Could not update replyCount (this is expected for editorial articles):", err);
      }

      // Create notification for thread author
      if (selectedThread.authorId && selectedThread.authorId !== user.uid) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: selectedThread.authorId,
            title: "New Agora Response",
            message: `${user.displayName || 'Someone'} responded to your article: "${selectedThread.title}"`,
            type: 'message',
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.warn("Could not create notification:", err);
        }
      }
      
      setNewComment('');
      toast.success("Response posted.");
    } catch (e) {
      console.error("Comment post error:", e);
      toast.error("Failed to post comment.");
    }
  };

  const handleUpdateThread = async () => {
    if (!selectedThread || !editTitle.trim() || !editContent.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'forumThreads', selectedThread.id), {
        title: editTitle,
        content: editContent,
        updatedAt: serverTimestamp()
      });
      setSelectedThread({ ...selectedThread, title: editTitle, content: editContent });
      setIsEditing(false);
      toast.success("Article updated.");
    } catch (e) {
      toast.error("Failed to update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedThread) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-20">
        <button 
          onClick={() => setSelectedThread(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors font-bold uppercase text-[10px] tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Agora
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[3rem] p-0 border border-black/5 shadow-sm overflow-hidden">
               {selectedThread.featuredImage && (
                 <div className="w-full h-80 overflow-hidden relative group">
                    <img 
                      src={selectedThread.featuredImage} 
                      alt={selectedThread.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                 </div>
               )}
               <div className="p-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-100">
                        {selectedThread.category}
                      </span>
                    </div>
                    {selectedThread.authorId === user.uid && !FEATURED_THREADS[selectedThread.id] && (
                      <button 
                        onClick={() => {
                          setIsEditing(true);
                          setEditTitle(selectedThread.title);
                          setEditContent(selectedThread.content);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                      >
                        Edit Article
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <input 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-3xl font-black italic serif bg-gray-50 p-4 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-black/5"
                        placeholder="Article Title"
                      />
                      <textarea 
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-80 bg-gray-50 p-6 rounded-3xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-black/5 text-lg leading-relaxed font-light text-gray-600 resize-none"
                        placeholder="Write your update..."
                      />
                      <div className="flex gap-4">
                        <button 
                          onClick={handleUpdateThread}
                          disabled={isSubmitting}
                          className="px-8 py-3 bg-black text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </button>
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="px-8 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase text-[10px] tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl md:text-4xl font-black italic serif leading-tight tracking-tight">{selectedThread.title}</h1>
                      <div className="flex items-center gap-4 py-4 border-y border-black/[0.03]">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                          {selectedThread.authorName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{selectedThread.authorName}</p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {selectedThread.createdAt && formatDistanceToNow(selectedThread.createdAt.toDate ? selectedThread.createdAt.toDate() : selectedThread.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="prose prose-sm md:prose-base max-w-none text-gray-600 leading-relaxed font-medium markdown-content">
                        <ReactMarkdown>{selectedThread.content}</ReactMarkdown>
                      </div>
                    </>
                  )}
               </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold italic serif px-4">Responses ({comments.length})</h3>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-xs">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center font-bold text-[10px] border border-black/5">
                        {comment.authorName?.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{comment.authorName}</span>
                        <span className="text-[9px] text-gray-400">
                          {comment.createdAt && formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="prose prose-xs max-w-none text-gray-600 leading-relaxed font-medium markdown-content">
                      <ReactMarkdown>{comment.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-lg space-y-4">
                <textarea 
                  placeholder="Share your wisdom..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl p-6 text-sm font-medium outline-none border border-black/5 h-32 focus:ring-2 focus:ring-black/5 transition-all"
                />
                <button 
                  onClick={handlePostComment}
                  className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-xl shadow-black/10"
                >
                  <Send className="w-4 h-4" /> Post Response
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/40 transition-colors"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4 relative z-10">Agora Insight</h4>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-2xl font-black">{selectedThread.views}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Engagement</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-2xl font-black">{selectedThread.replyCount}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Consensus</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-4xl font-black italic serif tracking-tight">Forums & Support</h1>
            <p className="text-gray-400 font-medium">The Inzuka Knowledge Agora. Discussion, support, and communal wisdom.</p>
         </div>
         <button 
          onClick={() => setShowCreate(true)}
          className="px-8 py-4 bg-black text-white rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10"
         >
            <Plus className="w-4 h-4" /> Start Discussion
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 pl-4 py-2">Categories</h3>
            <button 
               onClick={() => setActiveCategory('all')}
               className={cn(
                 "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                 activeCategory === 'all' ? "bg-black text-white shadow-xl shadow-black/10" : "bg-white border border-black/5 text-gray-600 hover:border-black/20"
               )}
            >
               <div className="flex items-center gap-3">
                  <Clock className={cn("w-4 h-4", activeCategory === 'all' ? "text-white" : "text-gray-400")} />
                  <span className="text-sm font-bold">All Discussions</span>
               </div>
            </button>
            {categories.map((cat, i) => (
               <button 
                key={i} 
                onClick={() => setActiveCategory(cat.label)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                  activeCategory === cat.label ? "bg-black text-white shadow-xl shadow-black/10" : "bg-white border border-black/5 text-gray-600 hover:border-black/20 focus:scale-[1.01]"
                )}
               >
                  <div className="flex items-center gap-3">
                     <cat.icon className={cn("w-4 h-4", activeCategory === cat.label ? "text-white" : "text-gray-400 group-hover:text-black")} />
                     <span className="text-sm font-bold">{cat.label}</span>
                  </div>
               </button>
            ))}

            <div className="mt-8 bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center text-center space-y-2">
               <HandHelping className="w-8 h-8 text-orange-500" />
               <h4 className="text-sm font-bold text-orange-900 italic serif">Need Guard Help?</h4>
               <p className="text-[10px] text-orange-700/70 font-medium leading-relaxed">Reach out to our global hub for verified communal governance assistance.</p>
               <button className="pt-2 text-[10px] font-black uppercase tracking-widest text-orange-900 underline underline-offset-4">Get Support</button>
            </div>
         </div>

         {/* Threads Main Feed */}
         <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <button className="text-sm font-black italic serif underline underline-offset-8 decoration-2">Trending</button>
                  <button className="text-sm font-medium text-gray-400 hover:text-black transition-colors">Newest</button>
                  <button className="text-sm font-medium text-gray-400 hover:text-black transition-colors">Unanswered</button>
               </div>
               <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-black/5 group-focus-within:border-black transition-colors">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search knowledge base..." className="bg-transparent border-none focus:outline-none text-xs ml-3 w-40 font-medium" />
               </div>
            </div>

            {/* Promoted / Featured Section */}
            {!loading && threads.length === 0 && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    onClick={() => setSelectedThread(FEATURED_THREADS['table-banking-guide'])}
                    className="group bg-blue-600 rounded-[3rem] p-8 text-white relative overflow-hidden flex flex-col justify-between h-80 cursor-pointer hover:scale-[1.02] transition-all shadow-xl shadow-blue-500/20"
                  >
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all"></div>
                     <div className="relative z-10 space-y-4">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md">Featured Article</span>
                        <h3 className="text-3xl font-black italic serif leading-tight">Mastering Communal Wealth: A Guide to Table Banking 2026</h3>
                     </div>
                     <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center font-black text-[10px]">I</div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Inzuka Editorial</span>
                        </div>
                        <ArrowUpRight className="w-6 h-6 animate-pulse" />
                     </div>
                  </div>
                  <div 
                    onClick={() => setSelectedThread(FEATURED_THREADS['governance-rules'])}
                    className="group bg-purple-600 rounded-[3rem] p-8 text-white relative overflow-hidden flex flex-col justify-between h-80 cursor-pointer hover:scale-[1.02] transition-all shadow-xl shadow-purple-500/20"
                  >
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all"></div>
                     <div className="relative z-10 space-y-4">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md">Governance Tip</span>
                        <h3 className="text-3xl font-black italic serif leading-tight">The 5 Golden Rules of Transparent Chama Leadership</h3>
                     </div>
                     <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center font-black text-[10px]">G</div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Governance Hub</span>
                        </div>
                        <ArrowUpRight className="w-6 h-6" />
                     </div>
                  </div>
               </div>
            )}

            <div className="space-y-6">
               {loading ? (
                 <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-black/5">
                   <Loader2 className="w-12 h-12 animate-spin text-black/10" />
                   <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-300">Synchronizing Knowledge Agora...</p>
                 </div>
               ) : threads.length === 0 ? (
                 <div className="text-center py-32 bg-white rounded-[3rem] border border-black/5 border-dashed">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-10 h-10 text-gray-200" />
                    </div>
                    <p className="text-lg font-bold text-gray-400 italic serif">No discussions found in this channel.</p>
                    <button 
                      onClick={() => setShowCreate(true)}
                      className="mt-4 text-xs font-black uppercase tracking-widest text-blue-500 hover:underline"
                    >
                      Be the first to share wisdom
                    </button>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6">
                   {threads.map((thread) => (
                      <motion.div 
                        key={thread.id} 
                        onClick={() => setSelectedThread(thread)}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[3rem] border border-black/5 shadow-sm hover:shadow-2xl hover:border-black/20 transition-all group cursor-pointer overflow-hidden flex flex-col md:flex-row relative"
                      >
                         {thread.featuredImage && (
                            <div className="w-full md:w-64 h-48 md:h-auto overflow-hidden shrink-0">
                               <img 
                                 src={thread.featuredImage} 
                                 alt={thread.title} 
                                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                                 referrerPolicy="no-referrer"
                               />
                            </div>
                         )}
                         <div className="p-8 flex-1 flex flex-col justify-between">
                            <div className="space-y-3">
                               <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 bg-gray-50 border border-black/5 rounded-md text-[8px] font-black uppercase tracking-widest text-gray-400">
                                    {thread.category}
                                  </span>
                                  <div className="flex items-center gap-4 text-gray-400">
                                     <div className="flex items-center gap-1">
                                        <MessageCircle className="w-3 h-3" />
                                        <span className="text-[10px] font-black">{thread.replyCount || 0}</span>
                                     </div>
                                     <div className="flex items-center gap-1">
                                        <ArrowUpRight className="w-3 h-3" />
                                        <span className="text-[10px] font-black">{thread.views || 0}</span>
                                     </div>
                                  </div>
                               </div>
                               <h4 className="text-2xl font-black italic serif tracking-tight group-hover:text-blue-600 transition-colors leading-tight">{thread.title}</h4>
                               <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed font-medium">
                                 {thread.content}
                               </p>
                            </div>
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-black/[0.03]">
                               <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black uppercase transition-colors group-hover:bg-black group-hover:text-white">
                                     {thread.authorName?.charAt(0)}
                                  </div>
                                  <span className="text-xs font-bold text-gray-600">{thread.authorName}</span>
                               </div>
                               <div className="flex items-center gap-1 text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">
                                    {thread.createdAt && formatDistanceToNow(thread.createdAt.toDate(), { addSuffix: true })}
                                  </span>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   ))}
                 </div>
               )}
            </div>
         </div>
      </div>

      <AnimatePresence>
        {showCreate && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="bg-white w-full max-w-3xl rounded-[3rem] p-10 relative max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                 <button onClick={() => setShowCreate(false)} className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-full transition-colors z-10">
                    <X className="w-6 h-6 text-gray-400" />
                 </button>

                 <div className="space-y-8">
                    <div>
                       <h2 className="text-4xl font-black serif italic tracking-tight">Post to Agora</h2>
                       <p className="text-gray-400 text-sm mt-2 font-medium">Contribute an article or spark a discussion in the knowledge base.</p>
                    </div>
                    
                    <form onSubmit={handleCreateThread} className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Channel</label>
                             <select 
                               value={newCategory}
                               onChange={e => setNewCategory(e.target.value)}
                               className="w-full bg-gray-50 rounded-2xl p-4 font-bold text-sm outline-none border border-black/5 hover:border-black/20 focus:border-black transition-all appearance-none"
                             >
                                {categories.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                             </select>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Hero Image</label>
                            <label className="w-full flex items-center justify-center p-4 bg-gray-50 rounded-2xl border border-black/5 cursor-pointer hover:bg-gray-100 transition-all border-dashed group">
                               <ImageIcon className="w-4 h-4 text-gray-400 mr-2 group-hover:text-black" />
                               <span className="text-xs font-bold text-gray-500 group-hover:text-black">Upload Cover Photo</span>
                               <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                          </div>
                       </div>

                       {featuredImage && (
                          <div className="relative w-full h-56 rounded-3xl overflow-hidden border border-black/5 shadow-inner group">
                             <img src={featuredImage} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  type="button"
                                  onClick={() => setFeaturedImage('')}
                                  className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                >
                                   <X className="w-5 h-5" />
                                </button>
                             </div>
                          </div>
                       )}

                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Headline</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. Success Story: Our Chama reached its yearly goal..."
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="w-full bg-gray-50 rounded-2xl p-4 font-black text-2xl outline-none border border-black/5 hover:border-black/20 focus:border-black transition-all" 
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Body Content</label>
                          <textarea 
                            required
                            placeholder="Detail your insights, share photos, or ask questions..."
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            className="w-full bg-gray-50 rounded-2xl p-6 text-[15px] font-medium outline-none border border-black/5 h-48 hover:border-black/20 focus:border-black transition-all resize-none" 
                          />
                       </div>

                       <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-6 bg-black text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
                       >
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-4 h-4" /> Publish Entry</>}
                       </button>
                    </form>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
