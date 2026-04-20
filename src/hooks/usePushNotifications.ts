import { useState, useEffect } from 'react';

/**
 * Web fallback for Push Notifications
 * In a real web production environment, you would use a Service Worker 
 * and Firebase Cloud Messaging for Web.
 */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    // Web notifications logic would go here
    // For now, we return empty state
  }, [userId]);

  return { expoPushToken: undefined, notification: undefined };
}
