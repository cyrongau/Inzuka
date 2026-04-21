import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ShoppingBag, 
  Search,
  MoreVertical,
  ChevronRight,
  ShoppingCart,
  Camera,
  TrendingUp,
  Receipt,
  Scan,
  History,
  Scale,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Package,
  X,
  Store,
  Calendar as CalendarIcon,
  ChevronsUp,
  ChevronsDown,
  ExternalLink,
  Sparkles,
  Brain,
  Tag,
  Info,
  Save
} from 'lucide-react';
import { AISmartScanner } from '../AISmartScanner';
import { AIIntelligenceBanner } from '../AIIntelligenceBanner';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { getShoppingInsights } from '../../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import PantryFormModal from './PantryFormModal';

const SHOPPING_TABS = [
  { id: 'lists', label: 'My Lists', icon: ShoppingBag },
  { id: 'scanner', label: 'Scanner', icon: Scan },
  { id: 'inflation', label: 'Inflation Tracker', icon: TrendingUp },
  { id: 'pantry', label: 'Household Stock', icon: Package },
];

const COMMON_STORES = ['Carrefour', 'Naivas', 'Quickmart', 'Chandarana', 'Zucchini', 'Local Market'];

export default function Shopping({ user, profile }: { user: any, profile: any }) {
  const [activeTab, setActiveTab] = useState('lists');
  const [lists, setLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [priceRecords, setPriceRecords] = useState<any[]>([]);
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  
  // New List/Item states
  const [showAddList, setShowAddList] = useState(false);
  const [showPantryForm, setShowPantryForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');

  const familyId = profile?.familyId;

  // Scanner states
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchingProduct, setMatchingProduct] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');
  const [selectedStore, setSelectedStore] = useState('Naivas');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  // Detail View State
  const [detailProduct, setDetailProduct] = useState<any>(null);

  // AI States
  const [aiScannerOpen, setAiScannerOpen] = useState(false);

  useEffect(() => {
    if (!familyId) return;

    const unsubLists = onSnapshot(query(collection(db, 'shoppingLists'), where('familyId', '==', familyId)), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setLists(data);
      if (data.length > 0 && !selectedListId) setSelectedListId(data[0].id);
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('familyId', '==', familyId)), (s) => {
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPrices = onSnapshot(query(collection(db, 'priceRecords'), where('familyId', '==', familyId), orderBy('date', 'desc'), limit(500)), (s) => {
      setPriceRecords(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPantry = onSnapshot(query(collection(db, 'inventory'), where('familyId', '==', familyId)), (s) => {
      setPantryItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubLists(); unsubProducts(); unsubPrices(); unsubPantry(); };
  }, [familyId]);

  // Scanner Logic
  useEffect(() => {
    if (activeTab === 'scanner' && isScanning && !scannerRef.current) {
        const scanner = new Html5Qrcode("reader");
        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                setScannedCode(decodedText);
                const prod = products.find(p => p.barcode === decodedText);
                setMatchingProduct(prod || { name: 'Unknown Product', barcode: decodedText });
                setIsScanning(false);
                scanner.stop();
            },
            (error) => {}
        ).catch(err => console.error(err));
        scannerRef.current = scanner;
    }
    return () => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
            scannerRef.current = null;
        }
    };
  }, [activeTab, isScanning, products]);

  const selectedList = lists.find(l => l.id === selectedListId);

  const createList = async () => {
    if (!newListName.trim() || !familyId) return;
    try {
      const docRef = await addDoc(collection(db, 'shoppingLists'), {
        name: newListName, 
        items: [], 
        createdAt: serverTimestamp(), 
        userId: user.uid,
        familyId: familyId
      });
      setNewListName(''); 
      setShowAddList(false); 
      setSelectedListId(docRef.id);
      toast.success(`Created shopping group: ${newListName}`);
    } catch (e) {
      toast.error("Failed to create list");
    }
  };

  const addItem = async () => {
    if (!newItemName.trim() || !selectedListId) return;
    try {
      const listRef = doc(db, 'shoppingLists', selectedListId);
      const updatedItems = [...(selectedList?.items || []), { 
        id: Date.now().toString(), 
        name: newItemName, 
        quantity: newItemQuantity, 
        bought: false 
      }];
      await updateDoc(listRef, { items: updatedItems });
      setNewItemName(''); 
      setNewItemQuantity('');
      toast.success(`Added ${newItemName}`);
    } catch (e) {
      toast.error("Failed to add item");
    }
  };

  const deleteList = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingLists', id));
      toast.success(`Deleted ${name}`);
    } catch (e) {
      toast.error("Failed to delete list");
    }
  };

  const handleConsume = async (item: any) => {
    const newQty = Math.max(0, item.quantity - 0.5);
    await updateDoc(doc(db, 'inventory', item.id), { quantity: newQty });

    if (newQty <= item.lowStockThreshold && item.quantity > item.lowStockThreshold) {
      toast.warning(`${item.name} is running low!`);
      // Auto-add to the first list or create one
      let targetListId = selectedListId;
      let targetList = selectedList;

      if (!targetListId && lists.length > 0) {
         targetListId = lists[0].id;
         targetList = lists[0];
      }

      if (targetListId && targetList) {
         const exists = targetList.items?.find((i: any) => i.name.toLowerCase() === item.name.toLowerCase() && !i.bought);
         if (!exists) {
            const listRef = doc(db, 'shoppingLists', targetListId);
            const updatedItems = [...(targetList.items || []), { id: Date.now().toString(), name: item.name, quantity: '1', bought: false, autoAdded: true }];
            await updateDoc(listRef, { items: updatedItems });
         }
      }
    }
  };

  const recordPrice = async () => {
    if (!matchingProduct || !newPrice || !familyId) return;
    let productId = matchingProduct.id;
    
    // Create product if it doesn't exist
    if (!productId) {
        const prodRef = await addDoc(collection(db, 'products'), {
            name: matchingProduct.name,
            barcode: matchingProduct.barcode || '',
            baselinePrice: parseFloat(newPrice), // Use current as baseline if first time
            userId: user.uid,
            familyId: familyId,
            category: 'Groceries'
        });
        productId = prodRef.id;
    }

    await addDoc(collection(db, 'priceRecords'), {
        productId,
        price: parseFloat(newPrice),
        date: new Date().toISOString(),
        userId: user.uid,
        familyId: familyId,
        store: selectedStore
    });

    toast.success(`Price recorded for ${matchingProduct.name}`);
    setScannedCode(null);
    setMatchingProduct(null);
    setNewPrice('');
    setActiveTab('inflation');
  };

  const getProductStats = (product: any) => {
    const history = priceRecords
      .filter(r => r.productId === product.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const latestPrice = history.length > 0 ? history[history.length - 1].price : product.baselinePrice;
    const diff = latestPrice - product.baselinePrice;
    const percent = Math.round((diff / product.baselinePrice) * 100);

    // Group by store for best price detection
    const storePrices = history.reduce((acc: any, curr) => {
      if (!acc[curr.store] || acc[curr.store].date < curr.date) {
        acc[curr.store] = curr;
      }
      return acc;
    }, {});

    const sortedStores = Object.values(storePrices).sort((a: any, b: any) => a.price - b.price);
    const bestPrice = sortedStores[0] as any;

    return { history, latestPrice, diff, percent, bestPrice, sortedStores };
  };

  const calculateListEstimate = (items: any[]) => {
    let total = 0;
    let confidence = 0;
    
    items?.forEach(item => {
      // Look for a product with a similar name
      const product = products.find(p => p.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(p.name.toLowerCase()));
      if (product) {
        const stats = getProductStats(product);
        const qty = parseFloat(item.quantity) || 1;
        total += stats.latestPrice * qty;
        confidence++;
      }
    });

    return { total, confidence: items?.length ? Math.round((confidence / items.length) * 100) : 0 };
  };

  if (!familyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
        <div className="w-24 h-24 bg-blue-50 text-blue-400 rounded-[2.5rem] flex items-center justify-center">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold italic serif tracking-tight">Household Sync Required</h3>
          <p className="text-gray-500 max-w-md mt-2 font-light">Shopping lists and pantry price index are collaborative. Please setup your household in your profile to sync with your family.</p>
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
    <div className="space-y-8 pb-20">
      {/* AI Intelligence Header */}
      <AIIntelligenceBanner 
        familyId={familyId}
        pantryItems={pantryItems}
        shoppingLists={lists}
      />

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {SHOPPING_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setDetailProduct(null);
            }}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-black dark:bg-white text-white dark:text-black shadow-xl" 
                : "bg-white dark:bg-zinc-900 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-black/5 dark:border-white/5"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {activeTab === 'lists' && (
          <>
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">Shopping Groups</h3>
                <button onClick={() => setShowAddList(!showAddList)} className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"><Plus className="w-5 h-5" /></button>
              </div>

              {showAddList && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-xl space-y-4">
                  <input placeholder="List Name" value={newListName} onChange={e => setNewListName(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 border border-black/5 dark:border-white/5 font-medium text-black dark:text-white" />
                  <div className="flex gap-2">
                    <button onClick={createList} className="flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold">Create</button>
                    <button onClick={() => setShowAddList(false)} className="px-6 py-4 bg-gray-100 dark:bg-zinc-800 rounded-xl font-bold text-gray-500 dark:text-gray-400">Cancel</button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                {lists.map(list => (
                  <div key={list.id} onClick={() => setSelectedListId(list.id)} className={cn("p-5 rounded-[2rem] cursor-pointer border transition-all flex items-center justify-between group", selectedListId === list.id ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xl" : "bg-white dark:bg-zinc-900 border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]")}>
                    <div className="flex items-center gap-4">
                       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", selectedListId === list.id ? "bg-white/20 dark:bg-black/10 text-white dark:text-black" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700")}>
                         <ShoppingBag className="w-6 h-6" />
                       </div>
                       <div><p className="font-bold">{list.name}</p><p className="text-[10px] opacity-50 uppercase tracking-widest font-bold">{list.items?.length || 0} items</p></div>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-all", selectedListId === list.id ? "opacity-100 translate-x-1" : "opacity-30")} />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-black/5 dark:border-white/5 shadow-sm min-h-[600px] flex flex-col">
              {selectedList ? (
                <div className="space-y-8 flex-1 flex flex-col">
                  <div className="flex items-start justify-between border-b border-black/5 dark:border-white/5 pb-8">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-4xl font-bold tracking-tighter serif italic text-black dark:text-white">{selectedList.name}</h2>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            {Math.round((selectedList.items?.filter((i:any)=>i.bought).length / (selectedList.items?.length || 1)) * 100)}% Complete
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{selectedList.items?.length || 0} Items Total</p>
                        </div>
                      </div>

                      {/* Financial Estimate Badge */}
                      {selectedList.items?.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold",
                            calculateListEstimate(selectedList.items).confidence > 50 ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-500" : "bg-gray-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-gray-500 dark:text-gray-400"
                          )}>
                             <Receipt className="w-4 h-4" />
                             Estimated Cost: KES {calculateListEstimate(selectedList.items).total.toLocaleString()}
                          </div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-300 ml-1">
                            {calculateListEstimate(selectedList.items).confidence}% Confidence based on price history
                          </p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteList(selectedList.id, selectedList.name)} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <input 
                       placeholder="Add something to buy..." value={newItemName} onChange={e => setNewItemName(e.target.value)} 
                       onKeyPress={e => e.key === 'Enter' && addItem()}
                       className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl px-6 py-4 text-lg font-medium focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 focus:outline-none text-black dark:text-white"
                    />
                    <button onClick={addItem} className="bg-black dark:bg-white text-white dark:text-black px-10 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">Add Item</button>
                  </div>

                  <div className="space-y-3 flex-1">
                    {selectedList.items?.sort((a:any, b:any) => Number(a.bought) - Number(b.bought)).map((item: any) => (
                      <div key={item.id} className={cn("flex items-center justify-between p-5 rounded-3xl border transition-all group", item.bought ? "bg-gray-50 dark:bg-zinc-800 border-transparent opacity-60" : "bg-white dark:bg-zinc-900 border-black/[0.05] dark:border-white/[0.05] hover:border-black/20 dark:hover:border-white/20 hover:shadow-md")}>
                        <div className="flex items-center gap-4">
                           <button 
                             onClick={() => {
                               const updated = selectedList.items.map((i:any) => i.id === item.id ? {...i, bought: !i.bought} : i);
                               updateDoc(doc(db, 'shoppingLists', selectedList.id), { items: updated });
                             }}
                             className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95", item.bought ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-lg" : "border-black/10 dark:border-white/10 text-gray-200 dark:text-gray-600 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700")}
                           >
                             <CheckCircle2 className="w-5 h-5" />
                           </button>
                           <span className={cn("text-lg font-bold text-black dark:text-white", item.bought && "line-through text-gray-400 dark:text-gray-500 italic font-medium")}>{item.name}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = selectedList.items.filter((i:any) => i.id !== item.id);
                            updateDoc(doc(db, 'shoppingLists', selectedList.id), { items: updated });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-3 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {selectedList.items?.length === 0 && (
                      <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                        <ShoppingCart className="w-12 h-12 mb-4 opacity-10" />
                        <p className="text-sm italic serif font-medium">No items yet. What do we need today?</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-20"><ShoppingCart className="w-20 h-20 mb-4" /><p className="text-2xl font-bold serif italic">Select a list to start</p></div>
              )}
            </div>
          </>
        )}

        {activeTab === 'scanner' && (
          <div className="lg:col-span-12 max-w-4xl mx-auto w-full space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Traditional Barcode Scanner */}
                <div className="bg-black dark:bg-white text-white dark:text-black p-10 rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                   <div className="relative z-10 space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                           <h3 className="text-3xl font-bold tracking-tight italic serif">Barcode Lens</h3>
                           <p className="text-xs font-bold text-white/40 dark:text-black/40 uppercase tracking-widest">Standard UPC/EAN</p>
                         </div>
                         <div className="w-12 h-12 bg-white/10 dark:bg-black/10 rounded-2xl flex items-center justify-center border border-white/10 dark:border-black/10">
                            <Scan className="w-6 h-6" />
                         </div>
                      </div>

                      {!scannedCode ? (
                        <div className="space-y-6">
                           <div id="reader" className={cn("bg-white/5 dark:bg-black/5 rounded-[2.5rem] overflow-hidden min-h-[300px] border-2 border-dashed border-white/20 dark:border-black/20 transition-all flex items-center justify-center relative", !isScanning && "hidden")}>
                             <div className="absolute inset-0 border-4 border-white/10 dark:border-black/10 m-8 rounded-3xl animate-pulse"></div>
                           </div>
                           {!isScanning && (
                              <button 
                                onClick={() => setIsScanning(true)}
                                className="w-full bg-white dark:bg-black text-black dark:text-white py-10 rounded-[2.5rem] font-bold text-xl flex flex-col items-center gap-4 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group"
                              >
                                 <div className="w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Camera className="w-7 h-7" /></div>
                                 Start Camera Scan
                              </button>
                           )}
                           {isScanning && (
                             <button onClick={() => setIsScanning(false)} className="w-full py-4 bg-white/10 dark:bg-black/10 rounded-2xl font-bold hover:bg-white/20 dark:hover:bg-black/20">Cancel Camera</button>
                           )}
                        </div>
                      ) : (
                        <p className="text-white/60 dark:text-black/60 italic font-medium">Scanned successfully. View results below.</p>
                      )}
                   </div>
                   
                   <p className="text-[10px] items-center gap-2 flex text-white/30 dark:text-black/30 uppercase tracking-[0.2em] font-bold mt-8">
                      <Info className="w-3 h-3" /> Best for packaged goods
                   </p>
                </div>

                {/* AI Smart Vision Scanner (Modularized for Native Portability) */}
                <AISmartScanner 
                  familyId={familyId}
                  userId={user.uid}
                  products={products}
                />
             </div>

             {/* Barcode results section wrapper */}
             <div className="relative">
                {scannedCode && (
                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-zinc-900 text-black dark:text-white p-10 rounded-[3rem] space-y-8 shadow-2xl relative z-10">
                      {/* ... existing barcode result content ... */}
                      <div className="flex items-center gap-6">
                         <div className="w-20 h-20 bg-black dark:bg-white rounded-[2rem] flex items-center justify-center text-white dark:text-black shadow-xl rotate-3"><Package className="w-10 h-10" /></div>
                         <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Product Detected</p>
                            <h4 className="text-3xl font-bold tracking-tighter">{matchingProduct?.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Scan className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 tracking-wider">CODE: {scannedCode}</span>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6 pt-6 border-t border-black/5 dark:border-white/5">
                         <div className="space-y-4">
                           <div className="flex items-center justify-between">
                             <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                               <Store className="w-4 h-4" /> Select Store
                             </p>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              {COMMON_STORES.map(store => (
                                <button 
                                  key={store} 
                                  onClick={() => setSelectedStore(store)}
                                  className={cn(
                                    "px-4 py-3 rounded-xl font-bold text-xs transition-all border",
                                    selectedStore === store 
                                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-lg" 
                                      : "bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 border-black/5 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                  )}
                                >
                                  {store}
                                </button>
                              ))}
                           </div>
                         </div>

                         <div className="space-y-4 pt-4">
                           <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2"><Scale className="w-4 h-4" /> Current Price (KES)</p>
                           <div className="relative">
                             <input 
                               type="number" placeholder="0.00" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                               className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl p-8 text-5xl font-black focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/10"
                             />
                             <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 font-bold uppercase tracking-widest text-xs">KES</div>
                           </div>
                         </div>
                         
                         {matchingProduct?.baselinePrice && (
                           <div className={cn("p-6 rounded-2xl flex items-center justify-between text-sm font-bold shadow-inner", parseFloat(newPrice) > matchingProduct.baselinePrice ? "bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-500" : "bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-500")}>
                             <div className="flex flex-col">
                               <span className="text-[10px] uppercase tracking-widest opacity-60">Baseline Target</span>
                               <span>KES {matchingProduct.baselinePrice.toLocaleString()}</span>
                             </div>
                             <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase tracking-widest opacity-60">Variation</span>
                                <span className="flex items-center gap-1 font-black">
                                  {parseFloat(newPrice) > matchingProduct.baselinePrice ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                  {Math.round(((parseFloat(newPrice) - matchingProduct.baselinePrice) / matchingProduct.baselinePrice) * 100)}%
                                </span>
                             </div>
                           </div>
                         )}

                         <div className="flex gap-3 pt-4">
                           <button onClick={recordPrice} className="flex-[2] bg-black dark:bg-white text-white dark:text-black py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-transform">Record Price</button>
                           <button onClick={() => {setScannedCode(null); setMatchingProduct(null);}} className="flex-1 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 rounded-[2.5rem] font-bold flex items-center justify-center p-6 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"><X className="w-8 h-8" /></button>
                         </div>
                      </div>
                   </motion.div>
                )}
                {/* Visual Flair Background */}
                <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-black/[0.02] dark:bg-white/[0.02] rounded-full blur-[80px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-black/[0.02] dark:bg-white/[0.02] rounded-full blur-[60px]"></div>
             </div>
          </div>
        )}

        {activeTab === 'inflation' && !detailProduct && (
          <div className="lg:col-span-12 space-y-8 animate-in fade-in slide-in-from-bottom-5">
             <div className="bg-white dark:bg-zinc-900 p-12 rounded-[4rem] border border-black/5 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-12">
                   <div className="space-y-1">
                     <h3 className="text-4xl font-black tracking-tight serif italic tracking-tighter text-black dark:text-white">Household Price Index</h3>
                     <p className="text-xs uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500">Personal Inflation Analytics</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const name = prompt('Product Name:');
                          const price = prompt('Standard Price:');
                          if (name && price) {
                            addDoc(collection(db, 'products'), {
                              name,
                              barcode: '',
                              baselinePrice: parseFloat(price),
                              userId: user.uid,
                              category: 'Manual'
                            });
                          }
                        }}
                        className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold hover:scale-110 active:scale-95 transition-transform shadow-xl"
                      >
                         <Plus className="w-4 h-4" /> Add Standard
                      </button>
                      <div className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold border border-black/5 dark:border-white/5">
                         <TrendingUp className="w-4 h-4" /> Status: Stable
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {products.map(product => {
                      const { latestPrice, diff, percent, bestPrice } = getProductStats(product);

                      return (
                        <div key={product.id} onClick={() => setDetailProduct(product)} className="bg-gray-50/50 dark:bg-zinc-800/50 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 space-y-8 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xl transition-all group cursor-pointer relative overflow-hidden">
                           <div className="flex justify-between items-start relative z-10">
                              <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-[1.5rem] shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all"><Package className="w-8 h-8" /></div>
                              <div className={cn("px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-tighter shadow-sm", diff > 0 ? "bg-red-500 text-white" : "bg-green-500 text-white")}>
                                 {diff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                 {Math.abs(percent)}% {diff > 0 ? 'Up' : 'Saving'}
                              </div>
                           </div>
                           
                           <div className="relative z-10">
                              <h4 className="text-2xl font-bold tracking-tight">{product.name}</h4>
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Standard: KES {product.baselinePrice}</p>
                                {bestPrice && (
                                  <>
                                    <span className="text-gray-200">|</span>
                                    <p className="text-[10px] text-green-600 uppercase tracking-widest font-bold flex items-center gap-1"><Store className="w-2.5 h-2.5" /> Best at {bestPrice.store}</p>
                                  </>
                                )}
                              </div>
                           </div>

                           <div className="flex items-end justify-between border-t border-black/[0.04] pt-6 relative z-10">
                              <div>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-80 mb-1">Last Recorded Price</p>
                                 <p className="text-3xl font-black">KES {latestPrice.toLocaleString()}</p>
                              </div>
                              <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center group-hover:bg-black/90 group-hover:text-white transition-all">
                                <ChevronRight className="w-6 h-6" />
                              </div>
                           </div>
                           
                           {/* Mini Trend Line Sparkle Effect */}
                           <div className="absolute top-[-30%] right-[-10%] w-48 h-48 bg-black/[0.02] rounded-full blur-2xl group-hover:bg-black/[0.05] transition-colors"></div>
                        </div>
                      );
                   })}
                   
                   {products.length === 0 && (
                     <div className="col-span-full py-32 text-center space-y-6 opacity-40">
                        <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center"><AlertTriangle className="w-12 h-12" /></div>
                        <div className="space-y-2">
                          <p className="text-3xl font-black serif italic tracking-tighter">No standards tracked yet</p>
                          <p className="text-sm max-w-sm mx-auto font-medium">Start building your shopping intel by scanning products in the store or adding them manually.</p>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Pantry View */}
        {activeTab === 'pantry' && (
          <div className="lg:col-span-12 space-y-8 animate-in fade-in zoom-in-95 duration-300">
             <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-sm space-y-8 min-h-[500px]">
                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <h3 className="text-3xl font-black italic serif tracking-tight text-black dark:text-white">Household Stock</h3>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Track pantry & cleaning supplies usage</p>
                   </div>
                   <button onClick={() => setShowPantryForm(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">
                      + Add Stock Item
                   </button>
                </div>
                
                {pantryItems.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                     <Package className="w-16 h-16 text-gray-200 mx-auto" />
                     <p className="text-gray-400 italic">No inventory tracked yet. Start monitoring groceries and cleaning supplies.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {pantryItems.map(item => {
                        const usageRatio = item.lowStockThreshold && item.quantity > 0 ? (item.quantity / (item.lowStockThreshold * 2)) * 100 : 100;
                        const isLow = item.quantity <= item.lowStockThreshold;

                        return (
                          <div key={item.id} className={cn(
                            "p-6 rounded-[2rem] border transition-all relative overflow-hidden group",
                            isLow ? "border-red-500/30 bg-red-50/50 dark:bg-red-900/10" : "border-black/[0.05] dark:border-white/[0.05] bg-gray-50/50 dark:bg-zinc-800/50"
                          )}>
                             {isLow && <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                             
                             <div className="flex items-center justify-between mb-4">
                               <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.category}</p>
                               <button onClick={() => deleteDoc(doc(db, 'inventory', item.id))} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-500 transition-all rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             </div>

                             <h4 className="text-xl font-black italic serif mb-1 text-black dark:text-white">{item.name}</h4>
                             <p className={cn("text-2xl font-black mb-6 flex items-baseline gap-1", isLow ? "text-red-500" : "text-black dark:text-white")}>
                               {item.quantity} <span className="text-sm font-bold opacity-40 uppercase tracking-widest">{item.unit}</span>
                             </p>

                             <div className="space-y-4">
                               <div className="h-2 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                 <div 
                                    className={cn("h-full rounded-full transition-all", isLow ? "bg-red-500" : "bg-black dark:bg-white")} 
                                    style={{ width: `${Math.min(usageRatio, 100)}%` }} 
                                 />
                               </div>
                               <div className="flex items-center gap-2">
                                  <button onClick={() => handleConsume(item)} className="flex-1 py-3 bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-zinc-700 text-black dark:text-white">- Consume</button>
                                  <button onClick={() => updateDoc(doc(db, 'inventory', item.id), { quantity: item.quantity + 1 })} className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-900 dark:hover:bg-gray-200">+ Restock</button>
                               </div>
                             </div>
                          </div>
                        );
                     })}
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Detailed Product Analysis View */}
        {activeTab === 'inflation' && detailProduct && (
          <div className="lg:col-span-12 space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-zinc-900 rounded-[4rem] border border-black/5 dark:border-white/5 shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
              {/* Header */}
              <div className="p-12 bg-black dark:bg-zinc-950 text-white flex flex-col md:flex-row md:items-end justify-between gap-8 relative">
                <div className="space-y-4 relative z-10">
                  <button onClick={() => setDetailProduct(null)} className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4 rotate-180" /> Back to Tracker
                  </button>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center border border-white/10"><Package className="w-12 h-12" /></div>
                    <div>
                      <h2 className="text-5xl font-black tracking-tighter italic serif">{detailProduct.name}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">{detailProduct.barcode || 'NO BARCODE'}</p>
                        <span className="text-white/20">•</span>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">{detailProduct.category}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10">
                   <div className="bg-white/10 p-6 rounded-[2rem] border border-white/5 space-y-1">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Baseline Standard</p>
                      <p className="text-2xl font-black">KES {detailProduct.baselinePrice.toLocaleString()}</p>
                   </div>
                   <div className={cn("p-6 rounded-[2rem] space-y-1 min-w-[140px]", getProductStats(detailProduct).diff > 0 ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30")}>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Market Status</p>
                      <p className="text-2xl font-black flex items-center gap-2">
                        {getProductStats(detailProduct).diff > 0 ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                        {Math.abs(getProductStats(detailProduct).percent)}%
                      </p>
                   </div>
                </div>
                
                <div className="absolute top-[-50%] left-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px]"></div>
              </div>

              <div className="p-12 grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
                {/* Left Side: Chart */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black tracking-tight flex items-center gap-3 text-black dark:text-white">
                      <TrendingUp className="w-6 h-6 text-gray-300 dark:text-gray-600" /> Price History (Time Series)
                    </h4>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 p-2 rounded-xl">
                      <button className="bg-white dark:bg-zinc-700 px-4 py-2 rounded-lg text-[10px] font-bold shadow-sm uppercase tracking-widest text-black dark:text-white">Growth View</button>
                      <button className="text-gray-400 dark:text-gray-500 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-black dark:hover:text-white">Comparative</button>
                    </div>
                  </div>
                  
                  <div className="h-[400px] w-full bg-gray-50/50 dark:bg-zinc-800/50 rounded-[3rem] p-8 border border-black/[0.02] dark:border-white/[0.02]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getProductStats(detailProduct).history.map(h => ({ name: new Date(h.date).toLocaleDateString(), price: h.price }))}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontWeight: 'bold'}} />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px'}} 
                        />
                        <ReferenceLine y={detailProduct.baselinePrice} label={{ value: 'STANDARD', fill: '#9CA3AF', fontSize: 8, fontWeight: 'bold', position: 'insideTopLeft' }} stroke="#9CA3AF" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="price" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorPrice)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right Side: Store Breakdown */}
                <div className="lg:col-span-4 space-y-8">
                  <h4 className="text-xl font-black tracking-tight flex items-center gap-3">
                    <Store className="w-6 h-6 text-gray-300" /> Market Breakdown
                  </h4>
                  
                  <div className="space-y-4">
                    {getProductStats(detailProduct).sortedStores.map((store: any, idx: number) => (
                      <div key={store.store} className={cn("p-6 rounded-[2rem] border transition-all flex items-center justify-between", idx === 0 ? "bg-green-50 border-green-200" : "bg-white border-black/5")}>
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", idx === 0 ? "bg-green-500 text-white shadow-lg" : "bg-gray-100 text-gray-400")}>
                            {idx === 0 ? <TrendingUp className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="text-sm font-black">{store.store}</p>
                            <p className="text-[10px] font-bold text-gray-400 italic">Last recorded {new Date(store.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black">KES {store.price.toLocaleString()}</p>
                          {idx === 0 && <span className="text-[10px] text-green-600 font-black uppercase tracking-widest">Cheapest Point</span>}
                        </div>
                      </div>
                    ))}
                    
                    <button className="w-full py-6 rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-[0.2em] hover:border-black/20 hover:text-black transition-all flex items-center justify-center gap-2 ring-inner">
                      <CalendarIcon className="w-4 h-4" /> Export Audit Log
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPantryForm && <PantryFormModal onClose={() => setShowPantryForm(false)} familyId={familyId} />}

    </div>
  );
}
