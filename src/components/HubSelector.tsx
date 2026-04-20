import React from 'react';
import { motion } from 'framer-motion';
import { Home, Users, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react';
import { cn } from '../lib/utils';

interface HubSelectorProps {
  onSelect: (hub: 'family' | 'community') => void;
  hasFamily: boolean;
  user: any;
}

export default function HubSelector({ onSelect, hasFamily, user }: HubSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f5] dark:bg-zinc-950 p-6 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black italic serif tracking-tighter mb-4 text-black dark:text-white">Choose Your Focus.</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto">
            Welcome back, {user?.displayName}. Where would you like to direct your energy today?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Family Hub Card */}
          <button 
            onClick={() => onSelect('family')}
            className="group relative bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:shadow-2xl transition-all duration-500 overflow-hidden text-left"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[80px] group-hover:bg-orange-500/10 dark:group-hover:bg-orange-500/20 transition-all"></div>
            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-orange-100 dark:border-orange-500/20 group-hover:scale-110 transition-transform duration-500">
              <Home className="w-10 h-10 text-orange-600 dark:text-orange-500" />
            </div>
            <h2 className="text-3xl font-black italic serif mb-4 text-black dark:text-white">Family Hub</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
              Manage your household, track budgets, organize chores, and coordinate schedules with your immediate family.
            </p>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-orange-600">
              Enter Sandbox <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </button>

          {/* Community Hub Card */}
          <button 
            onClick={() => hasFamily ? onSelect('community') : alert('You must join or create a Family Hub first before accessing Community Networks.')}
            className={cn(
              "group relative bg-gray-950 rounded-[3rem] p-10 border border-white/10 hover:border-white/30 hover:shadow-2xl transition-all duration-500 overflow-hidden text-left",
              !hasFamily && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] group-hover:bg-purple-500/20 transition-all"></div>
            
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
               <Users className="w-10 h-10 text-blue-400" />
            </div>
            
            <h2 className="text-3xl font-black italic serif text-white mb-4">Community Hub</h2>
            <p className="text-white/60 font-medium mb-8 leading-relaxed">
              Expand your network. Manage fundraising, table banking, support groups, and extended social circles.
            </p>

            {!hasFamily ? (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400">
                <ShieldCheck className="w-4 h-4" /> Requires Family Registration
              </div>
            ) : (
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-blue-400">
                Explore Networks <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
