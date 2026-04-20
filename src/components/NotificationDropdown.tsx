import React from 'react';
import { 
  Bell, 
  X, 
  Circle, 
  CheckCircle2, 
  Info, 
  AlertTriangle,
  MessageSquare,
  Wallet,
  Calendar
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown({ 
  notifications, 
  onClose 
}: { 
  notifications: any[], 
  onClose: () => void 
}) {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (e) {
      console.error(e);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'finance': return <Wallet className="w-4 h-4 text-green-500" />;
      case 'event': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute top-14 right-0 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-black/5 z-50 overflow-hidden"
    >
      <div className="p-6 border-b border-black/5 flex items-center justify-between">
        <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400">Intelligence Feed</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {notifications.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Bell className="w-10 h-10 text-gray-100 mx-auto" />
              <p className="text-xs text-gray-400 font-medium italic">Your feed is clear for now.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <motion.div 
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "p-5 border-b border-black/[0.02] hover:bg-gray-50 transition-colors group relative",
                  !n.isRead && "bg-blue-50/30"
                )}
              >
                <div className="flex gap-4">
                  <div className="shrink-0 mt-1">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 truncate max-w-[100px]">
                        {n.communityName || 'System'}
                      </span>
                      <span className="text-[9px] text-gray-400 font-medium italic">
                        {n.createdAt && formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:underline cursor-pointer" onClick={() => markAsRead(n.id)}>
                      {n.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>

                <div className="absolute top-5 right-5 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeNotification(n.id)}
                    className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {!n.isRead && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 hover:bg-green-50 text-green-400 rounded-lg"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!n.isRead && (
                  <Circle className="absolute top-5 right-2 w-2 h-2 fill-blue-500 text-blue-500" />
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {notifications.length > 0 && (
        <div className="p-4 bg-gray-50 flex justify-center">
          <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
            View All Archives
          </button>
        </div>
      )}
    </motion.div>
  );
}
