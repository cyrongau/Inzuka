import { Platform } from 'react-native';
import { toast as sonnerToast } from 'sonner';
import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  message?: string;
}

/**
 * Unified Notification Service
 * Handles platform-specific UI feedback (Toasts)
 */
export const showToast = (type: ToastType, options: ToastOptions) => {
  if (Platform.OS === 'web') {
    // Web implementation using Sonner
    const method = type === 'error' ? sonnerToast.error : sonnerToast.success;
    method(options.title, {
      description: options.message,
    });
  } else {
    // Native implementation using react-native-toast-message
    Toast.show({
      type: type,
      text1: options.title,
      text2: options.message,
      position: 'bottom',
      visibilityTime: 4000,
      autoHide: true,
      bottomOffset: 100,
    });
  }
};

/**
 * Trigger an out-of-app notification (SMS/Email)
 * This works by writing to a specific Firestore collection that a 
 * Cloud Function watches to perform the actual SMTP/SMS delivery.
 */
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
