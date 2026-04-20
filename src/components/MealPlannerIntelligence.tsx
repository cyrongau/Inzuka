import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShoppingCart, Loader2, Brain, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateWeeklyMealPlan } from '../services/geminiService';

interface MealPlannerIntelligenceProps {
  familyId: string;
  startDate: string; // ISO Date of week start
  activePlan: any;
  recipes: any[];
  pantryItems: any[];
  onPlanGenerated?: () => void;
}

/**
 * MealPlannerIntelligence - Modular component for AI-driven meal planning and inventory sync.
 * Prepared for native environments.
 */
export const MealPlannerIntelligence: React.FC<MealPlannerIntelligenceProps> = ({
  familyId,
  startDate,
  activePlan,
  recipes,
  pantryItems,
  onPlanGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncToShoppingList = async () => {
    if (!familyId) return;
    setIsSyncing(true);
    
    try {
      const mealsToday = Object.values(activePlan.meals || {}).filter(Boolean);
      const missingItems: any[] = [];

      mealsToday.forEach(mealTitle => {
        const recipe = recipes.find(r => r.title.toLowerCase() === (mealTitle as string).toLowerCase());
        if (recipe) {
          const multiplier = (activePlan.servings || 2) / (recipe.servings || 2);
          recipe.ingredients.forEach((req: any) => {
            const scaledQty = req.quantity * multiplier;
            const stock = pantryItems.find(p => p.name.toLowerCase() === req.name.toLowerCase());
            if (!stock || stock.quantity < scaledQty) {
              missingItems.push({ ...req, quantity: scaledQty });
            }
          });
        }
      });

      if (missingItems.length === 0) {
        toast.info("Gourmet! All ingredients for today's meals are already in stock.");
        return;
      }

      const listsQuery = query(collection(db, 'shoppingLists'), where('familyId', '==', familyId));
      const listsSnap = await getDocs(listsQuery);
      let listId = listsSnap.docs[0]?.id;
      let listData = listsSnap.docs[0]?.data();

      if (!listId) {
        const newRef = await addDoc(collection(db, 'shoppingLists'), {
          name: 'Groceries',
          familyId,
          items: [],
          createdAt: serverTimestamp()
        });
        listId = newRef.id;
        listData = { items: [] };
      }

      const currentItems = listData?.items || [];
      const updatedItems = [...currentItems];
      let addedCount = 0;
      
      missingItems.forEach(item => {
        if (!updatedItems.some(i => i.name.toLowerCase() === item.name.toLowerCase())) {
          updatedItems.push({ 
            id: Math.random().toString(36).substr(2, 9), 
            name: item.name, 
            quantity: item.quantity.toFixed(1),
            unit: item.unit,
            bought: false 
          });
          addedCount++;
        }
      });

      await updateDoc(doc(db, 'shoppingLists', listId), { items: updatedItems });
      
      if (addedCount > 0) {
        toast.success(`Smart Sync: Added ${addedCount} missing ingredients to "${listData?.name || 'Groceries'}".`);
      } else {
        toast.info("Ingredients are already in your shopping list!");
      }
    } catch (e) {
      toast.error("Failed to sync with shopping list.");
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const generateWeeklyAIPlan = async () => {
    if (!familyId) return;
    setIsGenerating(true);
    toast.loading("Gemini is crafting your family's weekly menu...", { id: 'ai-gen' });
    
    try {
      const mealData = await generateWeeklyMealPlan(startDate);
      
      for (const dayData of mealData) {
        const docId = `${familyId}_${dayData.date}`;
        const planRef = doc(db, 'mealPlans', docId);
        await setDoc(planRef, {
          date: dayData.date,
          familyId: familyId,
          meals: { 
            breakfast: dayData.breakfast, 
            lunch: dayData.lunch, 
            dinner: dayData.dinner 
          }
        }, { merge: true });
      }

      toast.success("Weekly plan generated successfully!", { id: 'ai-gen' });
      if (onPlanGenerated) onPlanGenerated();
    } catch (error) {
      toast.error("AI Generation failed. Check your connection.", { id: 'ai-gen' });
      console.error('AI Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onClick={generateWeeklyAIPlan}
        disabled={isGenerating}
        className="flex items-center justify-between p-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl transition-all shadow-lg group disabled:opacity-50"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold uppercase tracking-widest opacity-60">AI Intelligence</p>
            <p className="text-lg font-bold serif italic">Generate Full Week</p>
          </div>
        </div>
        <ChefHat className="w-10 h-10 opacity-10 group-hover:opacity-20 transition-opacity" />
      </button>

      <button
        onClick={syncToShoppingList}
        disabled={isSyncing}
        className="flex items-center justify-between p-6 bg-white border-2 border-black text-black hover:bg-gray-50 rounded-3xl transition-all shadow-lg group disabled:opacity-50"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
            {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShoppingCart className="w-6 h-6" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold uppercase tracking-widest opacity-40">Inventory Sync</p>
            <p className="text-lg font-bold serif italic uppercase">Sync Missing To List</p>
          </div>
        </div>
        <Brain className="w-10 h-10 opacity-5 group-hover:opacity-10 transition-opacity" />
      </button>
    </div>
  );
};
