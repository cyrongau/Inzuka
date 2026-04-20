import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Sparkles, Brain, X, Info, Tag, Save } from 'lucide-react';
import { toast } from 'sonner';
import { scanProduct, SmartProductScan } from '../services/geminiService';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AISmartScannerProps {
  familyId: string;
  userId: string;
  products: any[];
  onResult?: (result: SmartProductScan) => void;
  onPriceRecorded?: () => void;
}

/**
 * AISmartScanner - A platform-agnostic UI component for AI-powered price tag analysis.
 * Prepared for NativeWind by using standardized Tailwind utility classes.
 */
export const AISmartScanner: React.FC<AISmartScannerProps> = ({ 
  familyId, 
  userId, 
  products,
  onResult,
  onPriceRecorded 
}) => {
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<SmartProductScan | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsAiScanning(true);
      setAiScanResult(null);
      try {
        const result = await scanProduct(base64, file.type);
        setAiScanResult(result);
        if (onResult) onResult(result);
        toast.success("AI Analysis Complete!");
      } catch (err) {
        toast.error("Failed to analyze image");
      } finally {
        setIsAiScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const recordPriceWithAI = async () => {
    if (!aiScanResult) return;
    try {
      let productId = products.find(p => p.name === aiScanResult.name)?.id;
      if(!productId) {
        const pRef = await addDoc(collection(db, 'products'), {
          name: aiScanResult.name,
          brand: aiScanResult.brand,
          familyId
        });
        productId = pRef.id;
      }

      await addDoc(collection(db, 'priceRecords'), {
          productId,
          price: aiScanResult.price,
          date: new Date().toISOString(),
          userId,
          familyId,
          store: aiScanResult.store || 'AI Scanned'
      });
      
      toast.success("Recorded price history successfully!");
      setAiScanResult(null);
      if (onPriceRecorded) onPriceRecorded();
    } catch (e) {
      toast.error("Failed to save record");
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Trigger Card */}
      <div className="bg-white border-2 border-black p-10 rounded-[4rem] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between text-black">
            <div className="space-y-1">
              <h3 className="text-3xl font-bold tracking-tight italic serif">AI Smart Vision</h3>
              <p className="text-xs font-bold text-black/40 uppercase tracking-widest">Price Tags & Brands</p>
            </div>
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block w-full cursor-pointer group">
              <div className="bg-gray-50 border-2 border-dashed border-black/10 rounded-[2.5rem] p-10 text-center space-y-4 group-hover:bg-gray-100 transition-all">
                <Camera className="w-10 h-10 mx-auto text-black/20 group-hover:scale-110 transition-transform" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-black capitalize">Snap Price Tag</p>
                  <p className="text-[10px] text-black/40 font-medium">Extracts name, price & discounts</p>
                </div>
                {/* 
                  Native Note: In React Native, this <input> would be replaced by an 
                  onPress handler that calls ImagePicker.launchCameraAsync() 
                */}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>
            </label>
          </div>

          {isAiScanning && (
            <div className="flex flex-col items-center gap-3 p-4 bg-black/5 rounded-2xl animate-pulse">
              <Brain className="w-6 h-6 text-black/40" />
              <p className="text-xs font-bold uppercase tracking-widest text-black/60">Vision Engine Processing...</p>
            </div>
          )}
        </div>

        <p className="text-[10px] items-center gap-2 flex text-black/20 uppercase tracking-[0.2em] font-bold mt-8">
          <Sparkles className="w-3 h-3" /> Powered by Gemini Vision
        </p>
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {aiScanResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border-4 border-black p-8 rounded-[3rem] shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6">
              <button 
                onClick={() => setAiScanResult(null)} 
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">Detected Product</span>
                    {aiScanResult.isDiscounted && <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"><Tag className="w-3 h-3" /> Sale Agent</span>}
                  </div>
                  <h2 className="text-4xl font-bold serif italic tracking-tighter leading-none">{aiScanResult.name}</h2>
                  <p className="text-lg font-bold text-black/40 uppercase tracking-widest">{aiScanResult.brand} • {aiScanResult.store || 'Unknown Store'}</p>
                </div>

                <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-black/5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-black/40 uppercase tracking-widest">Extracted Price</p>
                    <p className="text-3xl font-bold serif italic">{aiScanResult.currency} {aiScanResult.price.toLocaleString()}</p>
                  </div>
                  {aiScanResult.discountInfo && (
                    <div className="pt-4 border-t border-black/5">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Discount Details</p>
                      <p className="text-sm font-medium italic">{aiScanResult.discountInfo}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                    <Brain className="w-4 h-4" /> AI Saving Advice
                  </h4>
                  <p className="text-lg font-medium bg-green-50 text-green-800 p-6 rounded-[2rem] border border-green-100 leading-relaxed italic">
                    "{aiScanResult.savingAdvice}"
                  </p>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={recordPriceWithAI}
                    className="flex-1 bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Save className="w-5 h-5" /> Save to Price Tracker
                  </button>
                  <button 
                    onClick={() => {
                        toast.info("Comparison feature coming soon!");
                    }}
                    className="px-8 py-4 border-2 border-black rounded-2xl font-bold hover:bg-black hover:text-white transition-all"
                  >
                    Compare Stores
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
