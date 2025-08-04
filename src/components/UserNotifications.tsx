import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
  is_replay?: boolean;
}

const UserNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();

    // Set up real-time notifications
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Notification change detected:', payload);
          loadNotifications();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setError(null);
      console.log('Loading notifications...');

      // Simple query to get all active notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Raw notifications data:', data);

      // Filter out replay notifications on the client side if the column exists
      let filteredNotifications = data || [];
      
      // Check if the is_replay property exists in the data
      if (data && data.length > 0 && 'is_replay' in data[0]) {
        filteredNotifications = data.filter((notification: any) => !notification.is_replay);
        console.log('Filtered out replay notifications:', filteredNotifications);
      }

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Stay updated with the latest announcements and important information
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {notifications.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">Error: {error}</p>
            <Button onClick={loadNotifications} variant="outline">
              Retry
            </Button>
          </div>
        )}
        
        {!error && notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No active notifications at the moment.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later for updates!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Alert key={notification.id} className="gradient-card border-primary/20">
                <Bell className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-base">{notification.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(notification.created_at), 'MMMM d, yyyy \'at\' HH:mm')}</span>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserNotifications; 