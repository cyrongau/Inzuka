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
  ArrowRight
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, where, limit } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';

export default function HubProjects({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    // Collect projects from user's communities
    const qComm = query(collection(db, 'communities'), where('memberIds', 'array-contains', user.uid));
    
    // For now, let's just show a global list of projects or a stub that aggregates
    const unsub = onSnapshot(qComm, (snap) => {
      // In a real app, I'd iterate and subscribe to /tasks sub-collections
      // For this view, we'll suggest aggregation is happening
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-4xl font-black italic serif tracking-tight">Community Projects</h1>
            <p className="text-gray-400 font-medium mt-2">Centralized command for active initiatives across all networks.</p>
         </div>
         <div className="flex items-center gap-3">
            <div className="bg-orange-50 text-orange-600 px-6 py-3 rounded-2xl border border-orange-100 flex items-center gap-3">
               <Target className="w-5 h-5" />
               <span className="text-xs font-black uppercase tracking-widest">12 Active Goals</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {/* Project Overview Stats */}
         <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
               <TrendingUp className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Completion</p>
               <p className="text-2xl font-black text-black">68%</p>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
               <CheckSquare className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tasks Resolved</p>
               <p className="text-2xl font-black text-black">142</p>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
               <Users className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contributors</p>
               <p className="text-2xl font-black text-black">24</p>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
               <Clock className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Upcoming Deadlines</p>
               <p className="text-2xl font-black text-black">4</p>
            </div>
         </div>
      </div>

      {/* Projects List Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-black italic serif">Active Initiatives</h3>
            <div className="space-y-4">
               {/* This would normally map projects */}
               <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-black/10 transition-all group cursor-pointer">
                  <div className="flex gap-6">
                     <div className="w-16 h-16 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-all shrink-0">
                        <Layout className="w-8 h-8" />
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-xl font-bold italic serif tracking-tight">Communal Borehole Initiative</h4>
                        <p className="text-xs text-gray-400 font-medium">Phase 2: Hydrological Surveys and Procurement.</p>
                        <div className="flex items-center gap-4 pt-4">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">In Progress</span>
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">•</span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Target: Dec 2026</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                     <span className="px-3 py-1 bg-black text-white rounded-full text-[8px] font-black uppercase tracking-widest">High Priority</span>
                     <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:translate-x-2 transition-all">
                        <ArrowRight className="w-5 h-5" />
                     </div>
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-black/10 transition-all group cursor-pointer opacity-60">
                  <div className="flex gap-6">
                     <div className="w-16 h-16 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-all shrink-0">
                        <Layout className="w-8 h-8" />
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-xl font-bold italic serif tracking-tight">Solar Grid Expansion</h4>
                        <p className="text-xs text-gray-400 font-medium">Awaiting communal funding approval in Q3.</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                     <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-[8px] font-black uppercase tracking-widest">Planning</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3.5rem] border border-black/5 shadow-sm space-y-8">
            <h3 className="text-xl font-bold italic serif">Contributor Leaderboard</h3>
            <div className="space-y-6">
               {[
                  { name: "John Kamau", points: 2450, tasks: 12 },
                  { name: "Sarah Wanjiru", points: 1820, tasks: 8 },
                  { name: "Michael Omondi", points: 1100, tasks: 6 }
               ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs">{i+1}</div>
                        <div>
                           <p className="text-sm font-bold">{c.name}</p>
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{c.tasks} Projects Contributed</p>
                        </div>
                     </div>
                     <p className="text-xs font-black text-blue-600">+{c.points} XP</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
