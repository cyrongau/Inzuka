import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Utensils, 
  Coffee, 
  Sun, 
  Moon, 
  Sparkles, 
  Save, 
  ShoppingCart, 
  ChefHat,
  Calendar,
  Clock,
  User as UserIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { cn, getHash } from '../../lib/utils';
import { format, startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import RecipeBookModal from './RecipeBookModal';
import { COMMUNITY_RECIPES } from '../../constants/recipes';
import { optimizeImage } from '../../lib/imageProcessor';
import { toast } from 'sonner';
import { MealPlannerIntelligence } from '../MealPlannerIntelligence';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'text-orange-400' },
  { id: 'lunch', label: 'Lunch', icon: Sun, color: 'text-yellow-500' },
  { id: 'dinner', label: 'Dinner', icon: Moon, color: 'text-indigo-400' },
];

const FOOD_IMAGES: Record<string, string[]> = {
  breakfast: [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=1200&auto=format&fit=crop'
  ],
  lunch: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop'
  ],
  dinner: [
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop'
  ]
};

export default function MealPlanning({ user, profile }: { user: User, profile: any }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMealType, setActiveMealType] = useState('lunch');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecipeBook, setShowRecipeBook] = useState(false);

  const [recipes, setRecipes] = useState<any[]>([]);
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [viewingRecipe, setViewingRecipe] = useState<any>(null);

  const familyId = profile?.familyId;

  useEffect(() => {
    if (!familyId) return;

    const q = query(collection(db, 'mealPlans'), where('familyId', '==', familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'mealPlans'));

    const rq = query(collection(db, 'recipes'), where('familyId', '==', familyId));
    const unsubRecipes = onSnapshot(rq, (snapshot) => {
      const dbRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes([...COMMUNITY_RECIPES, ...dbRecipes]);
    });

    const unsubInventory = onSnapshot(query(collection(db, 'inventory'), where('familyId', '==', familyId)), (s) => {
       setPantryItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubscribe(); unsubRecipes(); unsubInventory(); };
  }, [familyId]);

  const getRecipeImage = (recipeTitle: string | undefined, mealType: string) => {
    if (!recipeTitle) {
      if (!FOOD_IMAGES[mealType]) return '';
      return FOOD_IMAGES[mealType][Math.abs(getHash(mealType)) % FOOD_IMAGES[mealType].length];
    }
    
    const recipe = recipes.find(r => r.title.toLowerCase() === recipeTitle.toLowerCase());
    if (recipe?.image) return recipe.image;
    
    const seed = recipeTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `https://picsum.photos/seed/food-${seed}/1200/1200`;
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getPlanForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return plans.find(p => p.date === dateStr) || { date: dateStr, meals: { breakfast: '', lunch: '', dinner: '' }, servings: 2, suggestions: [] };
  };

  const activePlan = getPlanForDate(selectedDate);

  const updateMeal = async (dateStr: string, mealType: string, value: string) => {
    if (!familyId) return;
    const docId = `${familyId}_${dateStr}`;
    const planRef = doc(db, 'mealPlans', docId);
    const existingPlan = plans.find(p => p.date === dateStr)?.meals || {};
    try {
      await setDoc(planRef, {
        date: dateStr,
        familyId: familyId,
        meals: { ...existingPlan, [mealType]: value }
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'mealPlans');
    }
  };

  const allSuggestions = Array.from(new Set([
     ...recipes.map(r => r.title),
     ...plans.flatMap(p => Object.values(p.meals || {}).filter(Boolean))
  ])).filter(Boolean);

  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionImage, setSuggestionImage] = useState<string | null>(null);

  const updatePlanDoc = async (dateStr: string, updates: any) => {
    if (!familyId) return;
    const docId = `${familyId}_${dateStr}`;
    const planRef = doc(db, 'mealPlans', docId);
    try {
      await setDoc(planRef, {
        date: dateStr,
        familyId: familyId,
        ...updates
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSuggestion = () => {
    if (!suggestionText.trim() || !user?.displayName) return;
    const newSuggestions = [...(activePlan.suggestions || []), { 
      user: user.displayName.split(' ')[0], 
      text: suggestionText,
      image: suggestionImage 
    }];
    updatePlanDoc(activePlan.date, { suggestions: newSuggestions });
    setSuggestionText('');
    setSuggestionImage(null);
  };

  const handleSuggestionImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
         const optimized = await optimizeImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.6 });
         setSuggestionImage(optimized);
      } catch (err) {
         console.error(err);
         alert("Failed to process image.");
      }
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 80) setSelectedDate(subDays(selectedDate, 1));
    else if (info.offset.x < -80) setSelectedDate(addDays(selectedDate, 1));
  };

  if (!familyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
        <div className="w-24 h-24 bg-indigo-50 text-indigo-400 rounded-[2.5rem] flex items-center justify-center">
          <Utensils className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold italic serif tracking-tight">Family Menu Sync Required</h3>
          <p className="text-gray-500 max-w-md mt-2 font-light">Meal planning is shared between household members. Please setup your household in your profile to start planning together.</p>
        </div>
        <button 
          onClick={() => window.location.hash = '#profile'}
          className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
        >
          Setup My Family
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4">
      {/* Date Navigator Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <h2 className="text-4xl font-light italic serif tracking-tight">Weekly <span className="font-bold not-italic">Nourishment</span></h2>
      </div>

      {/* Hero Timeline Navigator with Arrows and Swipe */}
      <div className="relative group/nav flex items-center justify-center gap-4">
        <button 
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="w-12 h-12 rounded-full border border-black/5 bg-white shadow-sm flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-visible py-6 px-2">
          <div className="flex items-center justify-center gap-3 md:gap-6">
            {weekDays.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              return (
                <React.Fragment key={i}>
                  <motion.button
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative shrink-0 w-20 md:w-24 p-4 md:p-6 rounded-[2.2rem] flex flex-col items-center gap-1 transition-all border",
                      isSelected 
                        ? "bg-black text-white border-black shadow-2xl translate-y-2" 
                        : "bg-white text-gray-400 border-black/5 hover:border-black/10"
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest">{format(day, 'EEE')}</span>
                    <span className="text-2xl font-bold">{format(day, 'd')}</span>
                    {isSelected && (
                      <motion.div layoutId="activeLine" className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[2px] h-10 bg-black/5" />
                    )}
                  </motion.button>
                  {i < weekDays.length - 1 && (
                    <div className="w-2 md:w-4 h-[1px] bg-black/5 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <button 
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="w-12 h-12 rounded-full border border-black/5 bg-white shadow-sm flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95 shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Featured Day Card */}
      <div className="relative overflow-visible">
        <AnimatePresence mode="wait">
            <motion.div 
              key={format(selectedDate, 'yyyy-MM-dd')}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              className="bg-white rounded-[4rem] shadow-[-20px_40px_80px_rgba(0,0,0,0.06)] overflow-hidden border border-black/5 cursor-grab active:cursor-grabbing"
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Column 1: Aesthetic Dynamic Image */}
                <div 
                  onClick={() => {
                    const mealTitle = activePlan.meals[activeMealType];
                    const recipe = recipes.find(r => r.title.toLowerCase() === mealTitle?.toLowerCase());
                    if (recipe) setViewingRecipe(recipe);
                  }}
                  className="relative group h-[500px] md:h-auto overflow-hidden cursor-pointer"
                >
                   <AnimatePresence mode="wait">
                     <motion.img 
                       key={`${activeMealType}-${activePlan?.meals?.[activeMealType] || selectedDate.getDate()}`}
                       initial={{ opacity: 0, scale: 1.1 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.9 }}
                       transition={{ duration: 0.6 }}
                       src={getRecipeImage(activePlan?.meals?.[activeMealType], activeMealType)} 
                       className="absolute inset-0 w-full h-full object-cover transition-all duration-1000" 
                       alt={activeMealType}
                       referrerPolicy="no-referrer"
                     />
                   </AnimatePresence>
                   
                   {/* Gradient Overlay */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                   
                   {/* Reveal Info */}
                   <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
                      <div className="space-y-4">
                         <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <Clock className="w-3.5 h-3.5 text-blue-300" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{activeMealType} Time</span>
                         </div>
                         <h2 className="text-6xl font-bold italic serif tracking-tighter leading-none">{format(selectedDate, 'EEEE')}</h2>
                         <p className="text-lg font-light text-white/60 italic serif">Curated nutrition for a vibrant life.</p>
                      </div>
                   </div>
                </div>

                {/* Column 2: Planning List */}
                <div className="p-10 md:p-16 lg:p-20 flex flex-col justify-center bg-gray-50/20">
                  <div className="flex items-center justify-between mb-16">
                     <div className="flex items-center gap-4">
                       <div className="w-2 h-12 bg-black rounded-full" />
                       <h3 className="text-4xl font-bold tracking-tighter italic serif">Today's <span className="not-italic">Selection</span></h3>
                     </div>
                     <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-black/5 shadow-sm">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Servings</span>
                        <div className="flex items-center gap-2 border-l border-black/10 pl-3 ml-1">
                           <button onClick={() => updatePlanDoc(activePlan.date, { servings: Math.max(1, (activePlan.servings || 2) - 1) })} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">-</button>
                           <span className="font-bold text-sm w-4 text-center">{activePlan.servings || 2}</span>
                           <button onClick={() => updatePlanDoc(activePlan.date, { servings: (activePlan.servings || 2) + 1 })} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">+</button>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-12">
                    {MEAL_TYPES.map((type) => {
                      const isActive = activeMealType === type.id;
                      return (
                        <div 
                          key={type.id} 
                          className="group relative"
                          onFocus={() => setActiveMealType(type.id)}
                          onClick={() => setActiveMealType(type.id)}
                        >
                          <div className="flex items-start gap-8">
                              <div 
                                onClick={() => {
                                  const mealTitle = activePlan.meals[type.id];
                                  const recipe = recipes.find(r => r.title.toLowerCase() === mealTitle?.toLowerCase());
                                  if (recipe) setViewingRecipe(recipe);
                                }}
                                className={cn(
                                  "shrink-0 w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all duration-700 shadow-sm border border-black/5 cursor-pointer",
                                  isActive ? "bg-black text-white rotate-12 scale-110 shadow-xl" : "bg-white text-gray-300 group-hover:text-black group-hover:rotate-6"
                              )}>
                                 {activePlan.meals?.[type.id] ? (
                                    <img 
                                      src={getRecipeImage(activePlan.meals[type.id], type.id)} 
                                      className="w-full h-full object-cover rounded-[1.8rem]" 
                                      alt="Meal" 
                                      referrerPolicy="no-referrer"
                                    />
                                 ) : (
                                    <type.icon className="w-8 h-8" />
                                 )}
                              </div>
                              <div className="flex-1 space-y-2">
                                 <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "text-[11px] font-bold uppercase tracking-[0.3em] transition-colors duration-500",
                                      isActive ? "text-black" : "text-gray-300"
                                    )}>
                                      {type.label}
                                    </span>
                                     {isActive && <motion.div layoutId="activeDot" className="w-1.5 h-1.5 bg-black rounded-full" />}
                                    <div className="h-[1px] flex-1 bg-black/5" />
                                 </div>
                                 <input 
                                  list="meal-suggestions"
                                  value={activePlan.meals[type.id] || ''}
                                  onChange={(e) => updateMeal(activePlan.date, type.id, e.target.value)}
                                  placeholder={`Whatcha eating?`}
                                  className={cn(
                                    "w-full bg-transparent border-0 p-0 text-xl md:text-2xl font-medium focus:ring-0 resize-none leading-tight transition-all duration-500",
                                    isActive ? "text-black opacity-100 translate-x-2" : "text-gray-200 opacity-60 hover:opacity-100"
                                  )}
                                />
                                <datalist id="meal-suggestions">
                                   {allSuggestions.map((suggestion, idx) => (
                                     <option key={idx} value={suggestion} />
                                   ))}
                                </datalist>
                              </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI & Sync Intelligence (Modularized) */}
                  <div className="mt-12">
                    <MealPlannerIntelligence 
                      familyId={familyId}
                      startDate={format(weekStart, 'yyyy-MM-dd')}
                      activePlan={activePlan}
                      recipes={recipes}
                      pantryItems={pantryItems}
                    />
                  </div>

                  <div className="mt-8">
                     <button onClick={() => setShowRecipeBook(true)} className="w-full bg-white border-2 border-dashed border-black/10 text-black px-8 py-5 rounded-[2rem] font-bold text-sm flex items-center justify-center gap-3 hover:bg-black hover:text-white transition-all shadow-sm active:scale-95">
                        <Utensils className="w-5 h-5" /> Browse Recipe Book
                     </button>
                  </div>

                  {/* Family Suggestions */}
                  <div className="mt-12 pt-10 border-t border-black/5 space-y-6">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Family Suggestions</h4>
                     <div className="space-y-2">
                        {activePlan.suggestions?.map((s: any, i: number) => (
                           <div key={i} className="flex gap-3 items-center bg-white p-4 rounded-2xl border border-black/5 shadow-sm text-sm group">
                               <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {s.user.charAt(0)}
                               </div>
                               <div>
                                  <span className="font-bold text-gray-400 block text-[10px] uppercase tracking-widest">{s.user} suggests</span>
                                  <span className="font-medium">{s.text}</span>
                               </div>
                           </div>
                        ))}
                     </div>
                     <div className="flex gap-2">
                        <input 
                          value={suggestionText}
                          onChange={e => setSuggestionText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddSuggestion()}
                          placeholder={`What would you like for Dinner, ${user?.displayName?.split(' ')[0] || 'there'}?`} 
                          className="flex-1 bg-white p-4 text-sm rounded-2xl border border-black/5 font-medium outline-none focus:border-black/20" 
                        />
                        <button onClick={handleAddSuggestion} className="bg-black text-white p-4 rounded-2xl hover:scale-105 transition-all w-14 flex items-center justify-center">
                           <Plus className="w-5 h-5" />
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
        </AnimatePresence>
      </div>

      {/* Seasonal Footer Selection */}
      <div className="bg-black text-white p-14 rounded-[4.5rem] shadow-[-20px_40px_100px_rgba(0,0,0,0.1)] relative overflow-hidden group">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/10 rounded-full border border-white/20">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Chef's Collection</span>
            </div>
            <h3 className="text-6xl font-light italic serif leading-[1.1] tracking-tighter">Master the Art of <span className="font-bold border-b-2 border-white/15 block mt-2">Home Cooking</span></h3>
             <p className="text-white/40 max-w-sm leading-relaxed font-light text-xl italic serif">
              Curated recipes designed for performance, longevity, and pure sensory delight.
            </p>
            <button onClick={() => setShowRecipeBook(true)} className="bg-white text-black px-12 py-6 rounded-[2.5rem] font-bold flex items-center gap-4 hover:-translate-y-2 hover:shadow-2xl transition-all group/btn">
              Explore Recipes <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
            </button>
          </div>
          <div className="relative h-[400px]">
            <div className="absolute inset-0 grid grid-cols-2 gap-8 rotate-6 group-hover:rotate-0 transition-all duration-1000 ease-out scale-110 group-hover:scale-100">
              <div className="space-y-8">
                <img src={FOOD_IMAGES.dinner[0]} className="rounded-[3.5rem] shadow-2xl border-4 border-white/5 object-cover h-[250px] w-full" alt="food" referrerPolicy="no-referrer" />
                <img src={FOOD_IMAGES.breakfast[0]} className="rounded-[3.5rem] shadow-2xl border-4 border-white/5 object-cover h-[250px] w-full" alt="food" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-8 translate-y-20">
                <img src={FOOD_IMAGES.lunch[0]} className="rounded-[3.5rem] shadow-2xl border-4 border-white/5 object-cover h-[250px] w-full" alt="food" referrerPolicy="no-referrer" />
                <img src={FOOD_IMAGES.dinner[1]} className="rounded-[3.5rem] shadow-2xl border-4 border-white/5 object-cover h-[250px] w-full" alt="food" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/2 blur-[120px]" />
      </div>

      {showRecipeBook && (
        <RecipeBookModal 
          onClose={() => setShowRecipeBook(false)} 
          familyId={familyId} 
          onPlanRecipe={(recipe, mealType) => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            updateMeal(dateStr, mealType || activeMealType, recipe.title);
            setShowRecipeBook(false);
          }} 
        />
      )}

      {/* Recipe Detail Modal (Revealed from Planner) */}
      <AnimatePresence>
        {viewingRecipe && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] p-10 max-w-2xl w-full max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col"
            >
              <button 
                onClick={() => setViewingRecipe(null)} 
                className="absolute top-8 right-8 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 rounded-[2rem] overflow-hidden border border-black/5 shadow-lg shrink-0 bg-gray-50">
                    <img src={getRecipeImage(viewingRecipe.title, viewingRecipe.category?.toLowerCase() || 'lunch')} className="w-full h-full object-cover" alt={viewingRecipe.title} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black italic serif leading-tight">{viewingRecipe.title}</h2>
                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mt-2">{viewingRecipe.category}</span>
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b border-black/5 pb-2">Ingredients & Stock</h4>
                   <div className="grid grid-cols-1 gap-3">
                      {viewingRecipe.ingredients.map((ing: any, i: number) => {
                        const multiplier = (activePlan.servings || 2) / (viewingRecipe.servings || 2);
                        const scaledQty = Number((ing.quantity * multiplier).toFixed(2));
                        const stock = pantryItems.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
                        const hasStock = stock && stock.quantity >= scaledQty;
                        return (
                          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-black/5">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", hasStock ? "bg-green-500" : "bg-orange-500")} />
                              <span className="font-bold">{ing.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{scaledQty} {ing.unit}</p>
                              <p className={cn("text-[10px] font-bold uppercase", hasStock ? "text-green-500" : "text-orange-500")}>
                                {hasStock ? "In Stock" : stock ? `Low: ${stock.quantity} left` : "Missing"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                   </div>
                </div>

                {viewingRecipe.instructions && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b border-black/5 pb-2">Instructions</h4>
                    <p className="text-gray-600 leading-relaxed font-medium italic serif text-lg">{viewingRecipe.instructions}</p>
                  </div>
                )}
                
                <button 
                  onClick={() => setViewingRecipe(null)}
                  className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all text-sm"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
