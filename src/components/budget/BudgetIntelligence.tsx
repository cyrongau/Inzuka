import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Brain, X, Receipt, Tag, Save, Loader2, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { scanReceipt, parseTransactionText, ExtractedReceiptData } from '../../services/geminiService';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BudgetIntelligenceProps {
  userId: string;
  onExtractionComplete?: () => void;
}

/**
 * BudgetIntelligence - Modular component for AI-powered transaction extraction and advice.
 * Supports both Receipt Scan (Camera/Upload) and SMS/Text parsing.
 */
export const BudgetIntelligence: React.FC<BudgetIntelligenceProps> = ({ 
  userId,
  onExtractionComplete 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ExtractedReceiptData | null>(null);
  const [rawText, setRawText] = useState('');
  const [activeMode, setActiveMode] = useState<'camera' | 'text'>('camera');
  const [editCategory, setEditCategory] = useState('');
  const [editMerchant, setEditMerchant] = useState('');

  const PREDEFINED_CATEGORIES = ['rent', 'school_fees', 'utility', 'medical', 'insurance', 'emergency', 'misc', 'transport', 'project', 'gaming', 'food', 'shopping', 'custom'];

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsScanning(true);
      setScanResult(null);
      try {
        const result = await scanReceipt(base64, file.type);
        setScanResult(result);
        setEditCategory(result.category);
        setEditMerchant(result.merchant);
        toast.success("Receipt Analyzed!");
      } catch (err) {
        toast.error("Failed to analyze receipt");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextParse = async () => {
    if (!rawText.trim()) return;
    setIsScanning(true);
    try {
      const result = await parseTransactionText(rawText);
      setScanResult(result);
      setEditCategory(result.category);
      setEditMerchant(result.merchant);
      setRawText('');
      toast.success("Transaction Extracted!");
    } catch (err) {
      toast.error("Failed to parse text");
    } finally {
      setIsScanning(false);
    }
  };

  const saveToLedger = async () => {
    if (!scanResult) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        userId,
        amount: scanResult.amount,
        category: editCategory,
        description: `${editMerchant} (${scanResult.transactionType})`,
        transactionDate: new Date(scanResult.date).toISOString() || new Date().toISOString(),
        date: new Date(scanResult.date).toISOString() || new Date().toISOString(), // Keep date for backward compatibility in views
        isPaid: true,
        source: 'AI Extraction',
        loggedAt: serverTimestamp()
      });
      
      toast.success("Transaction saved to ledger!");
      setScanResult(null);
      if (onExtractionComplete) onExtractionComplete();
    } catch (e) {
      toast.error("Failed to save transaction");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Mode Toggle */}
      <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl w-fit mx-auto">
        <button 
          onClick={() => setActiveMode('camera')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeMode === 'camera' ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
        >
          <Camera className="w-4 h-4" /> Receipt
        </button>
        <button 
          onClick={() => setActiveMode('text')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeMode === 'text' ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
        >
          <MessageSquareText className="w-4 h-4" /> Text/SMS
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white/10 p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-black dark:text-white">
              <h3 className="text-2xl font-bold tracking-tight italic serif">Finance Intelligence</h3>
              <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">
                {activeMode === 'camera' ? 'Snap Receipts & Invoices' : 'Paste SMS or Text records'}
              </p>
            </div>
            <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {activeMode === 'camera' ? (
            <label className="block w-full cursor-pointer group">
              <div className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-dashed border-black/10 dark:border-white/5 rounded-2xl p-8 text-center space-y-3 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800 transition-all">
                <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-black/40 dark:text-white/40" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-black dark:text-white">Upload Receipt</p>
                  <p className="text-[9px] text-black/40 dark:text-white/40 font-medium uppercase tracking-tighter">Auto-extracts Merchant, Amount & Date</p>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptScan} />
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              <textarea 
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste your M-Pesa SMS or transaction text here..."
                className="w-full bg-gray-50 dark:bg-zinc-800/50 border-2 border-dashed border-black/10 dark:border-white/5 rounded-2xl p-6 text-sm font-medium focus:border-black/30 dark:focus:border-white/20 transition-all outline-none min-h-[120px] text-black dark:text-white"
              />
              <button 
                onClick={handleTextParse}
                disabled={isScanning || !rawText.trim()}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 dark:hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyze Text
              </button>
            </div>
          )}

          {isScanning && activeMode === 'camera' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse">
              <Brain className="w-5 h-5 text-black/40 dark:text-white/40" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60">AI Extraction in Progress...</p>
            </div>
          )}
        </div>
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {scanResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
          >
            <button 
              onClick={() => setScanResult(null)}
              className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <select 
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl outline-none appearance-none cursor-pointer"
                  >
                    {PREDEFINED_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="text-black">{cat.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl">{scanResult.transactionType}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Details / Merchant</p>
                  <input 
                    type="text"
                    value={editMerchant}
                    onChange={(e) => setEditMerchant(e.target.value)}
                    className="text-2xl font-bold italic serif tracking-tight bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 outline-none w-full transition-all"
                  />
                </div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest px-2">{format(new Date(scanResult.date), 'MMMM dd, yyyy')}</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Amount</p>
                  <p className="text-4xl font-bold italic serif">KES {scanResult.amount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Confidence</p>
                  <p className="text-sm font-bold text-green-400">{Math.round(scanResult.confidence * 100)}%</p>
                </div>
              </div>

              <button 
                onClick={saveToLedger}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
              >
                <Save className="w-4 h-4" /> Confirm & Add to Ledger
              </button>
            </div>

            {/* Background design elements */}
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
