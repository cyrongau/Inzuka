import React from 'react';
import { motion } from 'motion/react';
import { Wallet as WalletIcon, SmartphoneNfc, Send, CreditCard } from 'lucide-react';
import { FEATURES } from '../../constants/features';

interface WalletStatsProps {
  balance: number;
  currency: string;
  onFund: () => void;
  onSend: () => void;
  onPay: () => void;
}

export const WalletStats: React.FC<WalletStatsProps> = ({
  balance,
  currency,
  onFund,
  onSend,
  onPay
}) => {
  return (
    <div className="bg-black text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
      
      <div className="relative z-10 space-y-12">
        {/* Row 1: Large Balance Display */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white/50">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md">
              <WalletIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Total Wallet Balance</span>
          </div>
          <div className="flex flex-col">
              <h1 className="text-7xl md:text-8xl font-black italic serif tracking-tighter leading-none flex items-baseline gap-4">
                <span className="text-3xl not-italic font-medium text-white/30 uppercase">{currency}</span>
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h1>
              <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Daily Limit: {currency} 150,000
              </div>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
           {/* Active Actions */}
           <button 
             onClick={onFund}
             className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] font-black text-[9px] tracking-[0.2em] uppercase hover:bg-white/10 transition-all flex flex-col items-center gap-4 text-center group/btn"
           >
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                <SmartphoneNfc className="w-5 h-5" />
              </div>
              {FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Deposit Money' : 'Receive Funds'}
           </button>

           <button 
             onClick={onSend}
             className="bg-white text-black p-6 rounded-[2.5rem] font-black text-[9px] tracking-[0.2em] uppercase hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-4 shadow-2xl shadow-white/5"
           >
              <div className="w-10 h-10 bg-black/5 rounded-2xl flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              Send Cash
           </button>

           <button 
             onClick={onPay}
             className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] font-black text-[9px] tracking-[0.2em] uppercase hover:bg-white/10 transition-all flex flex-col items-center gap-4 text-center group/btn"
           >
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              {FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Withdraw / Pay' : 'Record Expense'}
           </button>

           {/* Inactive Actions (Coming Soon) */}
           <button 
             disabled
             className="opacity-30 grayscale cursor-not-allowed bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] font-black text-[9px] tracking-[0.2em] uppercase flex flex-col items-center gap-4 text-center relative overflow-hidden"
           >
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <SmartphoneNfc className="w-5 h-5" />
              </div>
              Tap to Pay
              <span className="absolute top-2 right-4 text-[7px] font-black italic bg-white/20 px-1.5 rounded-full">Soon</span>
           </button>

           <button 
             disabled
             className="opacity-30 grayscale cursor-not-allowed bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] font-black text-[9px] tracking-[0.2em] uppercase flex flex-col items-center gap-4 text-center relative overflow-hidden"
           >
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              Scan to Pay
              <span className="absolute top-2 right-4 text-[7px] font-black italic bg-white/20 px-1.5 rounded-full">Soon</span>
           </button>
        </div>
      </div>
    </div>
  );
};
