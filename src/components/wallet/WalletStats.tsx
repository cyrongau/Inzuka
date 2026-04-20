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
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/50">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <WalletIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.2em]">Liquid Capital Pool</span>
          </div>
          <div className="space-y-1">
              <h1 className="text-6xl font-black italic serif tracking-tight">
                <span className="text-2xl not-italic font-medium mr-2 text-white/40">{currency}</span>
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h1>
              <p className="text-white/20 text-xs font-black uppercase tracking-[0.2em] pl-1">Daily Inflow Limit: {currency} 150,000</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
           <button 
             onClick={onFund}
             className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-6 rounded-[2.5rem] font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/20 transition-all flex flex-col items-center gap-3 text-center"
           >
              <SmartphoneNfc className="w-6 h-6" /> {FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Engage Fund' : 'Sync Inflow'}
           </button>
           <button 
             onClick={onSend}
             className="bg-white text-black px-8 py-6 rounded-[2.5rem] font-black text-[10px] tracking-[0.2em] uppercase hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-3 shadow-2xl shadow-white/5"
           >
              <Send className="w-6 h-6" /> Direct send
           </button>
           <button 
             onClick={onPay}
             className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-6 rounded-[2.5rem] font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/20 transition-all flex flex-col items-center gap-3 text-center"
           >
              <CreditCard className="w-6 h-6" /> {FEATURES.ENABLE_REAL_MONEY_ESCROW ? 'Express Pay' : 'Sync Outflow'}
           </button>
        </div>
      </div>
    </div>
  );
};
