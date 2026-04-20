import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Sparkles, Brain, X, Receipt, Tag, Save, Loader2, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { scanReceipt, parseTransactionText, ExtractedReceiptData } from '../../services/geminiService';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

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
        category: scanResult.category,
        description: `${scanResult.merchant} (${scanResult.transactionType})`,
        date: new Date(scanResult.date).toISOString() || new Date().toISOString(),
        isPaid: true,
        source: 'AI Extraction'
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
      <div className="flex bg-black/5 p-1 rounded-2xl w-fit mx-auto">
        <button 
          onClick={() => setActiveMode('camera')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeMode === 'camera' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}
        >
          <Camera className="w-4 h-4" /> Receipt
        </button>
        <button 
          onClick={() => setActiveMode('text')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeMode === 'text' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}
        >
          <MessageSquareText className="w-4 h-4" /> Text/SMS
        </button>
      </div>

      <div className="bg-white border-2 border-black p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-black">
              <h3 className="text-2xl font-bold tracking-tight italic serif">Finance Intelligence</h3>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                {activeMode === 'camera' ? 'Snap Receipts & Invoices' : 'Paste SMS or Text records'}
              </p>
            </div>
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {activeMode === 'camera' ? (
            <label className="block w-full cursor-pointer group">
              <div className="bg-gray-50 border-2 border-dashed border-black/10 rounded-2xl p-8 text-center space-y-3 group-hover:bg-gray-100 transition-all">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-black/5 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-black/40" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-black">Upload Receipt</p>
                  <p className="text-[9px] text-black/40 font-medium uppercase tracking-tighter">Auto-extracts Merchant, Amount & Date</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleReceiptScan} />
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              <textarea 
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste your M-Pesa SMS or transaction text here..."
                className="w-full bg-gray-50 border-2 border-dashed border-black/10 rounded-2xl p-6 text-sm font-medium focus:border-black/30 transition-all outline-none min-h-[120px]"
              />
              <button 
                onClick={handleTextParse}
                disabled={isScanning || !rawText.trim()}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 transition-all disabled:opacity-50"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyze Text
              </button>
            </div>
          )}

          {isScanning && activeMode === 'camera' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-black/5 rounded-2xl animate-pulse">
              <Brain className="w-5 h-5 text-black/40" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">AI Extraction in Progress...</p>
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
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/20 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">{scanResult.category.replace('_', ' ')}</span>
                  <span className="bg-blue-500/20 text-blue-300 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">{scanResult.transactionType}</span>
                </div>
                <h4 className="text-3xl font-bold italic serif tracking-tight">{scanResult.merchant}</h4>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{format(new Date(scanResult.date), 'MMMM dd, yyyy')}</p>
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
