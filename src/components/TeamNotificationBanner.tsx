import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
  team_id: string | null;
  read_at: string | null;
  user_id?: string;
}

interface TeamNotificationBannerProps {
  notifications: TeamNotification[];
}

const TeamNotificationBanner: React.FC<TeamNotificationBannerProps> = ({ notifications }) => {
  const { user } = useAuth();
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [previousNotifications, setPreviousNotifications] = useState<TeamNotification[]>([]);
  const [replayNotifications, setReplayNotifications] = useState<TeamNotification[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render counter

  // Initialize audio context automatically (mobile-friendly)
  const initializeAudio = useCallback(async () => {
    if (!audioInitialized && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          
          // Resume audio context if suspended (mobile requirement)
          if (ctx.state === 'suspended') {
            await ctx.resume();
            console.log('Team notification audio context resumed');
          }
          
          setAudioContext(ctx);
          setAudioInitialized(true);
          console.log('Team notification audio context initialized, state:', ctx.state);
          
          return ctx; // Return the context for immediate use
        }
      } catch (error) {
        console.log('Team notification audio initialization failed:', error);
        // Fallback: try to use browser notification sound or vibration
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    } else if (audioContext) {
      // If already initialized, just return the existing context
      return audioContext;
    }
    return null;
  }, [audioInitialized, audioContext]);

  // Function to play notification sound (mobile-optimized)
  const playNotificationSound = useCallback(async (isReplay = false) => {
    try {
      console.log(`Attempting to play team notification sound (${isReplay ? 'replay' : 'original'})`);
      
      // Always try to ensure audio is properly initialized and context is running
      let contextToUse = audioContext;
      
      // If no context or context is not running, initialize/resume
      if (!audioInitialized || !contextToUse || contextToUse.state !== 'running') {
        console.log('Audio context not ready, initializing/resuming...');
        const newContext = await initializeAudio();
        contextToUse = newContext || audioContext;
        
        // Wait a bit for the context to be set if it's still not available
        if (!contextToUse) {
          await new Promise(resolve => setTimeout(resolve, 100));
          contextToUse = audioContext;
        }
        
        // Try to resume the context if suspended
        if (contextToUse && contextToUse.state === 'suspended') {
          console.log('Audio context suspended, resuming...');
          await contextToUse.resume();
        }
        
        // Small delay to let audio context stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Audio context state: ${contextToUse?.state}, initialized: ${audioInitialized}`);

      if (contextToUse && contextToUse.state === 'running') {
        const oscillator = contextToUse.createOscillator();
        const gainNode = contextToUse.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(contextToUse.destination);
        
        if (isReplay) {
          // Different sound pattern for replayed notifications
          oscillator.frequency.setValueAtTime(1000, contextToUse.currentTime);
          oscillator.frequency.setValueAtTime(800, contextToUse.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(1200, contextToUse.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(900, contextToUse.currentTime + 0.3);
        } else {
          // Original sound pattern for new team notifications
          oscillator.frequency.setValueAtTime(900, contextToUse.currentTime);
          oscillator.frequency.setValueAtTime(1100, contextToUse.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(900, contextToUse.currentTime + 0.2);
        }
        
        gainNode.gain.setValueAtTime(0.3, contextToUse.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, contextToUse.currentTime + (isReplay ? 0.4 : 0.3));
        
        oscillator.start(contextToUse.currentTime);
        oscillator.stop(contextToUse.currentTime + (isReplay ? 0.4 : 0.3));
        
        console.log(`Team notification sound played successfully (${isReplay ? 'replay' : 'original'})`);
      } else {
        console.log('AudioContext not running, using vibration fallback. State:', contextToUse?.state);
        // Fallback for mobile: use vibration if available
        if ('vibrate' in navigator) {
          navigator.vibrate(isReplay ? [200, 100, 200, 100, 200] : [200, 100, 200]);
          console.log('Vibration triggered as fallback');
        }
      }
    } catch (error) {
      console.log('Team notification audio playback failed:', error);
      // Final fallback: vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([200]);
        console.log('Emergency vibration fallback triggered');
      }
    }
  }, [audioInitialized, audioContext, initializeAudio]);

  // Function to dismiss replay notifications
  const dismissReplayNotification = useCallback((notificationId: string) => {
    console.log('Dismissing replay notification:', notificationId);
    setDismissedNotifications(prev => {
      const newDismissed = [...prev, notificationId];
      console.log('New dismissed notifications:', newDismissed);
      return newDismissed;
    });
    setReplayNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notificationId);
      console.log('Remaining replay notifications after dismiss:', filtered.map(n => ({ id: n.id, title: n.title })));
      return filtered;
    });
  }, []);

  // Test function for debugging - can be called from browser console
  const testTeamNotificationSound = (isReplay = false) => {
    console.log('Testing team notification sound...');
    playNotificationSound(isReplay);
  };

  // Expose test function globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).testTeamNotificationSound = testTeamNotificationSound;
  }

  // Auto-initialize audio on component mount and user interaction
  useEffect(() => {
    const handleUserInteraction = async () => {
      console.log('User interaction detected, initializing audio...');
      await initializeAudio();
      
      // Try to resume audio context immediately on interaction
      if (audioContext && audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('Audio context resumed after user interaction');
        } catch (error) {
          console.log('Failed to resume audio context:', error);
        }
      }
      
      // Remove listeners after first successful interaction
      if (audioInitialized && audioContext && audioContext.state === 'running') {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };

    // Try to initialize immediately (might work in some browsers)
    initializeAudio();
    
    // Set up interaction listeners (required for mobile/strict browsers)
    document.addEventListener('click', handleUserInteraction, { once: false });
    document.addEventListener('touchstart', handleUserInteraction, { once: false });
    document.addEventListener('keydown', handleUserInteraction, { once: false });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [audioInitialized, audioContext, initializeAudio]);

  // Listen for broadcast team notification replay events
  useEffect(() => {
    console.log('Setting up team notification replay channel listener');
    const channel = supabase.channel('team-notification-replay');
    
    channel
      .on('broadcast', { event: 'replay-team-notification' }, (payload) => {
        console.log('Received team notification replay broadcast:', payload);
        const replayNotification = payload.payload.notification;
        
        console.log('Replay notification user_id:', replayNotification.user_id, 'Current user id:', user?.id);
        
        // Only show replay if it's for the current user
        if (replayNotification.user_id === user?.id) {
          console.log('Processing replayed team notification for user:', user?.id);
          console.log('Replay notification details:', {
            id: replayNotification.id,
            title: replayNotification.title,
            message: replayNotification.message,
            user_id: replayNotification.user_id
          });
          
          // Remove this notification from dismissed list since it's being replayed
          // This ensures that previously dismissed/read notifications will show up again when replayed
          setDismissedNotifications(prevDismissed => {
            const newDismissed = prevDismissed.filter(id => id !== replayNotification.id);
            console.log('Removed replayed notification from dismissed list:', replayNotification.id);
            console.log('Previous dismissed:', prevDismissed, 'New dismissed:', newDismissed);
            return newDismissed;
          });
          
          // Add to replay notifications state with a unique key to ensure re-render
          const replayWithUniqueKey = {
            ...replayNotification,
            // Add a unique timestamp to ensure React treats it as new
            displayKey: `${replayNotification.id}-${Date.now()}`
          };
          
          setReplayNotifications(prev => {
            // Check if this notification is already in the list to avoid duplicates
            const exists = prev.find(n => n.id === replayNotification.id);
            if (exists) {
              console.log('Replay notification already exists, skipping');
              return prev;
            }
            
            console.log('Adding replay notification to state with unique key');
            const newState = [...prev, replayWithUniqueKey];
            console.log('New replay notifications state:', newState.map(n => ({ id: n.id, title: n.title })));
            return newState;
          });
          
          // Then play sound after a small delay to ensure state is updated
          console.log('Playing sound for replayed team notification for user:', user?.id);
          setTimeout(async () => {
            try {
              await initializeAudio();
              await playNotificationSound(true);
            } catch (error) {
              console.log('Error playing sound for replayed team notification:', error);
            }
          }, 100);
          
          // Auto-dismiss after 10 seconds
          const timeoutId = setTimeout(() => {
            console.log('Auto-dismissing replay notification after 10 seconds:', replayNotification.id);
            dismissReplayNotification(replayNotification.id);
          }, 10000);
          
          console.log('Set auto-dismiss timeout for replay notification:', replayNotification.id, 'timeout ID:', timeoutId);
        } else {
          console.log('Replay notification not for current user, ignoring');
        }
      })
      .subscribe((status) => {
        console.log('Team notification replay channel subscription status:', status);
      });

    return () => {
      console.log('Cleaning up team notification replay channel');
      supabase.removeChannel(channel);
    };
  }, [user?.id, playNotificationSound, dismissReplayNotification, initializeAudio]);

  // Handle new team notifications (play sound when new notifications arrive)
  useEffect(() => {
    // Filter out notifications that might be replayed (those with [REPLAY] prefix)
    const regularNotifications = notifications.filter(notification => 
      !notification.title.startsWith('[REPLAY]')
    );
    
    console.log('TeamNotificationBanner: notifications changed', {
      totalCount: notifications.length,
      regularCount: regularNotifications.length,
      notifications: regularNotifications.map(n => ({ id: n.id, title: n.title, user_id: n.user_id }))
    });
    
    // Check for new notifications by comparing IDs
    const newNotifications = regularNotifications.filter(notification => 
      !previousNotifications.find(prev => prev.id === notification.id)
    );

    console.log('TeamNotificationBanner: new team notifications detected', {
      count: newNotifications.length,
      newNotifications: newNotifications.map(n => ({ id: n.id, title: n.title, user_id: n.user_id }))
    });

    // Only play sound for new notifications meant for the current user
    const newUserNotifications = newNotifications.filter(notification => 
      notification.user_id === user?.id
    );

    console.log('TeamNotificationBanner: new notifications for current user', {
      count: newUserNotifications.length,
      userId: user?.id,
      notifications: newUserNotifications.map(n => ({ id: n.id, title: n.title }))
    });

    if (newUserNotifications.length > 0) {
      // New team notification received for this user - play sound
      console.log('TeamNotificationBanner: playing sound for new team notifications for user:', user?.id);
      // Force audio context initialization if needed, then play sound
      setTimeout(async () => {
        try {
          await initializeAudio();
          // Add a small delay to ensure audio context is ready
          await new Promise(resolve => setTimeout(resolve, 50));
          await playNotificationSound(false);
        } catch (error) {
          console.log('Error playing sound for new team notification:', error);
        }
      }, 100);
    }

    setPreviousNotifications(regularNotifications);
  }, [notifications, user?.id, playNotificationSound, initializeAudio]);

  // Monitor replay notifications state changes for debugging
  useEffect(() => {
    console.log('TeamNotificationBanner: replayNotifications state changed:', {
      count: replayNotifications.length,
      notifications: replayNotifications.map(n => ({ id: n.id, title: n.title, displayKey: (n as any).displayKey }))
    });
  }, [replayNotifications]);

  // Monitor notifications prop changes for debugging
  useEffect(() => {
    console.log('TeamNotificationBanner: notifications prop changed:', {
      count: notifications.length,
      notifications: notifications.map(n => ({ id: n.id, title: n.title, read_at: n.read_at, user_id: n.user_id }))
    });
  }, [notifications]);

  const visibleNotifications = notifications.filter(
    notification => !dismissedNotifications.includes(notification.id) && 
    !notification.title.startsWith('[REPLAY]') && // Filter out replay notifications from regular display
    !notification.read_at // Only show notifications that haven't been read
  );

  const visibleReplayNotifications = replayNotifications.filter(
    notification => {
      // Replay notifications should always be visible (don't check dismissedNotifications)
      // They can only be dismissed by explicitly calling dismissReplayNotification
      console.log('Checking replay notification visibility:', {
        id: notification.id,
        title: notification.title,
        isDismissed: dismissedNotifications.includes(notification.id)
      });
      return !dismissedNotifications.includes(notification.id);
    }
  );

  console.log('TeamNotificationBanner: visibility check', {
    visibleNotifications: visibleNotifications.length,
    visibleReplayNotifications: visibleReplayNotifications.length,
    replayNotifications: replayNotifications.map(n => ({ id: n.id, title: n.title })),
    dismissedNotifications,
    totalReplayNotifications: replayNotifications.length,
    forceUpdateCounter: forceUpdate,
    allNotifications: notifications.map(n => ({ id: n.id, title: n.title, read_at: n.read_at, user_id: n.user_id }))
  });

  // Combine all visible notifications for rendering
  const allVisibleNotifications = [...visibleNotifications, ...visibleReplayNotifications];

  console.log('TeamNotificationBanner: all visible notifications', {
    count: allVisibleNotifications.length,
    notifications: allVisibleNotifications.map(n => ({ id: n.id, title: n.title }))
  });

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }
      
      console.log('Marked notification as read in database:', notificationId);
      // Add to dismissed notifications to hide it immediately
      setDismissedNotifications(prev => [...prev, notificationId]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Don't render anything if no notifications
  if (allVisibleNotifications.length === 0) {
    console.log('TeamNotificationBanner: No visible notifications to render');
    return null;
  }

  console.log('TeamNotificationBanner: Rendering', allVisibleNotifications.length, 'notifications', {
    notifications: allVisibleNotifications.map(n => ({ 
      id: n.id, 
      title: n.title, 
      isReplay: replayNotifications.some(replay => replay.id === n.id),
      displayKey: (n as any).displayKey 
    }))
  });

  return (
    <>
      {/* Team notifications as top-right popups */}
      {allVisibleNotifications.slice(0, 3).map((notification, index) => {
        const isReplay = replayNotifications.some(replay => replay.id === notification.id);
        
        console.log('Rendering notification:', {
          id: notification.id,
          title: notification.title,
          isReplay,
          index,
          displayKey: (notification as any).displayKey
        });
        
        // Use displayKey for replay notifications to ensure proper re-rendering
        const componentKey = (notification as any).displayKey || notification.id;
        
        return (
          <div
            key={componentKey}
            className={`fixed z-50 max-w-sm w-full animate-in slide-in-from-right duration-300`}
            style={{
              top: `${16 + index * 80}px`,
              right: '16px'
            }}
          >
            <Alert className="gradient-card border-blue-500/30 shadow-lg bg-blue-50 dark:bg-blue-950/20">
              <Users className="h-4 w-4 text-blue-600" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      {notification.title}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Team
                    </Badge>
                    {isReplay && (
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                        Replay
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                    {notification.message}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    {format(new Date(notification.created_at), 'HH:mm')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => isReplay ? dismissReplayNotification(notification.id) : markAsRead(notification.id)}
                  className="ml-4 text-blue-600 hover:text-blue-700 text-xs"
                >
                  {isReplay ? 'Dismiss' : 'Mark as Read'}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        );
      })}
    </>
  );
};

export default TeamNotificationBanner;
