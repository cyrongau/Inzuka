import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  MoreVertical, 
  Mail, 
  Copy,
  User as UserIcon
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';

export default function MemberRegistry({ community }: { community: any }) {
  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Member ID copied to clipboard.");
  };

  return (
    <div className="space-y-8 animate-in fade-in transition-all">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-xl font-bold italic serif flex items-center gap-2">
               <Users className="w-6 h-6 text-blue-500" /> Member Registry
            </h2>
            <p className="text-gray-400 text-xs font-medium mt-1">Official population list for {community.name}.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {community.memberIds?.map((mid: string) => {
           const role = community.memberRoles?.[mid] || (community.creatorId === mid ? 'admin' : 'member');
           const isAdmin = community.creatorId === mid || role === 'admin';
           const isModerator = community.moderatorIds?.includes(mid) || ['chairman', 'treasurer', 'secretary'].includes(role);
           
           return (
             <div key={mid} className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm hover:border-blue-200 transition-all group">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-black/5 shrink-0 relative">
                      <UserIcon className="w-6 h-6 text-gray-300" />
                      {(isAdmin || isModerator) && (
                        <div className={cn(
                          "absolute -top-1 -right-1 w-6 h-6 border-2 border-white rounded-full flex items-center justify-center shadow-lg",
                          isAdmin ? "bg-red-500" : "bg-blue-500"
                        )}>
                           <ShieldCheck className="w-3 h-3 text-white" />
                        </div>
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">Member {mid.slice(-4)}</h4>
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isAdmin ? "text-red-500" : isModerator ? "text-blue-500" : "text-gray-400"
                      )}>
                         {role}
                      </p>
                   </div>
                   <button className="text-gray-300 hover:text-black">
                      <MoreVertical className="w-4 h-4" />
                   </button>
                </div>

                <div className="mt-6 pt-6 border-t border-black/5 flex items-center justify-between">
                   <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-black/5">
                      <code className="text-[9px] font-mono text-gray-500">{mid}</code>
                      <button 
                        onClick={() => copyId(mid)}
                        className="text-gray-300 hover:text-blue-500 transition-colors"
                      >
                         <Copy className="w-3 h-3" />
                      </button>
                   </div>
                   <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-lg border border-black/5 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
                         <Mail className="w-3 h-3" />
                      </button>
                   </div>
                </div>
             </div>
           );
         })}
      </div>
    </div>
  );
}
