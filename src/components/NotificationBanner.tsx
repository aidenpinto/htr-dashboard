import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
  is_replay?: boolean;
  original_notification_id?: string;
}

interface NotificationBannerProps {
  notifications: Notification[];
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications }) => {
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [replayNotifications, setReplayNotifications] = useState<Notification[]>([]);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);

  // Filter out replay notifications and handle them separately
  const regularNotifications = notifications.filter(notification => {
    // Check if is_replay property exists (column may not be available yet)
    return !notification.is_replay;
  });
  const newReplayNotifications = notifications.filter(notification => 
    notification.is_replay && !replayNotifications.find(r => r.id === notification.id)
  );

  // Handle new regular notifications (play sound when new notifications arrive)
  useEffect(() => {
    if (regularNotifications.length > previousNotificationCount && previousNotificationCount > 0) {
      // New notification received - play sound
      playNotificationSound();
    }
    setPreviousNotificationCount(regularNotifications.length);
  }, [regularNotifications.length, previousNotificationCount]);

  // Handle new replay notifications
  useEffect(() => {
    if (newReplayNotifications.length > 0) {
      // Play sound for replay notifications
      playReplaySound();
      
      // Add to replay notifications state
      setReplayNotifications(prev => [...prev, ...newReplayNotifications]);
      
      // Auto-dismiss replay notifications after 10 seconds
      newReplayNotifications.forEach(notification => {
        setTimeout(() => {
          dismissReplayNotification(notification.id);
        }, 10000);
      });
    }
  }, [newReplayNotifications]);

  const visibleNotifications = regularNotifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  const visibleReplayNotifications = replayNotifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

  const dismissReplayNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
    setReplayNotifications(prev => prev.filter(n => n.id !== id));
  };

  const playNotificationSound = () => {
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
      } catch (error) {
        console.log('Audio playback failed:', error);
      }
    }
  };

  const playReplaySound = () => {
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
  };

  // Don't render anything if no notifications
  if (visibleNotifications.length === 0 && visibleReplayNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Regular notifications banner */}
      {visibleNotifications.length > 0 && (
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
      )}

      {/* Replay notifications as popups */}
      {visibleReplayNotifications.map((notification) => (
        <div
          key={notification.id}
          className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-right duration-300"
        >
          <Alert className="gradient-card border-blue-500/30 shadow-lg bg-blue-50 dark:bg-blue-950/20">
            <Bell className="h-4 w-4 text-blue-600" />
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