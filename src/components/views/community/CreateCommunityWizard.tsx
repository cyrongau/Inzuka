import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Wallet, 
  MessageCircle, 
  Calendar, 
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  X,
  Globe2,
  HeartPulse,
  Banknote,
  Flag
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../../lib/utils';
import { User } from 'firebase/auth';

const TEMPLATES = [
  {
    id: 'table_banking',
    title: 'Table Banking / Chama',
    icon: Banknote,
    desc: 'For financial groups pooling funds, tracking loans, and managing contributions.',
    modules: ['wallet', 'chat', 'calendar'],
    color: 'bg-green-500',
    bgColor: 'bg-green-50'
  },
  {
    id: 'funeral_committee',
    title: 'Funeral / Event Committee',
    icon: Flag,
    desc: 'Short-term group for organizing logistics, fundraising, and sharing updates.',
    modules: ['wallet', 'chat', 'calendar', 'tasks'],
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'support_group',
    title: 'Social & Support Group',
    icon: HeartPulse,
    desc: 'For forums, medical discussions, extended families, or hobby groups.',
    modules: ['chat', 'calendar'],
    color: 'bg-pink-500',
    bgColor: 'bg-pink-50'
  },
  {
    id: 'custom_project',
    title: 'Community Project',
    icon: Globe2,
    desc: 'Neighborhood watches, local projects, or general community organizing.',
    modules: ['chat', 'tasks', 'calendar'],
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50'
  }
];

export default function CreateCommunityWizard({ 
  user, 
  onClose 
}: { 
  user: User, 
  onClose: () => void 
}) {
  const [step, setStep] = useState(1);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = TEMPLATES.find(t => t.id === templateId);

  const handleCreate = async () => {
    if (!name || !templateId || !agreedToRules) return;
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'communities'), {
        name,
        description,
        type: selectedTemplate?.title,
        templateId,
        modules: selectedTemplate?.modules || [],
        memberIds: [user.uid],
        moderatorIds: [user.uid], // The creator is implicitly a moderator
        ownerId: user.uid,
        status: 'active', // active, warned, suspended
        createdAt: serverTimestamp(),
        strikeCount: 0
      });
      onClose();
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/40">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-black/5 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 md:p-8 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
             <h2 className="text-2xl font-black italic serif tracking-tight">Initiate Network</h2>
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-black">
             <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Network Name</label>
                   <input 
                     type="text" 
                     placeholder="e.g. Kasarani Welfare Group" 
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full bg-gray-50 border border-black/5 p-4 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-black/10 transition-all placeholder:font-medium placeholder:text-gray-300"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Description / Purpose</label>
                   <textarea 
                     placeholder="What brings this community together?" 
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     className="w-full bg-gray-50 border border-black/5 p-4 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-black/10 transition-all min-h-[120px] placeholder:text-gray-300"
                   />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold italic serif mb-4">Select Architecture</h3>
                  <p className="text-sm text-gray-500 mb-6">This configures which modules (Wallet, Tasks, Forums) will be available to the group.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setTemplateId(tpl.id)}
                      className={cn(
                        "text-left p-6 rounded-3xl border-2 transition-all duration-300",
                        templateId === tpl.id ? "border-black bg-black text-white shadow-xl" : "border-gray-100 hover:border-gray-300 bg-white"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors", templateId === tpl.id ? "bg-white/10" : tpl.bgColor)}>
                         <tpl.icon className={cn("w-6 h-6", templateId === tpl.id ? "text-white" : tpl.color.replace('bg-', 'text-'))} />
                      </div>
                      <h4 className="font-bold mb-1">{tpl.title}</h4>
                      <p className={cn("text-xs leading-relaxed mb-4", templateId === tpl.id ? "text-white/70" : "text-gray-500")}>{tpl.desc}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {tpl.modules.map(mod => (
                          <span key={mod} className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                            templateId === tpl.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                          )}>
                            {mod}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center space-y-4 pt-4">
                   <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-6">
                      <ShieldCheck className="w-10 h-10" />
                   </div>
                   <h3 className="text-2xl font-black italic serif">Terms of Governance</h3>
                   <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                     To maintain a safe and productive environment, all communities must adhere to the platform's strict guidelines.
                   </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border border-black/5 text-sm mb-6">
                   <div className="flex gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-gray-700 font-medium"><strong>No Illegal Activities:</strong> The network cannot be used for illicit trade, fraud, or organizing illegal frameworks.</p>
                   </div>
                   <div className="flex gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-gray-700 font-medium"><strong>No Violence or Hate Speech:</strong> Promoting violence, war, self-harm, or discriminatory hate speech is strictly forbidden.</p>
                   </div>
                   <div className="flex gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-gray-700 font-medium"><strong>Zero Tolerance for Indecency:</strong> Content involving explicit sexual immorality or unauthorized substance trade will result in immediate suspension.</p>
                   </div>
                </div>

                <label className="flex items-start gap-4 p-4 border border-black/10 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={agreedToRules} 
                    onChange={e => setAgreedToRules(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded text-black focus:ring-black"
                  />
                  <div>
                     <p className="font-bold text-sm">I agree to the Community Guidelines, Terms of Service, and Privacy Policy.</p>
                     <p className="text-xs text-gray-500 mt-1">I understand that System Administrators actively monitor compliance and can suspend or delete this community if rules are violated.</p>
                  </div>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 md:p-8 border-t border-black/5 bg-gray-50 flex items-center justify-between shrink-0">
           {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="px-6 py-4 font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-2 text-xs uppercase tracking-widest">
               <ChevronLeft className="w-4 h-4" /> Back
             </button>
           ) : <div />}

           {step < 3 ? (
             <button 
               onClick={() => setStep(step + 1)} 
               disabled={step === 1 && name.trim() === '' || step === 2 && !templateId}
               className="px-8 py-4 bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-xl shadow-black/10"
             >
               Next Step <ArrowRight className="w-4 h-4" />
             </button>
           ) : (
             <button 
               onClick={handleCreate} 
               disabled={!agreedToRules || isSubmitting}
               className="px-8 py-4 bg-green-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-green-600 active:scale-95 transition-all disabled:opacity-30 shadow-xl shadow-green-500/20"
             >
               {isSubmitting ? 'Initializing...' : 'Initialize Network'}
             </button>
           )}
        </div>
      </motion.div>
    </div>
  );
}
