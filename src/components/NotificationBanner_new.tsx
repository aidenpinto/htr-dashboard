import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active?: boolean;
  is_replay?: boolean;
}

interface NotificationBannerProps {
  notifications: Notification[];
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications }) => {
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [replayNotifications, setReplayNotifications] = useState<Notification[]>([]);
  const previousNotificationsRef = useRef<Notification[]>([]);

  // Sound functions
  const playNotificationSound = useCallback(() => {
    console.log('Playing notification sound...');
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant notification sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        console.log('Notification sound played successfully');
      } catch (error) {
        console.log('Audio playback failed:', error);
      }
    } else {
      console.log('AudioContext not available');
    }
  }, []);

  const playReplaySound = useCallback(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create an attention-grabbing sound for replay notifications
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.log('Audio playback failed:', error);
      }
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  }, []);

  const dismissReplayNotification = useCallback((id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
    setReplayNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Listen for broadcast replay events
  useEffect(() => {
    const channel = supabase.channel('notification-replay');
    
    channel
      .on('broadcast', { event: 'replay-notification' }, (payload) => {
        console.log('Received replay broadcast:', payload);
        const replayNotification = payload.payload.notification;
        
        // Play sound and show popup
        playReplaySound();
        
        // Add to replay notifications state
        setReplayNotifications(prev => {
          // Check if this notification is already in the list to avoid duplicates
          const exists = prev.find(n => n.id === replayNotification.id);
          if (exists) return prev;
          
          return [...prev, replayNotification];
        });
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          dismissReplayNotification(replayNotification.id);
        }, 10000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playReplaySound, dismissReplayNotification]);

  // Filter out replay notifications from regular notifications
  const regularNotifications = notifications.filter(notification => {
    return !notification.is_replay;
  });

  // Handle new regular notifications (play sound when new notifications arrive)
  useEffect(() => {
    console.log('NotificationBanner: regularNotifications changed', {
      count: regularNotifications.length,
      notifications: regularNotifications.map(n => ({ id: n.id, title: n.title }))
    });
    
    // Check for new notifications by comparing IDs
    const newNotifications = regularNotifications.filter(notification => 
      !previousNotificationsRef.current.find(prev => prev.id === notification.id)
    );

    console.log('NotificationBanner: new notifications detected', {
      count: newNotifications.length,
      newNotifications: newNotifications.map(n => ({ id: n.id, title: n.title }))
    });

    if (newNotifications.length > 0) {
      // New notification received - play sound
      console.log('NotificationBanner: playing sound for new notifications');
      playNotificationSound();
    }

    previousNotificationsRef.current = regularNotifications;
  }, [regularNotifications, playNotificationSound]);

  const visibleNotifications = regularNotifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  const visibleReplayNotifications = replayNotifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  // Test function for debugging - can be called from browser console
  const testSound = () => {
    console.log('Testing notification sound...');
    playNotificationSound();
  };

  // Expose test function globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).testNotificationSound = testSound;
  }

  // Don't render anything if no notifications
  if (visibleNotifications.length === 0 && visibleReplayNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Regular notifications banner */}
      {visibleNotifications.length > 0 && (
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-2">
              <div className="space-y-2 p-4 bg-muted/30">
                {visibleNotifications.map((notification) => (
                  <Alert key={notification.id} className="gradient-card border-primary/20">
                    <Bell className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{notification.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                        className="ml-4"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replay notifications as popups */}
      {visibleReplayNotifications.map((notification) => (
        <div
          key={notification.id}
          className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-right duration-300"
        >
          <Alert className="gradient-card border-blue-500/30 shadow-lg bg-blue-50 dark:bg-blue-950/20">
            {/* No bell icon for replay notifications as requested */}
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  {notification.title}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  {notification.message}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {format(new Date(notification.created_at), 'HH:mm')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissReplayNotification(notification.id)}
                className="ml-4 text-blue-600 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ))}
    </>
  );
};

export default NotificationBanner;
