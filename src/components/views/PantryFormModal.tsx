import React, { useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function PantryFormModal({ onClose, familyId }: { onClose: () => void, familyId: string }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pieces');
  const [category, setCategory] = useState('Groceries');
  const [lowStockDb, setLowStockDb] = useState('1');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity) return;
    await addDoc(collection(db, 'inventory'), {
      name,
      quantity: parseFloat(quantity),
      unit,
      category,
      lowStockThreshold: parseFloat(lowStockDb),
      familyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-black tracking-tight italic serif mb-8">Add Stock Item</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Item Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Liquid Soap, Rice" className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none focus:border-black/20" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Curr. Qty</label>
              <input type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} required placeholder="0.0" className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none text-center" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none text-center">
                 <option value="Liters">Liters</option>
                 <option value="Kg">Kg</option>
                 <option value="grams">grams</option>
                 <option value="pieces">pieces</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none">
                 <option value="Groceries">Groceries</option>
                 <option value="Cleaning Supplies">Cleaning Supplies</option>
                 <option value="Toiletries">Toiletries</option>
                 <option value="Misc">Misc</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Low Alert At</label>
              <input type="number" step="0.1" value={lowStockDb} onChange={e => setLowStockDb(e.target.value)} required placeholder="1" className="w-full bg-gray-50 p-4 rounded-2xl border border-black/5 font-medium outline-none text-center text-red-500" />
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all text-sm mt-4">
            Save Item
          </button>
        </form>
      </div>
    </div>
  );
}
