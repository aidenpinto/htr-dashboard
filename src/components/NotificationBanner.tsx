import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Bell } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface NotificationBannerProps {
  notifications: Notification[];
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications }) => {
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

  const visibleNotifications = notifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

  if (visibleNotifications.length === 0) return null;

  return (
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
                {format(new Date(notification.created_at), 'MMM d, h:mm a')}
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
  );
};

export default NotificationBanner;