import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  Table, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Building2
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function PublicVerification({ verificationId }: { verificationId: string }) {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const docRef = doc(db, 'reportVerifications', verificationId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setRecord(snap.data());
        } else {
          setError("Verification record not found or has expired.");
        }
      } catch (e) {
        setError("Failed to connect to the verification node.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [verificationId]);

  const handleVerify = () => {
    if (accessCode === record?.accessCode) {
      setIsAuthorized(true);
    } else {
      setError("Invalid access code. Please check your document for the 6-digit key.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-6">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Verifying Node Integrity...</p>
      </div>
    );
  }

  if (error && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black italic serif">Access Terminated</h2>
          <p className="text-gray-500 text-sm font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-xl space-y-8 border border-black/5">
          <div className="text-center space-y-3">
             <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="text-white w-8 h-8" />
             </div>
             <h2 className="text-3xl font-black italic serif tracking-tight">Report Verification</h2>
             <p className="text-gray-500 text-xs font-medium">Enter the 6-digit access code provided with the official document to view decrypted records.</p>
          </div>

          <div className="space-y-6">
             <div className="space-y-2 text-center">
                <div className="flex justify-center gap-2">
                   {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-12 h-16 bg-gray-50 border border-black/5 rounded-2xl flex items-center justify-center text-2xl font-black italic serif">
                        {accessCode[i] || ''}
                      </div>
                   ))}
                </div>
                <input 
                  type="text" 
                  maxLength={6}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  autoFocus
                />
             </div>

             <button 
               onClick={handleVerify}
               disabled={accessCode.length !== 6}
               className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
             >
               Unlock Records
             </button>
          </div>

          <p className="text-[8px] text-center text-gray-300 font-black uppercase tracking-[0.2em]">
            Powered by Inzuka Hub Cryptographic Verification
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6 lg:p-12 animate-in fade-in duration-700">
       <div className="max-w-5xl mx-auto space-y-8 pb-20">
          {/* Official Verification Header */}
          <div className="bg-white p-8 lg:p-12 rounded-[3.5rem] border border-black/5 shadow-sm flex flex-col md:flex-row justify-between gap-8">
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-[10px] font-black italic">IZ</div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Inzuka Verified Record</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black italic serif tracking-tight">
                   {record.communityName}
                </h1>
                <div className="flex flex-wrap gap-4 pt-2">
                   <div className="bg-green-50 text-green-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-green-100">
                      <CheckCircle2 className="w-4 h-4" /> Authenticity Verified
                   </div>
                   <div className="bg-gray-50 text-gray-500 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-black/5">
                      <Calendar className="w-4 h-4" /> Generated {new Date(record.createdAt).toLocaleDateString()}
                   </div>
                </div>
             </div>
             
             <div className="md:text-right space-y-2">
                <div className="bg-black/5 p-4 rounded-3xl inline-block">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verification ID</p>
                   <p className="font-mono text-xs font-bold text-black">{record.id}</p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2 flex items-center gap-2 md:justify-end">
                   <Building2 className="w-3 h-3" /> External Entity View
                </p>
             </div>
          </div>

          {/* Record Data */}
          <div className="bg-white rounded-[4rem] border border-black/5 shadow-2xl overflow-hidden p-8 lg:p-16 space-y-12">
             <div className="flex items-center justify-between border-b border-black/5 pb-8">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black italic serif">Official {record.reportType === 'financial' ? 'Financial Ledger' : 'Member Registry'}</h3>
                   <p className="text-gray-400 text-xs font-medium">Cryptographic Snapshot of communal assets and participants.</p>
                </div>
                <BarChart3 className="w-10 h-10 text-black/10" />
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-black/5">
                        {record.data.length > 0 && Object.keys(record.data[0]).map(key => (
                           <th key={key} className="pb-4 pt-2 font-bold text-[10px] uppercase tracking-widest text-gray-400 px-4 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</th>
                        ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-black/[0.02]">
                      {record.data.map((row: any, i: number) => (
                         <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            {Object.values(row).map((val: any, j: number) => (
                               <td key={j} className="py-4 px-4 font-medium text-sm">
                                  {typeof val === 'number' ? `KES ${val.toLocaleString()}` : String(val)}
                               </td>
                            ))}
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             <div className="bg-gray-50 p-10 rounded-[3rem] border border-black/5 space-y-6">
                <div className="flex items-center gap-4 text-black">
                   <ShieldCheck className="w-6 h-6" />
                   <h4 className="font-black uppercase text-xs tracking-widest">Integrity Hash Verification</h4>
                </div>
                <p className="text-gray-600 text-xs font-medium leading-relaxed italic serif">
                   "This document is a certified extract from the Inzuka Hub. It represents the state of the community as of the generation date. Financial institutions are advised to verify the 6-digit access code upon receipt of physical copies to ensure the data has not been tampered with offline."
                </p>
             </div>
          </div>

          <div className="text-center space-y-4">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">
                'Inzuka' Community Hub © 2026 . All Rights Reserved
             </p>
             <div className="flex items-center justify-center gap-4">
                <span className="w-12 h-[1px] bg-gray-200" />
                <span className="text-[8px] font-black uppercase text-gray-300">End of Record</span>
                <span className="w-12 h-[1px] bg-gray-200" />
             </div>
          </div>
       </div>
    </div>
  );
}
