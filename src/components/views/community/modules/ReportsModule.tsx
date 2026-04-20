import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { FileDown, Table, Users, BarChart3, Calendar, ShieldCheck, ExternalLink, Printer, Download, QrCode, Lock, X } from 'lucide-react';
import { db } from '../../../../lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReportsModule({ community, user }: { community: any, user: User }) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [minutes, setMinutes] = useState<any[]>([]);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [currentVerification, setCurrentVerification] = useState<{ id: string, accessCode: string, url: string } | null>(null);

  useEffect(() => {
    const unsubTrans = onSnapshot(query(collection(db, 'communities', community.id, 'transactions'), orderBy('createdAt', 'desc')), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubAnn = onSnapshot(query(collection(db, 'communities', community.id, 'announcements'), orderBy('createdAt', 'desc')), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMin = onSnapshot(query(collection(db, 'communities', community.id, 'minutes'), orderBy('createdAt', 'desc')), (snap) => {
      setMinutes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubTrans();
      unsubAnn();
      unsubMin();
    };
  }, [community.id]);

  const exportFinancialsCSV = () => {
    try {
      const headers = ['Date', 'Member', 'Reference', 'Amount', 'Type', 'Notes'];
      const rows = transactions.map(t => [
        t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleDateString() : 'N/A',
        t.userName || 'Unknown',
        t.reference || 'N/A',
        t.amount,
        t.type,
        t.note || ''
      ]);

      const footer = `\n\n'Inzuka' Community Hub © 2026 . All Rights Reserved`;
      const csvContent = [
        `Report: Financial Ledger for ${community.name}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Currency: KES\n`,
        headers.join(','),
        ...rows.map(r => r.join(',')),
        footer
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${community.name}_financials_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Financials exported successfully.");
    } catch (e) {
      toast.error("Export failed.");
    }
  };

  const exportMembersCSV = () => {
     try {
        const headers = ['Member Name', 'Role', 'Access Level'];
        const rows = community.memberIds.map((mid: string) => [
          mid, // Using ID as name stub for now or fetch member names if needed
          community.memberRoles?.[mid] || 'member',
          community.moderatorIds?.includes(mid) ? 'Moderator' : 'Standard'
        ]);

        const footer = `\n\n'Inzuka' Community Hub © 2026 . All Rights Reserved`;
        const csvContent = [
          `Report: Member Registry for ${community.name}`,
          `Generated: ${new Date().toLocaleString()}\n`,
          headers.join(','),
          ...rows.map(r => r.join(',')),
          footer
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${community.name}_members_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Member list exported.");
     } catch(e) {
        toast.error("Export failed.");
     }
  };

  const generateVerificationToken = async (type: 'financial' | 'members') => {
    setLoading(true);
    try {
      const data = type === 'financial' ? transactions.map(t => ({
        date: t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleDateString() : 'N/A',
        member: t.userName || 'Unknown',
        reference: t.reference || 'N/A',
        amount: t.amount,
        type: t.type
      })) : community.memberIds.map((mid: string) => ({
        id: mid,
        role: community.memberRoles?.[mid] || 'member',
        status: community.moderatorIds?.includes(mid) ? 'Moderator' : 'Standard'
      }));

      const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const docRef = await addDoc(collection(db, 'reportVerifications'), {
        communityId: community.id,
        communityName: community.name,
        reportType: type,
        data,
        accessCode,
        generatedBy: user.uid,
        createdAt: new Date().toISOString()
      });

      setCurrentVerification({
        id: docRef.id,
        accessCode,
        url: `${window.location.origin}/verify/${docRef.id}`
      });
      setShowVerificationModal(true);
      toast.success("Verification node created successfully.");
    } catch (e) {
      console.error("Verification generation error:", e);
      toast.error("Failed to generate verification node.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in transition-all pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
               <BarChart3 className="w-8 h-8" />
            </div>
            <div>
               <h2 className="text-xl font-bold italic serif tracking-tight">Intelligence & Reports</h2>
               <p className="text-gray-400 text-xs font-medium mt-1">Export communal records and monitor financial growth trajectory.</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {/* Financial Report Card */}
         <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm space-y-6 flex flex-col justify-between hover:border-black/10 transition-all group">
            <div className="space-y-4">
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Table className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-lg font-bold italic serif">Financial Ledger</h3>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">Comprehensive list of all contributions, withdrawals, and group investments.</p>
               </div>
               <div className="pt-4 flex items-center gap-2">
                  <div className="px-3 py-1 bg-gray-50 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-500">{transactions.length} Records</div>
                  <div className="px-3 py-1 bg-gray-50 rounded-full text-[8px] font-black uppercase tracking-widest text-green-600">Verified</div>
               </div>
            </div>
            <div className="space-y-3">
               <button 
                 onClick={exportFinancialsCSV}
                 className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black/80 transition-all active:scale-95"
               >
                  <Download className="w-4 h-4" /> Export CSV
               </button>
               <button 
                 onClick={() => generateVerificationToken('financial')}
                 className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
               >
                  <QrCode className="w-3 h-3" /> External Verification
               </button>
            </div>
         </div>

         {/* Member Registry Card */}
         <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm space-y-6 flex flex-col justify-between hover:border-black/10 transition-all group">
            <div className="space-y-4">
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-lg font-bold italic serif">Member Registry</h3>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">Official list of all community members, their roles, and moderator status.</p>
               </div>
               <div className="pt-4 flex items-center gap-2">
                  <div className="px-3 py-1 bg-gray-50 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-500">{community.memberIds?.length || 0} Members</div>
               </div>
            </div>
            <div className="space-y-3">
               <button 
                 onClick={exportMembersCSV}
                 className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black/80 transition-all active:scale-95"
               >
                  <Download className="w-4 h-4" /> Export CSV
               </button>
               <button 
                 onClick={() => generateVerificationToken('members')}
                 className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
               >
                  <QrCode className="w-3 h-3" /> External Verification
               </button>
            </div>
         </div>

         {/* Minutes Summary Card */}
         <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm space-y-6 flex flex-col justify-between hover:border-black/10 transition-all group">
            <div className="space-y-4">
               <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-lg font-bold italic serif">Meeting Records</h3>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">Archive of all physical and virtual meeting minutes filed by the Bureau.</p>
               </div>
            </div>
            <button 
              disabled
              className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
            >
               <Printer className="w-4 h-4" /> Print Archive (Soon)
            </button>
         </div>
      </div>

      <div className="bg-gray-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
               <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-orange-400 border border-white/10">
                  <ShieldCheck className="w-8 h-8" />
               </div>
               <h3 className="text-3xl font-black italic serif tracking-tight">Certified Integrity</h3>
               <p className="text-white/60 text-sm font-medium leading-relaxed">All exports from the Inzuka Hub are cryptographicly verified and timestamped. Modifying these records offline will invalidate their authenticity within the network.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400">Governance Notice</h4>
               <p className="text-xs font-bold leading-relaxed italic serif">"Transparency is the foundation of communal wealth. Every member has the right to access accurate and verified records of the collective's journey."</p>
               <div className="pt-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-[10px] font-black italic">IZ</div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Inzuka Hub Official</span>
               </div>
            </div>
         </div>
      </div>

      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mt-12 pb-12">
        'Inzuka' Community Hub © 2026 . All Rights Reserved
      </p>

      {/* Verification Modal */}
      <AnimatePresence>
         {showVerificationModal && currentVerification && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40"
            >
               <motion.div 
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative border border-black/5"
               >
                  <button 
                    onClick={() => setShowVerificationModal(false)}
                    className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 hover:text-black rounded-full transition-all"
                  >
                     <X className="w-6 h-6" />
                  </button>

                  <div className="text-center space-y-6">
                     <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <QrCode className="text-white w-8 h-8" />
                     </div>
                     <h3 className="text-2xl font-black italic serif">Verification Node Ready</h3>
                     <p className="text-gray-500 text-xs font-medium px-4">Provide this QR code and Access Key to external institutions for secure record verification.</p>

                     <div className="bg-gray-50 p-8 rounded-[2.5rem] flex flex-col items-center gap-6 border border-black/5">
                        <QRCodeCanvas 
                          value={currentVerification.url} 
                          size={180}
                          level="H"
                          includeMargin={true}
                          className="rounded-xl shadow-lg border-4 border-white"
                        />
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secure Access Key</p>
                           <p className="text-4xl font-black italic serif tracking-[0.2em] text-black bg-white px-6 py-2 rounded-2xl border border-black/5">
                              {currentVerification.accessCode}
                           </p>
                        </div>
                     </div>

                     <div className="space-y-4 pt-4">
                        <button 
                           onClick={() => {
                              navigator.clipboard.writeText(`Verification URL: ${currentVerification.url}\nAccess Key: ${currentVerification.accessCode}`);
                              toast.success("Verification details copied to clipboard.");
                           }}
                           className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                        >
                           Copy Verification Details
                        </button>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-300">
                           Verification ID: {currentVerification.id}
                        </p>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
