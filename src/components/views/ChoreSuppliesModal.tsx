import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Package } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';

export default function ChoreSuppliesModal({ onClose, familyId, choreName }: { onClose: () => void, familyId: string, choreName: string }) {
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);

  useEffect(() => {
    if (!familyId) return;
    const unsubP = onSnapshot(query(collection(db, 'inventory'), where('familyId', '==', familyId)), s => {
      setPantryItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubL = onSnapshot(query(collection(db, 'shoppingLists'), where('familyId', '==', familyId)), s => {
      setLists(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubP(); unsubL(); };
  }, [familyId]);

  const handleConsume = async (item: any) => {
    const newQty = Math.max(0, item.quantity - 0.5);
    await updateDoc(doc(db, 'inventory', item.id), { quantity: newQty });

    if (newQty <= (item.lowStockThreshold || 1) && item.quantity > (item.lowStockThreshold || 1)) {
      if (lists.length > 0) {
         const targetList = lists[0];
         const exists = targetList.items?.find((i: any) => i.name.toLowerCase() === item.name.toLowerCase() && !i.bought);
         if (!exists) {
            const listRef = doc(db, 'shoppingLists', targetList.id);
            const updatedItems = [...(targetList.items || []), { id: Date.now().toString(), name: item.name, quantity: '1', bought: false, autoAdded: true }];
            await updateDoc(listRef, { items: updatedItems });
         }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] p-10 max-w-3xl w-full h-[80vh] shadow-2xl relative flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors z-10">
          <X className="w-5 h-5" />
        </button>
        
        <div className="mb-6">
           <h2 className="text-3xl font-black tracking-tight italic serif">Log Supplies Used</h2>
           <p className="text-gray-400 font-medium mt-1">For task: <span className="text-black font-bold">{choreName}</span></p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
           {pantryItems.length === 0 ? (
             <div className="py-20 text-center space-y-4">
               <Package className="w-16 h-16 text-gray-200 mx-auto" />
               <p className="text-gray-400 italic">No inventory tracked yet.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {pantryItems.map(item => {
                  const isLow = item.quantity <= (item.lowStockThreshold || 1);
                  return (
                    <div key={item.id} className={cn("p-4 rounded-3xl border flex items-center justify-between", isLow ? "bg-red-50/50 border-red-500/20" : "bg-gray-50 border-black/5")}>
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</p>
                         <h4 className="font-bold text-lg">{item.name}</h4>
                         <p className={cn("text-xs font-black", isLow ? "text-red-500" : "text-black")}>
                           {item.quantity} {item.unit}
                         </p>
                       </div>
                       <button onClick={() => handleConsume(item)} className="px-4 py-3 bg-white border border-black/5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 active:scale-95 transition-all shadow-sm">
                         - Consume
                       </button>
                    </div>
                  );
               })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
