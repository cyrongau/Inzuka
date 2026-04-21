import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  CheckSquare, 
  Calendar, 
  Users, 
  Layout, 
  Clock, 
  TrendingUp,
  Target,
  BarChart,
  ArrowRight,
  Image as ImageIcon,
  Plus,
  X,
  Camera
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, where, limit, doc, updateDoc, arrayUnion, serverTimestamp, collectionGroup, getDocs } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function HubProjects({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showGalleryUpload, setShowGalleryUpload] = useState(false);
  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');

  useEffect(() => {
    // Collect projects from user's communities
    const qComm = query(collection(db, 'communities'), where('memberIds', 'array-contains', user.uid));
    
    const unsub = onSnapshot(qComm, (snap) => {
      const communityList = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      
      if (communityList.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // Fetch projects for each community
      // Using a simpler approach: fetch all projects for these communities
      const allProjects: any[] = [];
      let loadedComms = 0;

      communityList.forEach(async (comm) => {
        const qProj = collection(db, 'communities', comm.id, 'projects');
        const projSnap = await getDocs(qProj);
        projSnap.forEach(pDoc => {
          allProjects.push({
            ...pDoc.data(),
            id: pDoc.id,
            communityId: comm.id,
            communityName: comm.name
          });
        });
        loadedComms++;
        if (loadedComms === communityList.length) {
          setProjects(allProjects.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
          setLoading(false);
        }
      });
    });

    return () => unsub();
  }, [user.uid]);

  const handleAddGalleryImage = async () => {
    if (!selectedProject || !galleryImageUrl) return;
    
    try {
      const projRef = doc(db, 'communities', selectedProject.communityId, 'projects', selectedProject.id);
      const newEntry = {
        url: galleryImageUrl,
        caption: galleryCaption || 'Project update',
        createdAt: new Date().toISOString()
      };

      await updateDoc(projRef, {
        gallery: arrayUnion(newEntry)
      });

      // Update local state
      const updatedGallery = [...(selectedProject.gallery || []), newEntry];
      setSelectedProject({ ...selectedProject, gallery: updatedGallery });
      
      toast.success("Image added to gallery");
      setGalleryImageUrl('');
      setGalleryCaption('');
      setShowGalleryUpload(false);
    } catch (e) {
      toast.error("Failed to add image");
    }
  };

  if (loading) {
     return (
        <div className="flex items-center justify-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
        </div>
     );
  }

  // Aggregate stats
  const totalCompletion = projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length) : 0;
  const totalTasks = projects.reduce((acc, p) => acc + (p.taskCount || 0), 0);
  const resolvedTasks = projects.reduce((acc, p) => acc + (p.completedTaskCount || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-4xl font-black italic serif tracking-tight text-black dark:text-white">Group Projects</h1>
            <p className="text-gray-400 dark:text-gray-500 font-medium mt-2">Centralized command for active initiatives across all groups.</p>
         </div>
         <div className="flex items-center gap-3">
            <div className="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-6 py-3 rounded-2xl border border-orange-100 dark:border-orange-500/10 flex items-center gap-3 text-sm font-black uppercase tracking-widest">
               <Target className="w-5 h-5" />
               {projects.length} Active Goals
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
               <TrendingUp className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Average Completion</p>
               <p className="text-2xl font-black text-black dark:text-white">{totalCompletion}%</p>
            </div>
         </div>
         <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
               <CheckSquare className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Tasks Resolved</p>
               <p className="text-2xl font-black text-black dark:text-white">{resolvedTasks}</p>
            </div>
         </div>
         <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-4 text-gray-300 dark:text-gray-700">
            <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center">
               <Users className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest">Global Contributors</p>
               <p className="text-2xl font-black">--</p>
            </div>
         </div>
         <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-4 text-gray-300 dark:text-gray-700">
            <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center">
               <Clock className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest">At Risk Items</p>
               <p className="text-2xl font-black">0</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-black italic serif text-black dark:text-white">Active Initiatives</h3>
            
            {projects.length === 0 ? (
               <div className="p-20 text-center bg-gray-50 dark:bg-zinc-900/50 rounded-[3rem] border border-dashed border-black/10 dark:border-white/10">
                  <Layout className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 dark:text-gray-500 font-medium italic serif">No active initiatives found. Projects created within groups will appear here.</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {projects.map((project) => (
                     <motion.div 
                        key={project.id}
                        layoutId={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-black/10 dark:hover:border-white/10 hover:shadow-xl transition-all group cursor-pointer"
                     >
                        <div className="flex gap-6">
                           <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center text-gray-300 dark:text-gray-600 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all shrink-0">
                              <Layout className="w-8 h-8" />
                           </div>
                           <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                 <h4 className="text-xl font-bold italic serif tracking-tight text-black dark:text-white">{project.title}</h4>
                                 <span className="text-[8px] font-black uppercase tracking-widest bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-gray-500">{project.communityName}</span>
                              </div>
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium line-clamp-1">{project.description}</p>
                              
                              <div className="pt-4 space-y-3">
                                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-gray-400">{project.progress || 0}% Complete</span>
                                    {project.targetDate && <span className="text-gray-500">Target: {new Date(project.targetDate).toLocaleDateString()}</span>}
                                 </div>
                                 <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${project.progress || 0}%` }}
                                       className={cn(
                                          "h-full rounded-full transition-all duration-1000",
                                          project.progress > 75 ? "bg-green-500" : project.progress > 30 ? "bg-blue-500" : "bg-orange-500"
                                       )}
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                           <span className={cn(
                              "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                              project.priority === 'high' ? "bg-red-500 text-white" : "bg-black dark:bg-white text-white dark:text-black"
                           )}>
                              {project.priority || 'standard'} Priority
                           </span>
                           <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:translate-x-2 transition-all">
                              <ArrowRight className="w-5 h-5" />
                           </div>
                        </div>
                     </motion.div>
                  ))}
               </div>
            )}
         </div>

         <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-sm space-y-8 h-fit lg:sticky lg:top-8">
            <h3 className="text-xl font-bold italic serif text-black dark:text-white flex items-center gap-3">
               <TrendingUp className="w-5 h-5 text-blue-500" />
               Contributor XP
            </h3>
            <div className="space-y-6">
               {[
                  { name: "John Kamau", points: 2450, tasks: 12 },
                  { name: "Sarah Wanjiru", points: 1820, tasks: 8 },
                  { name: "Michael Omondi", points: 1100, tasks: 6 }
               ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-full flex items-center justify-center font-bold text-[10px] text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">{i+1}</div>
                        <div>
                           <p className="text-sm font-bold text-black dark:text-white">{c.name}</p>
                           <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">{c.tasks} Milestones Hit</p>
                        </div>
                     </div>
                     <p className="text-xs font-black text-blue-600 dark:text-blue-400">+{c.points}p</p>
                  </div>
               ))}
            </div>
            <div className="pt-4 border-t border-black/5 dark:border-white/5">
                <button className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-all">View All Rankings</button>
            </div>
         </div>
      </div>

      {/* Project Detail Modal */}
      <AnimatePresence>
         {selectedProject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedProject(null)}
                  className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
               />
               <motion.div 
                  layoutId={selectedProject.id}
                  className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3.5rem] shadow-2xl relative z-10 border border-white/10 border-t-white/20"
               >
                  <button 
                     onClick={() => setSelectedProject(null)}
                     className="absolute top-8 right-8 w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-colors z-20"
                  >
                     <X className="w-6 h-6" />
                  </button>

                  <div className="p-12 space-y-12 pb-20">
                     <div className="space-y-6">
                        <div className="flex items-center gap-4">
                           <span className="px-4 py-2 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">{selectedProject.communityName}</span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{selectedProject.status}</span>
                        </div>
                        <h2 className="text-5xl font-black italic serif tracking-tight text-black dark:text-white">{selectedProject.title}</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl">{selectedProject.description}</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 dark:bg-zinc-800/50 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 space-y-2">
                           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Project Lead</p>
                           <p className="text-xl font-bold italic serif text-black dark:text-white">{selectedProject.leadName || 'System Admin'}</p>
                        </div>
                        <div className="md:col-span-2 bg-gray-50 dark:bg-zinc-800/50 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 space-y-4">
                           <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Initiative Progress</p>
                              <span className="text-xl font-black italic serif text-blue-500">{selectedProject.progress || 0}%</span>
                           </div>
                           <div className="w-full h-3 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${selectedProject.progress || 0}%` }}
                                 className="h-full bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                              />
                           </div>
                           <p className="text-[10px] text-gray-400 font-medium">{selectedProject.completedTaskCount || 0} of {selectedProject.taskCount || 0} primary tasks complete.</p>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
                           <h3 className="text-2xl font-black italic serif text-black dark:text-white flex items-center gap-3">
                              <ImageIcon className="w-6 h-6 text-orange-500" />
                              Project Gallery
                           </h3>
                           {(selectedProject.leadId === user.uid || user.uid === selectedProject.creatorId) && (
                              <button 
                                 onClick={() => setShowGalleryUpload(!showGalleryUpload)}
                                 className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                              >
                                 <Plus className="w-4 h-4" /> Add Image
                              </button>
                           )}
                        </div>

                        {showGalleryUpload && (
                           <motion.div 
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-gray-50 dark:bg-zinc-800/50 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 space-y-4"
                           >
                              <h4 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">Upload Progress Image</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black dark:text-white">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Image URL</label>
                                    <input 
                                       type="text" 
                                       placeholder="Paste image URL here..."
                                       value={galleryImageUrl}
                                       onChange={e => setGalleryImageUrl(e.target.value)}
                                       className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 text-sm font-medium outline-none border border-black/5 dark:border-white/10"
                                    />
                                    <p className="text-[10px] text-gray-400 ml-2 italic underline cursor-pointer" onClick={() => setGalleryImageUrl('https://picsum.photos/seed/project/1200/800')}>Use random sample image</p>
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Caption</label>
                                    <input 
                                       type="text" 
                                       placeholder="e.g. Setting up solar panels..."
                                       value={galleryCaption}
                                       onChange={e => setGalleryCaption(e.target.value)}
                                       className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 text-sm font-medium outline-none border border-black/5 dark:border-white/10"
                                    />
                                 </div>
                              </div>
                              <div className="flex gap-4 pt-4">
                                 <button onClick={() => setShowGalleryUpload(false)} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Cancel</button>
                                 <button 
                                    onClick={handleAddGalleryImage}
                                    disabled={!galleryImageUrl}
                                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                 >Post Update</button>
                              </div>
                           </motion.div>
                        )}

                        {!selectedProject.gallery || selectedProject.gallery.length === 0 ? (
                           <div className="py-20 text-center bg-gray-50 dark:bg-zinc-800/30 rounded-[3rem] border-2 border-dashed border-black/5 dark:border-white/5">
                              <Camera className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                              <p className="text-gray-400 italic serif">No gallery items yet. Add images to document progress.</p>
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {selectedProject.gallery.map((img: any, idx: number) => (
                                 <div key={idx} className="group relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5">
                                    <img 
                                       src={img.url} 
                                       alt={img.caption} 
                                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                       referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                       <p className="text-white font-bold italic serif tracking-tight">{img.caption}</p>
                                       <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mt-1">{new Date(img.createdAt).toLocaleDateString()}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
