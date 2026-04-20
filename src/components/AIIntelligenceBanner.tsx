import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain } from 'lucide-react';
import { getShoppingInsights } from '../services/geminiService';

interface AIIntelligenceBannerProps {
  familyId: string;
  pantryItems: any[];
  shoppingLists: any[];
}

/**
 * AIIntelligenceBanner - A standalone intelligence component for family habits.
 * Fully native-compatible via NativeWind (Tailwind).
 */
export const AIIntelligenceBanner: React.FC<AIIntelligenceBannerProps> = ({ 
  familyId, 
  pantryItems, 
  shoppingLists 
}) => {
  const [aiInsights, setAiInsights] = useState<string>('Welcome to your family intelligence hub. Start scanning items to see personalized insights here!');
  const [isAnalyzingInsights, setIsAnalyzingInsights] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    
    const fetchInsights = async () => {
      setIsAnalyzingInsights(true);
      try {
        // Flatten items from all lists for a comprehensive analysis
        const allShoppingItems = shoppingLists.flatMap(l => l.items || []);
        const insights = await getShoppingInsights(pantryItems, allShoppingItems);
        setAiInsights(insights);
      } catch (e) {
        console.error('Failed to fetch AI insights:', e);
      } finally {
        setIsAnalyzingInsights(false);
      }
    };

    const timeoutId = setTimeout(fetchInsights, 2000); // Debounce to prevent rapid AI calls
    return () => clearTimeout(timeoutId);
  }, [familyId, pantryItems.length, shoppingLists.length]);

  if (!isAnalyzingInsights && !aiInsights) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black text-white p-6 rounded-[2.5rem] relative overflow-hidden group shadow-2xl"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10 flex items-start gap-6">
        <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
           <Brain className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full">Family Intelligence</span>
            {isAnalyzingInsights && <span className="text-[10px] text-white/40 animate-pulse font-medium italic">Analyzing habits...</span>}
          </div>
          <p className="text-xl font-medium serif italic leading-relaxed text-white/90">
            {isAnalyzingInsights ? "Refining your personalized household insights based on current stock..." : aiInsights}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
