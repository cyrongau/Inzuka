import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  MoreVertical, 
  Mail, 
  Copy,
  User as UserIcon,
  LayoutGrid,
  List as ListIcon,
  MessageCircle
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function MemberRegistry({ community, user }: { community: any, user: any }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const currentUserIsAdmin = community.ownerId === user?.uid || community.memberRoles?.[user?.uid] === 'admin';

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!community.memberIds) return;
      const profiles: Record<string, any> = {};
      for (const mid of community.memberIds) {
        if (!userProfiles[mid]) { // only fetch if not already fetched
           try {
              const d = await getDoc(doc(db, 'users', mid));
              if (d.exists()) {
                profiles[mid] = d.data();
              }
           } catch(e) { console.error('fetch profile error', e); }
        }
      }
      if (Object.keys(profiles).length > 0) {
        setUserProfiles(prev => ({ ...prev, ...profiles }));
      }
    };
    fetchProfiles();
  }, [community.memberIds]);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Member ID copied to clipboard.");
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
       const roles = { ...community.memberRoles, [memberId]: newRole };
       await updateDoc(doc(db, 'communities', community.id), { memberRoles: roles });
       toast.success("Role updated");
       setOpenMenuId(null);
    } catch (e) {
       toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === user?.uid) {
      toast.error("You cannot remove yourself.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
       const newMembers = community.memberIds.filter((id: string) => id !== memberId);
       const roles = { ...community.memberRoles };
       delete roles[memberId];
       await updateDoc(doc(db, 'communities', community.id), { 
         memberIds: newMembers,
         memberRoles: roles 
       });
       toast.success("Member removed");
       setOpenMenuId(null);
    } catch (e) {
       toast.error("Failed to remove member");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in transition-all">
      <div className="flex items-center justify-between">
         <div>
             <h2 className="text-xl font-bold italic serif flex items-center gap-2 text-black dark:text-white">
               <Users className="w-6 h-6 text-blue-500" /> Member List
            </h2>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mt-1">Official member list for {community.name}.</p>
         </div>
         <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl">
           <button 
             onClick={() => setViewMode('list')}
             className={cn("p-2 rounded-lg transition-colors", viewMode === 'list' ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400")}
           >
             <ListIcon className="w-4 h-4" />
           </button>
           <button 
             onClick={() => setViewMode('grid')}
             className={cn("p-2 rounded-lg transition-colors", viewMode === 'grid' ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400")}
           >
             <LayoutGrid className="w-4 h-4" />
           </button>
         </div>
      </div>

      <div className={cn(
         viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
            : "flex flex-col gap-3"
      )}>
         {community.memberIds?.map((mid: string) => {
           const role = community.memberRoles?.[mid] || (community.ownerId === mid ? 'admin' : 'member');
           const isAdmin = community.ownerId === mid || role === 'admin';
           const isModerator = community.moderatorIds?.includes(mid) || ['chairman', 'treasurer', 'secretary'].includes(role);
           const profile = userProfiles[mid];
           const displayName = profile?.displayName || `Member ${mid.slice(-4)}`;
           
           const renderMenu = () => {
             if (!currentUserIsAdmin) return null;
             return (
               <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-black/5 dark:border-white/5 py-2 z-50">
                  <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-black/5 dark:border-white/5 mb-1">Actions</div>
                  <button onClick={() => handleRoleChange(mid, 'member')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Set as Member</button>
                  <button onClick={() => handleRoleChange(mid, 'moderator')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Set as Moderator</button>
                  <button onClick={() => handleRoleChange(mid, 'treasurer')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Set as Treasurer</button>
                  <button onClick={() => handleRoleChange(mid, 'secretary')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Set as Secretary</button>
                  <button onClick={() => handleRoleChange(mid, 'chairman')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Set as Chairman</button>
                  {mid !== user?.uid && (
                    <>
                      <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
                      <button onClick={() => handleRemoveMember(mid)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-bold">Remove Member</button>
                    </>
                  )}
               </div>
             );
           };

           if (viewMode === 'list') {
              return (
                 <div key={mid} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm hover:border-blue-200 dark:hover:border-blue-500/50 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-black/5 dark:border-white/5 shrink-0 relative overflow-hidden">
                          {profile?.photoURL ? (
                             <img src={profile.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                             <UserIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                          )}
                          {(isAdmin || isModerator) && (
                            <div className={cn(
                              "absolute -top-1 -right-1 w-5 h-5 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center shadow-lg",
                              isAdmin ? "bg-red-500" : "bg-blue-500"
                            )}>
                               <ShieldCheck className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                       </div>
                       <div>
                          <h4 className="font-bold text-gray-900 dark:text-gray-100">{displayName}</h4>
                          <p className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isAdmin ? "text-red-500" : isModerator ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                          )}>
                             {role}
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="hidden md:flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                          <code className="text-[9px] font-mono text-gray-500 dark:text-gray-400">{mid}</code>
                          <button onClick={() => copyId(mid)} className="text-gray-300 hover:text-blue-500 transition-colors">
                             <Copy className="w-3 h-3" />
                          </button>
                       </div>
                       <button 
                         onClick={() => toast.info('Direct Messaging module coming soon')}
                         className="w-10 h-10 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-center transition-colors text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-zinc-800"
                       >
                          <MessageCircle className="w-4 h-4" />
                       </button>
                       <div className="relative">
                          <button 
                            onClick={() => setOpenMenuId(openMenuId === mid ? null : mid)}
                            className="w-10 h-10 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors"
                          >
                             <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === mid && renderMenu()}
                       </div>
                    </div>
                 </div>
              );
           }
           
           return (
             <div key={mid} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm hover:border-blue-200 dark:hover:border-blue-500/50 transition-all group">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-black/5 dark:border-white/5 shrink-0 relative overflow-hidden">
                      {profile?.photoURL ? (
                         <img src={profile.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                         <UserIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      )}
                      {(isAdmin || isModerator) && (
                        <div className={cn(
                          "absolute -top-1 -right-1 w-6 h-6 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center shadow-lg",
                          isAdmin ? "bg-red-500" : "bg-blue-500"
                        )}>
                           <ShieldCheck className="w-3 h-3 text-white" />
                        </div>
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{displayName}</h4>
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isAdmin ? "text-red-500" : isModerator ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                      )}>
                         {role}
                      </p>
                   </div>
                   <div className="relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === mid ? null : mid)}
                        className="text-gray-300 dark:text-gray-600 hover:text-black dark:hover:text-white tracking-widest"
                      >
                         <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === mid && renderMenu()}
                   </div>
                </div>

                <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                      <code className="text-[9px] font-mono text-gray-500 dark:text-gray-400">{mid.slice(0, 8)}...</code>
                      <button 
                        onClick={() => copyId(mid)}
                        className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                         <Copy className="w-3 h-3" />
                      </button>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => toast.info('Direct Messaging module coming soon')}
                        className="w-8 h-8 rounded-lg border border-black/5 dark:border-white/5 flex items-center justify-center transition-colors text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"
                      >
                         <MessageCircle className="w-3 h-3" />
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
