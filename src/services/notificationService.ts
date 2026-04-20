import { toast as sonnerToast } from 'sonner';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  message?: string;
}

/**
 * Web Notification Service
 * Handles web-specific UI feedback using Sonner
 */
export const showToast = (type: ToastType, options: ToastOptions) => {
  const method = type === 'error' ? sonnerToast.error : sonnerToast.success;
  method(options.title, {
    description: options.message,
  });
};

/**
 * Trigger an out-of-app notification (SMS/Email)
 * This works by writing to a specific Firestore collection that a 
 * Cloud Function watches.
 */
export const triggerSystemNotification = async (payload: {
  userId: string;
  familyId?: string;
  type: 'sms' | 'email' | 'push';
  title: string;
  body: string;
  metadata?: any;
}) => {
  try {
    await addDoc(collection(db, 'system_notifications'), {
      ...payload,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to queue system notification:', error);
  }
};
