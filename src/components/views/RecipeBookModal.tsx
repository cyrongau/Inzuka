import React, { useState, useEffect } from 'react';
import { X, Plus, Search, BookOpen, Utensils, Package, Scan, CheckCircle2, Sparkles, Filter, ChevronLeft, Calendar, Camera, ImageIcon, Trash2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { generateRecipe } from '../../services/geminiService';
import { COMMUNITY_RECIPES } from '../../constants/recipes';
import { optimizeImage } from '../../lib/imageProcessor';
import { getDeterministicFoodImage } from '../../lib/utils';

export default function RecipeBookModal({ onClose, familyId, onPlanRecipe }: { onClose: () => void, familyId: string, onPlanRecipe: (recipe: any, mealType?: string) => void }) {
  const [userRecipes, setUserRecipes] = useState<any[]>([]);
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  
  const recipes = [...COMMUNITY_RECIPES, ...userRecipes];
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'ai'>('browse');
  
  // Browsing state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [viewingRecipe, setViewingRecipe] = useState<any>(null);
  const [showMealSelector, setShowMealSelector] = useState(false);

  // Create state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Breakfast');
  const [ingredients, setIngredients] = useState<{name: string, quantity: number, unit: string}[]>([]);
  const [ingName, setIngName] = useState('');
  const [ingQty, setIngQty] = useState('');
  const [ingUnit, setIngUnit] = useState('pieces');
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [servings, setServings] = useState(2);
  const [instructions, setInstructions] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // AI Generation State
  const [theme, setTheme] = useState('');
  const [region, setRegion] = useState('International');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    const unsubR = onSnapshot(query(collection(db, 'recipes'), where('familyId', '==', familyId)), s => {
      setUserRecipes(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubP = onSnapshot(query(collection(db, 'inventory'), where('familyId', '==', familyId)), s => {
      setPantryItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubP(); };
  }, [familyId]);

  const addIngredient = () => {
    if (!ingName || !ingQty) return;
    setIngredients([...ingredients, { name: ingName, quantity: parseFloat(ingQty), unit: ingUnit }]);
    setIngName('');
    setIngQty('');
  };

  const handleSaveRecipe = async () => {
    if (!title || ingredients.length === 0) return;
    try {
      const recipeData = {
        title,
        category,
        ingredients,
        familyId,
        image: recipeImage,
        servings,
        instructions,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'recipes', editingId), recipeData);
      } else {
        await addDoc(collection(db, 'recipes'), {
          ...recipeData,
          createdAt: serverTimestamp()
        });
      }

      setTitle('');
      setIngredients([]);
      setRecipeImage(null);
      setInstructions('');
      setServings(2);
      setEditingId(null);
      setActiveTab('browse');
    } catch (e: any) {
      console.error('Error saving recipe:', e);
      if (e.message?.includes('too large') || e.code === 'resource-exhausted') {
        alert("The recipe image is too large. Please try a smaller file (max 1MB).");
      } else {
        alert("Failed to save recipe: " + (e.message || "Unknown error"));
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimizedImage = await optimizeImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.7 });
        setRecipeImage(optimizedImage);
      } catch (err) {
        console.error('Image optimization failed:', err);
        alert('Failed to process image. Please try another one.');
      }
    }
  };

  const handleGenerateAI = async () => {
    if (!theme) return;
    setIsGenerating(true);
    try {
      const result = await generateRecipe(theme, region);
      setTitle(result.title);
      setCategory(result.category || 'Dinner');
      setIngredients(result.ingredients || []);
      setInstructions(result.instructions || '');
      setServings(result.servings || 2);
      
      const seed = result.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      setRecipeImage(getDeterministicFoodImage(seed)); 
      
      setEditingId(null);
      setActiveTab('create');
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to generate recipe. Please try a different theme.");
    } finally {
      setIsGenerating(false);
    }
  };

   const getRecipeImage = (recipe: any) => {
     if (recipe.image) return recipe.image;
     const seed = recipe.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
     return getDeterministicFoodImage(seed);
   };

  const calculateStockStatus = (recipe: any) => {
      if (!recipe.ingredients) return 0;
      let missing = 0;
      recipe.ingredients.forEach((req: any) => {
         const stock = pantryItems.find(p => p.name.toLowerCase() === req.name.toLowerCase());
         if (!stock || (stock.quantity || 0) < (req.quantity || 0)) missing++;
      });
      return missing;
  };

  const handleDeleteRecipe = async (recipe: any) => {
    if (recipe.id && !recipe.id.startsWith('comm-')) {
       try {
         await deleteDoc(doc(db, 'recipes', recipe.id));
         setViewingRecipe(null);
         setActiveTab('browse');
       } catch (e: any) {
         console.error(e);
         alert("Failed to delete recipe.");
       }
    } else {
       alert("Built-in community recipes cannot be deleted.");
    }
  };

  const startEditing = (recipe: any) => {
    setTitle(recipe.title);
    setCategory(recipe.category);
    setIngredients(recipe.ingredients);
    setInstructions(recipe.instructions || '');
    setRecipeImage(recipe.image || null);
    setServings(recipe.servings || 2);
    setEditingId(recipe.id && !recipe.id.startsWith('comm-') ? recipe.id : null);
    setViewingRecipe(null);
    setActiveTab('create');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-4xl w-full h-[85vh] shadow-2xl relative flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-gray-50 dark:bg-zinc-800 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors z-10 text-black dark:text-white">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4 mb-8 text-black dark:text-white">
           <BookOpen className="w-8 h-8 text-black dark:text-white" />
           <h2 className="text-4xl font-black tracking-tight italic serif">Recipe Book</h2>
        </div>

        <div className="flex gap-4 mb-8">
           <button onClick={() => { setActiveTab('browse'); setViewingRecipe(null); }} className={cn("px-6 py-3 rounded-full font-bold text-sm transition-all", activeTab === 'browse' ? "bg-black dark:bg-white text-white dark:text-black" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700")}>Browse Library</button>
           <button onClick={() => { setActiveTab('create'); setViewingRecipe(null); setEditingId(null); setTitle(''); setIngredients([]); setInstructions(''); setRecipeImage(null); }} className={cn("px-6 py-3 rounded-full font-bold text-sm transition-all", activeTab === 'create' ? "bg-black dark:bg-white text-white dark:text-black" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700")}>+ Create Recipe</button>
           <button onClick={() => { setActiveTab('ai'); setViewingRecipe(null); }} className={cn("px-6 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2", activeTab === 'ai' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40")}>
             <Sparkles className="w-4 h-4" /> AI Generator
           </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
           {viewingRecipe ? (
             <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setViewingRecipe(null)} className="flex items-center gap-2 text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white mb-8 transition-colors">
                  <ChevronLeft className="w-5 h-5" /> Back to Library
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-black dark:text-white">
                   <div>
                     <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border border-black/5 dark:border-white/5 aspect-square bg-gray-50 dark:bg-zinc-800">
                       <img src={getRecipeImage(viewingRecipe)} className="absolute inset-0 w-full h-full object-cover" alt={viewingRecipe.title} referrerPolicy="no-referrer" />
                       <div className="absolute top-6 left-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                         {viewingRecipe.category}
                       </div>
                     </div>
                   </div>
                    <div className="space-y-8">
                     <div>
                        <h2 className="text-5xl font-black italic serif leading-tight mb-4 text-black dark:text-white">{viewingRecipe.title}</h2>
                        {!showMealSelector ? (
                          <div className="flex flex-wrap gap-4">
                            <button 
                              onClick={() => setShowMealSelector(true)} 
                              className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                            >
                              <Calendar className="w-5 h-5" /> + Add to Meal Plan
                            </button>
                            <button 
                              onClick={() => startEditing(viewingRecipe)}
                              className="flex items-center gap-2 px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shadow-sm"
                            >
                              <Sparkles className="w-4 h-4" /> Edit & Personalize
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4 animate-in border border-indigo-100 dark:border-indigo-900/30 p-6 rounded-3xl bg-indigo-50/30 dark:bg-indigo-900/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Assign to Meal Slot:</p>
                            <div className="flex flex-wrap gap-2">
                              {['Breakfast', 'Lunch', 'Dinner'].map(mt => (
                                <button 
                                  key={mt}
                                  onClick={() => onPlanRecipe(viewingRecipe, mt.toLowerCase())}
                                  className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                  {mt}
                                </button>
                              ))}
                              <button onClick={() => setShowMealSelector(false)} className="px-6 py-3 bg-gray-100 dark:bg-zinc-800 rounded-2xl font-bold text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">Cancel</button>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-6">
                          {viewingRecipe.id && !viewingRecipe.id.startsWith('comm-') && (
                            <button 
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this personalized recipe?")) {
                                  handleDeleteRecipe(viewingRecipe);
                                }
                              }}
                              className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-xl"
                            >
                              <Trash2 className="w-3 h-3" /> Delete My Copy
                            </button>
                          )}
                        </div>
                      </div>
                     <div>
                       <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 border-b border-black/5 dark:border-white/5 pb-2">Ingredients</h4>
                       <div className="space-y-3">
                         {viewingRecipe.ingredients.map((ing: any, i: number) => {
                            const hasStock = pantryItems.some(p => p.name.toLowerCase() === ing.name.toLowerCase() && p.quantity >= ing.quantity);
                            return (
                              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5">
                                 <div className="flex items-center gap-3">
                                   <div className={cn("w-2 h-2 rounded-full", hasStock ? "bg-green-500" : "bg-orange-500")} />
                                   <span className="font-bold">{ing.name}</span>
                                 </div>
                                 <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{ing.quantity} {ing.unit}</div>
                              </div>
                            )
                         })}
                       </div>
                     </div>
                   </div>
                </div>
             </div>
           ) : activeTab === 'browse' && (
             <div className="space-y-8">
               <div className="flex flex-col md:flex-row gap-4 items-center">
                 <div className="relative flex-1 text-black dark:text-white">
                   <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                   <input 
                     type="text" 
                     placeholder="Search millions of recipes..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-[2rem] py-4 pl-14 pr-6 font-medium focus:bg-white dark:focus:bg-zinc-700 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all outline-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                   />
                 </div>
                 <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 w-full md:w-auto">
                   {['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'].map(cat => (
                     <button 
                       key={cat}
                       onClick={() => setFilterCategory(cat)}
                       className={cn("px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap", filterCategory === cat ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" : "bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700")}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {recipes.filter(r => {
                    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCat = filterCategory === 'All' || r.category === filterCategory;
                    return matchesSearch && matchesCat;
                 }).length === 0 && (
                     <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-2xl font-bold italic serif text-black dark:text-white">No recipes found</h3>
                        <p className="text-gray-400 dark:text-gray-500 max-w-sm mx-auto mb-6">We couldn't find anything matching your search. Why not let AI generate it for you?</p>
                        <button onClick={() => { setActiveTab('ai'); setTheme(searchQuery); }} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-6 py-3 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center gap-2 mx-auto">
                          <Sparkles className="w-4 h-4" /> Generate with AI
                        </button>
                     </div>
                 )}
                 {recipes.filter(r => {
                    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCat = filterCategory === 'All' || r.category === filterCategory;
                    return matchesSearch && matchesCat;
                 }).map(recipe => {
                   const missingCount = calculateStockStatus(recipe);
                   const isReady = missingCount === 0;

                   return (
                     <div key={recipe.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:shadow-xl transition-all flex flex-col group relative overflow-hidden text-black dark:text-white">
                        <div className="h-48 relative overflow-hidden bg-gray-50 dark:bg-zinc-800">
                          <img src={getRecipeImage(recipe)} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={recipe.title} referrerPolicy="no-referrer" />
                          <div className="absolute top-4 left-4">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-black dark:text-white px-3 py-1 rounded-full shadow-sm">{recipe.category}</span>
                          </div>
                          <div className="absolute top-4 right-4">
                            {isReady ? (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-500 dark:text-green-400 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-500 dark:text-orange-400 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                                <Package className="w-3 h-3" /> {missingCount} Missing
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-2xl font-black italic serif mb-4 text-black dark:text-white">{recipe.title}</h3>
                          <div className="space-y-2 mb-6">
                            {recipe.ingredients.slice(0,3).map((ing: any, i: number) => (
                               <p key={i} className="text-xs font-bold text-gray-500 dark:text-gray-400 flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                                  <span>{ing.name}</span>
                                  <span>{ing.quantity} {ing.unit}</span>
                               </p>
                            ))}
                            {recipe.ingredients.length > 3 && <p className="text-xs font-bold text-gray-400 dark:text-gray-500 pt-1">+{recipe.ingredients.length - 3} more</p>}
                          </div>
                          
                          <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                             <button onClick={() => setViewingRecipe(recipe)} className="py-3 bg-gray-50 dark:bg-zinc-800 text-black dark:text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition-all text-center">View Details</button>
                             <button onClick={() => onPlanRecipe(recipe)} className="py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all text-center">Plan Meal</button>
                          </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

            {!viewingRecipe && activeTab === 'create' && (
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-2 gap-6 text-black dark:text-white">
                  <div className="space-y-4 col-span-2 md:col-span-1">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Recipe Image</label>
                        <div className="relative group aspect-video rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all cursor-pointer">
                            {recipeImage ? (
                                <>
                                    <img src={recipeImage} className="absolute inset-0 w-full h-full object-cover" alt="Upload" />
                                    <button onClick={(e) => { e.stopPropagation(); setRecipeImage(null); }} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
                                </>
                            ) : (
                                <>
                                    <Camera className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Add Photo</span>
                                </>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                  </div>
                  <div className="space-y-6 col-span-2 md:col-span-1">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Recipe Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-bold focus:border-black/20 dark:focus:border-white/20 outline-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="e.g. Grandma's Lasagna" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-bold focus:border-black/20 dark:focus:border-white/20 outline-none text-black dark:text-white">
                            <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option><option>Dessert</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Base Servings</label>
                        <input type="number" value={servings} onChange={e => setServings(parseInt(e.target.value))} className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-bold focus:border-black/20 dark:focus:border-white/20 outline-none text-black dark:text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-black/5 dark:border-white/5 pb-2">Instructions</h4>
                  <textarea 
                    value={instructions} 
                    onChange={e => setInstructions(e.target.value)} 
                    placeholder="Step by step guide..." 
                    className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-sm min-h-[120px] resize-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-black/5 dark:border-white/5 pb-2">Requirements / Ingredients</h4>
                  <div className="flex gap-2 items-start">
                     <input value={ingName} onChange={e => setIngName(e.target.value)} placeholder="Ingredient name (e.g. Milk)" className="flex-1 bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                     <input type="number" step="0.1" value={ingQty} onChange={e => setIngQty(e.target.value)} placeholder="0.0" className="w-24 bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-sm text-center text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                     <select value={ingUnit} onChange={e => setIngUnit(e.target.value)} className="w-28 bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-medium outline-none text-sm text-black dark:text-white">
                       <option>Liters</option><option>Kg</option><option>grams</option><option>pieces</option><option>cups</option><option>tbsp</option>
                     </select>
                     <button onClick={addIngredient} className="bg-black dark:bg-white text-white dark:text-black p-4 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"><Plus className="w-5 h-5" /></button>
                  </div>

                  <div className="space-y-2 mt-4">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-black/5 dark:border-white/5 text-sm font-medium text-black dark:text-white">
                         <span>{ing.name}</span>
                         <span className="text-gray-400 dark:text-gray-500">{ing.quantity} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleSaveRecipe} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all text-sm shadow-xl">
                   Save to Library
                </button>
              </div>
            )}

            {!viewingRecipe && activeTab === 'ai' && (
              <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 py-10">
                 <div className="text-center space-y-2 mb-10 text-black dark:text-white">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-3xl font-black italic serif">AI Recipe Generator</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Discover new international cuisines and let AI draft your ingredients list instantly.</p>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">What are you craving? (Theme)</label>
                      <input value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-bold focus:border-indigo-200 dark:focus:border-indigo-500/50 outline-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="e.g. Spicy noodles, comforting soup, quick fish" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Culture / Region</label>
                      <select value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-bold focus:border-indigo-200 dark:focus:border-indigo-500/50 outline-none text-black dark:text-white">
                        <option>International</option>
                        <option>Kenyan</option>
                        <option>Italian</option>
                        <option>Mexican</option>
                        <option>Indian</option>
                        <option>Japanese</option>
                        <option>Middle Eastern</option>
                        <option>Thai</option>
                      </select>
                    </div>

                    <button 
                      onClick={handleGenerateAI} 
                      disabled={isGenerating || !theme}
                      className="w-full py-5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all text-sm shadow-xl disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                       {isGenerating ? (
                         <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cooking Details...</>
                       ) : (
                         <><Sparkles className="w-5 h-5" /> Generate Recipe</>
                       )}
                    </button>
                 </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
