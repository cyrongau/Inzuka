import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  FileText, 
  Search, 
  Upload, 
  ShieldCheck, 
  Eye, 
  Download, 
  Trash2, 
  Plus, 
  Loader2,
  FileSearch,
  BookOpen,
  Briefcase,
  CreditCard,
  History,
  FileCheck,
  Brain
} from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiApiKey } from "../../../../lib/env";
import SmartSearch from '../../../ui/SmartSearch';

let _ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: getGeminiApiKey() || 'UNSET' });
  return _ai;
};

export default function RecordsModule({ community, user }: { community: any, user: User }) {
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'legal' | 'governance' | 'financial'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('governance');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});

  const isOfficial = community.memberRoles?.[user.uid] === 'chairman' || 
                     community.memberRoles?.[user.uid] === 'treasurer' || 
                     community.memberRoles?.[user.uid] === 'secretary' ||
                     community.creatorId === user.uid;

  useEffect(() => {
    const fetchOfficialProfiles = async () => {
      if (!community.memberRoles) return;
      const officialIds = Object.keys(community.memberRoles);
      const profiles: Record<string, any> = {};
      for (const mid of officialIds) {
        if (!userProfiles[mid]) {
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const d = await getDoc(doc(db, 'users', mid));
            if (d.exists()) profiles[mid] = d.data();
          } catch(e) {}
        }
      }
      if (Object.keys(profiles).length > 0) {
        setUserProfiles(prev => ({ ...prev, ...profiles }));
      }
    };
    fetchOfficialProfiles();
  }, [community.memberRoles]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'communities', community.id, 'records'), orderBy('createdAt', 'desc')), (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [community.id]);

  const updateDoc = async (docRef: any, data: any) => {
    const { updateDoc: firestoreUpdateDoc } = await import('firebase/firestore');
    await firestoreUpdateDoc(docRef, data);
  };

  const handleDelete = async (recordId: string) => {
    try {
      await deleteDoc(doc(db, 'communities', community.id, 'records', recordId));
      toast.success("Document deleted successfully");
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete record. You might not have permission.");
    }
  };

  const handleRescan = async (record: any) => {
    if (!record.fileUrl || !record.mimeType) {
      toast.error("Source file not found. Please re-upload this document to enable AI scraping.");
      return;
    }

    setRescanLoading(true);
    try {
      const response = await getAI().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
           parts: [
             { text: `You are a document extraction assistant. Extract the key details from this group document titled "${record.title}":
               1. Main resolutions or rules.
               2. Any mentioned financial details (Bank, Paybill, Fees).
               3. Roles and responsibilities mentioned.
               4. Summary of legitimacy.
               Format the output nicely in Markdown.` },
             { inlineData: { mimeType: record.mimeType, data: record.fileUrl.split(',')[1] } }
           ]
        }
      });

      const extractedText = response.text || "AI Processing failed to extract text.";
      
      await updateDoc(doc(db, 'communities', community.id, 'records', record.id), {
        extractedText,
        updatedAt: serverTimestamp()
      });

      setSelectedRecord({ ...record, extractedText });
      toast.success("AI extraction refreshed successfully.");
    } catch (error) {
      console.error(error);
      toast.error("AI Rescan failed.");
    } finally {
      setRescanLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFile) return;

    setIsProcessing(true);
    try {
      // 1. Simulate File Upload & AI Scrapping
      // In a real app, we'd upload to Firebase Storage first.
      // Here we simulate the AI extraction prompt.
      
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const fileData = reader.result as string;
        
        // Use direct frontend Gemini call
        const response = await getAI().models.generateContent({
           model: "gemini-3-flash-preview",
           contents: {
              parts: [
                { text: `You are a document extraction assistant. Extract the key details from this group document titled "${title}":
                  1. Main resolutions or rules.
                  2. Any mentioned financial details (Bank, Paybill, Fees).
                  3. Roles and responsibilities mentioned.
                  4. Summary of legitimacy.
                  Format the output nicely in Markdown.` },
                { inlineData: { mimeType: selectedFile.type, data: fileData.split(',')[1] } }
              ]
           }
        });

        const extractedText = response.text || "AI Processing failed to extract text.";

        await addDoc(collection(db, 'communities', community.id, 'records'), {
          title,
          category,
          extractedText,
          fileUrl: fileData, // Store base64 for later viewing/rescanning
          mimeType: selectedFile.type,
          uploadedBy: user.uid,
          uploaderName: user.displayName,
          communityId: community.id,
          createdAt: serverTimestamp(),
          isVerified: true
        });

        toast.success("Document uploaded and AI-scrapped successfully.");
        setIsProcessing(false);
        setShowUploadModal(false);
        setTitle(''); setSelectedFile(null);
      };
    } catch (e) {
      toast.error("Failed to process document.");
      setIsProcessing(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || r.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const searchData = records.map(record => ({
     id: record.id,
     name: record.title,
     subtitle: record.category.toUpperCase() + ' Documentation',
     icon: record.category === 'legal' ? <ShieldCheck className="w-5 h-5" /> : 
           record.category === 'financial' ? <CreditCard className="w-5 h-5" /> : 
           <Briefcase className="w-5 h-5" />
  }));

  return (
    <div className="space-y-8 animate-in fade-in transition-all pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
               <BookOpen className="w-8 h-8" />
            </div>
            <div>
               <h2 className="text-xl font-bold italic serif tracking-tight text-black dark:text-white">Records & Compliance</h2>
               <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mt-1">Official repository for {community.name} documents.</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-64">
               <SmartSearch 
                  data={searchData}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={(item) => setSelectedRecord(records.find(r => r.id === item.id))}
                  placeholder="Search records..."
                  className="relative flex items-center pl-10 pr-6 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-black/5 dark:border-white/5 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all"
                  inputClassName="w-full bg-transparent text-sm font-medium outline-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
               />
            </div>
            {isOfficial && (
              <button 
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 text-white p-3 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
              >
                 <Upload className="w-6 h-6" />
              </button>
            )}
         </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
         {['all', 'legal', 'governance', 'financial'].map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab as any)}
             className={cn(
               "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
               activeTab === tab ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white dark:bg-zinc-900 text-gray-400 border border-black/5 dark:border-white/5"
             )}
           >{tab} Records</button>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredRecords.map(record => (
           <div 
             key={record.id} 
             onClick={() => setSelectedRecord(record)}
             className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm p-8 group hover:border-blue-500/30 transition-all cursor-pointer relative"
           >
              <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {record.category === 'legal' ? <ShieldCheck className="w-6 h-6" /> : 
                     record.category === 'financial' ? <CreditCard className="w-6 h-6" /> : 
                     <Briefcase className="w-6 h-6" />}
                 </div>
                 {record.isVerified && <FileCheck className="w-5 h-5 text-green-500" />}
              </div>

              <h4 className="text-xl font-bold italic serif text-black dark:text-white capitalize truncate">{record.title}</h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1 uppercase tracking-widest">{record.category} Documentation</p>

              <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-2 text-gray-400">
                    <History className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">{record.createdAt?.toDate ? format(record.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}</span>
                 </div>
                 <div className="flex gap-2">
                    <button className="p-2 bg-gray-50 dark:bg-zinc-800 text-gray-400 hover:text-blue-500 rounded-lg transition-colors">
                       <Eye className="w-4 h-4" />
                    </button>
                    {isOfficial && (
                      <button 
                         onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(record.id);
                         }}
                         className="p-2 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                 </div>
              </div>
           </div>
         ))}
         {filteredRecords.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-black/5 dark:border-white/5 space-y-6">
               <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <FileSearch className="w-10 h-10 text-gray-300" />
               </div>
               <div className="max-w-sm mx-auto space-y-2">
                  <p className="text-gray-500 dark:text-gray-400 italic serif text-xl font-medium">No records found.</p>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">
                    {isOfficial 
                      ? 'As an official, you can digitize the group constitution, registration certificates, and bank status letters here.' 
                      : 'Official documents and certificates will appear here once uploaded by the group chairman or secretary.'}
                  </p>
               </div>
               {isOfficial && (
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 transition-all"
                  >
                     Upload First Document
                  </button>
               )}
            </div>
         )}
      </div>

      {/* Record Viewer Modal */}
      {selectedRecord && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-[3.5rem] p-10 relative border border-black/5 dark:border-white/5 shadow-2xl max-h-[90vh] overflow-y-auto">
               <button onClick={() => setSelectedRecord(null)} className="absolute top-8 right-8 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400">
                  <Plus className="w-6 h-6 rotate-45" />
               </button>

               <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center">
                     <FileText className="w-8 h-8" />
                  </div>
                  <div>
                     <h2 className="text-3xl font-black serif italic text-black dark:text-white">{selectedRecord.title}</h2>
                     <p className="text-xs font-black uppercase tracking-widest text-blue-600">AI-Processed Digital Record</p>
                  </div>
               </div>

               <div className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-zinc-800/50 p-10 rounded-[2.5rem] border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-6 text-blue-600">
                     <Brain className="w-5 h-5 rounded-md" />
                     <span className="text-[10px] font-black uppercase tracking-widest">AI Extraction Result</span>
                  </div>
                  <div className="text-sm font-medium leading-relaxed dark:text-gray-300">
                     <div className="markdown-body">
                        <Markdown>{selectedRecord.extractedText}</Markdown>
                     </div>
                  </div>
               </div>

                <div className="mt-8 flex justify-between items-center gap-3">
                   <div>
                     {isOfficial && (
                       <button 
                         onClick={() => handleDelete(selectedRecord.id)}
                         className="flex items-center gap-2 px-6 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                       >
                         <Trash2 className="w-4 h-4" /> Delete Record
                       </button>
                     )}
                   </div>
                   <div className="flex gap-3">
                      {isOfficial && (
                         <button 
                            onClick={() => handleRescan(selectedRecord)}
                            disabled={rescanLoading}
                            className="flex items-center gap-2 px-6 py-4 bg-orange-500/10 text-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                         >
                            {rescanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            {selectedRecord.fileUrl ? "Rescan with AI" : "Legacy: Re-upload for AI"}
                         </button>
                      )}
                      <button 
                        onClick={() => {
                           const link = document.createElement('a');
                           link.href = selectedRecord.fileUrl || '#';
                           link.download = selectedRecord.title;
                           if (selectedRecord.fileUrl) link.click();
                           else toast.error("Source file unavailable for legacy records.");
                        }}
                        className="flex items-center gap-2 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                         <Download className="w-4 h-4" /> Export Digital Copy
                      </button>
                   </div>
                </div>
            </motion.div>
         </div>
      )}

      {/* Executive Directory Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm p-10 mt-12">
         <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h3 className="text-xl font-black serif italic text-black dark:text-white">Executive Directory</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Official leadership & role clarity</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Chairman', 'Secretary', 'Treasurer', 'Vice-Chairman'].map(role => {
               const officialId = Object.entries(community.memberRoles || {}).find(([uid, r]) => r === role.toLowerCase())?.[0];
               let officialName = 'Not Assigned';
               let photoUrl = '';
               
               if (officialId) {
                  const profile = userProfiles[officialId];
                  officialName = profile?.displayName || community.memberNames?.[officialId] || officialId.slice(0, 8);
                  photoUrl = profile?.photoURL || '';
               }
               
               return (
                 <div key={role} className="p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-3xl border border-black/5 dark:border-white/5 group hover:border-indigo-500/30 transition-all flex flex-col justify-between">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-600 mb-4">{role}</p>
                        
                        <div className="flex items-center gap-3 mb-4">
                           {photoUrl ? (
                              <img src={photoUrl} alt={officialName} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm" />
                           ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-gray-400">
                                 {officialName.charAt(0).toUpperCase()}
                              </div>
                           )}
                           <h4 className="text-base font-bold text-black dark:text-white leading-tight">{officialName}</h4>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-2 pt-4 border-t border-black/5 dark:border-white/5">
                       {role === 'Chairman' && "Legal representative and overseer of all group activities."}
                       {role === 'Secretary' && "Custodian of group records, assets, and communications."}
                       {role === 'Treasurer' && "Manager of financial records and dual-auth payments."}
                       {!['Chairman', 'Secretary', 'Treasurer'].includes(role) && "Support and executive decision making."}
                    </p>
                 </div>
               );
            })}
         </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[3.5rem] p-10 relative border border-black/5 dark:border-white/5 shadow-2xl">
               <h2 className="text-2xl font-black serif italic mb-8 text-black dark:text-white">Digitize Record</h2>
               <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Record Title</label>
                     <input 
                        type="text" 
                        required 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="e.g. Group Constitution 2024" 
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-black dark:text-white" 
                     />
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Category</label>
                     <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-black dark:text-white appearance-none">
                        <option value="governance">Governance (Constitution/Roles)</option>
                        <option value="legal">Legal Compliance (Certificates)</option>
                        <option value="financial">Financial (Bank/Paybill Details)</option>
                        <option value="minutes">Meeting Minutes Archive</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">Document File</label>
                     <div className="relative group">
                        <input 
                           type="file" 
                           onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-dashed border-black/5 dark:border-white/5 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 group-hover:border-blue-500/50 transition-all">
                           <Upload className={cn("w-10 h-10", selectedFile ? "text-blue-600" : "text-gray-300")} />
                           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                             {selectedFile ? selectedFile.name : "Select or Drop Document"}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <button 
                        type="submit" 
                        disabled={isProcessing}
                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                     >
                        {isProcessing ? (
                           <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Processing AI...
                           </>
                        ) : "Upload & Scrap"}
                     </button>
                     <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-4 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white font-black uppercase tracking-widest text-xs transition-colors">Cancel</button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}
    </div>
  );
}
