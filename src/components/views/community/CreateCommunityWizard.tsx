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
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-500/10'
  },
  {
    id: 'funeral_committee',
    title: 'Funeral / Event Committee',
    icon: Flag,
    desc: 'Short-term group for organizing logistics, fundraising, and sharing updates.',
    modules: ['wallet', 'chat', 'calendar', 'tasks'],
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-500/10'
  },
  {
    id: 'support_group',
    title: 'Social & Support Group',
    icon: HeartPulse,
    desc: 'For forums, medical discussions, extended families, or hobby groups.',
    modules: ['chat', 'calendar'],
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-500/10'
  },
  {
    id: 'custom_project',
    title: 'Community Project',
    icon: Globe2,
    desc: 'Neighborhood watches, local projects, or general community organizing.',
    modules: ['chat', 'tasks', 'calendar'],
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10'
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
  const [customType, setCustomType] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = TEMPLATES.find(t => t.id === templateId);

  const handleTemplateSelect = (id: string) => {
    const tpl = TEMPLATES.find(t => t.id === id);
    if (tpl) {
      setTemplateId(id);
      setSelectedModules(tpl.modules);
      setCustomType(tpl.title);
    }
  };

  const handleCreate = async () => {
    if (!name || (!templateId && !customType) || !agreedToRules) return;
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'communities'), {
        name,
        description,
        type: customType || selectedTemplate?.title || 'Custom Group',
        templateId: templateId || 'custom',
        modules: selectedModules,
        memberIds: [user.uid],
        moderatorIds: [user.uid], // The creator is implicitly a moderator
        ownerId: user.uid,
        memberRoles: { [user.uid]: 'admin' },
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
        className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-black/5 dark:border-white/5 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 md:p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div>
             <h2 className="text-2xl font-black italic serif tracking-tight text-black dark:text-white">Create Group</h2>
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full transition-colors text-black dark:text-white">
             <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Group Name</label>
                   <input 
                     type="text" 
                     placeholder="e.g. Kasarani Welfare Group" 
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 p-4 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all placeholder:font-medium placeholder:text-gray-300 dark:placeholder:text-gray-600 text-black dark:text-white"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Description / Purpose</label>
                   <textarea 
                     placeholder="What brings this group together?" 
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 p-4 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all min-h-[120px] placeholder:text-gray-300 dark:placeholder:text-gray-600 text-black dark:text-white"
                   />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold italic serif mb-4 text-black dark:text-white">Select Group Type</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This configures which modules (Finance, Projects, Forums) will be available to the group.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleTemplateSelect(tpl.id)}
                      className={cn(
                        "text-left p-6 rounded-3xl border-2 transition-all duration-300",
                        templateId === tpl.id ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-xl" : "border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-zinc-800 text-black dark:text-white"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors", templateId === tpl.id ? "bg-white/10 dark:bg-black/10" : tpl.bgColor)}>
                         <tpl.icon className={cn("w-6 h-6", templateId === tpl.id ? "text-white dark:text-black" : tpl.color)} />
                      </div>
                      <h4 className="font-bold mb-1">{tpl.title}</h4>
                      <p className={cn("text-xs leading-relaxed mb-4", templateId === tpl.id ? "text-white/70 dark:text-black/70" : "text-gray-500 dark:text-gray-400")}>{tpl.desc}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {tpl.modules.map(mod => (
                          <span key={mod} className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                            templateId === tpl.id ? "bg-white/20 dark:bg-black/20 text-white dark:text-black" : "bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 border border-transparent dark:border-white/5"
                          )}>
                            {mod}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {templateId && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    className="mt-8 pt-8 border-t border-black/5 dark:border-white/5 space-y-6"
                  >
                    <div>
                       <h3 className="text-sm font-bold italic serif text-black dark:text-white">Custom Configuration</h3>
                       <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fine-tune the categorical identity and available features.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Group Identity / Type</label>
                          <input 
                            type="text" 
                            value={customType}
                            onChange={(e) => setCustomType(e.target.value)}
                            placeholder="e.g. Non-profit Organization"
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all text-black dark:text-white"
                          />
                       </div>
                       
                       <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Active Modules</label>
                          <div className="flex flex-wrap gap-2">
                             {['wallet', 'chat', 'calendar', 'tasks'].map(mod => (
                                <button
                                  key={mod}
                                  onClick={() => setSelectedModules(prev => 
                                    prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
                                  )}
                                  className={cn(
                                    "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                    selectedModules.includes(mod) 
                                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                                      : "bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-white"
                                  )}
                                >
                                   {mod}
                                </button>
                             ))}
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center space-y-4 pt-4">
                   <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto text-orange-500 dark:text-orange-400 mb-6">
                      <ShieldCheck className="w-10 h-10" />
                   </div>
                   <h3 className="text-2xl font-black italic serif text-black dark:text-white">Terms of Governance</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                     To maintain a safe and productive environment, all groups must adhere to the platform's strict guidelines.
                   </p>
                </div>

                <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-3xl space-y-4 border border-black/5 dark:border-white/5 text-sm mb-6">
                   <div className="flex gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-gray-700 dark:text-gray-300 font-medium"><strong className="text-black dark:text-white">No Illegal Activities:</strong> The group cannot be used for illicit trade, fraud, or organizing illegal frameworks.</p>
                   </div>
                   <div className="flex gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-gray-700 dark:text-gray-300 font-medium"><strong className="text-black dark:text-white">No Violence or Hate Speech:</strong> Promoting violence, war, self-harm, or discriminatory hate speech is strictly forbidden.</p>
                   </div>
                   <div className="flex gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-gray-700 dark:text-gray-300 font-medium"><strong className="text-black dark:text-white">Zero Tolerance for Indecency:</strong> Content involving explicit sexual immorality or unauthorized substance trade will result in immediate suspension.</p>
                   </div>
                </div>

                <label className="flex items-start gap-4 p-4 border border-black/10 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={agreedToRules} 
                    onChange={e => setAgreedToRules(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded text-black dark:text-white focus:ring-black dark:focus:ring-white bg-white dark:bg-zinc-900 border-gray-300 dark:border-gray-600"
                  />
                  <div>
                     <p className="font-bold text-sm text-black dark:text-white">I agree to the Community Guidelines, Terms of Service, and Privacy Policy.</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">I understand that System Administrators actively monitor compliance and can suspend or delete this group if rules are violated.</p>
                  </div>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 md:p-8 border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-zinc-900 flex items-center justify-between shrink-0">
           {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2 text-xs uppercase tracking-widest">
               <ChevronLeft className="w-4 h-4" /> Back
             </button>
           ) : <div />}

           {step < 3 ? (
             <button 
               onClick={() => setStep(step + 1)} 
               disabled={step === 1 && name.trim() === '' || step === 2 && !templateId}
               className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-xl shadow-black/10 dark:shadow-white/10"
             >
               Next Step <ArrowRight className="w-4 h-4" />
             </button>
           ) : (
             <button 
               onClick={handleCreate} 
               disabled={!agreedToRules || isSubmitting}
               className="px-8 py-4 bg-green-500 dark:bg-green-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-green-600 dark:hover:bg-green-700 active:scale-95 transition-all disabled:opacity-30 shadow-xl shadow-green-500/20"
             >
               {isSubmitting ? 'Creating...' : 'Create Group'}
             </button>
           )}
        </div>
      </motion.div>
    </div>
  );
}
