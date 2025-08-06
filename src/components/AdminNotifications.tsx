import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Plus, Edit, Trash2, Loader2, Send, Volume2, Play, Users, Globe, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
  is_replay?: boolean;
}

interface UserNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  user_id: string;
  team_id: string | null;
  is_active: boolean;
  read_at: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [viewMode, setViewMode] = useState<'global' | 'team'>('global');
  const [globalNotificationFilter, setGlobalNotificationFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [teamNotificationFilter, setTeamNotificationFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    is_active: true,
  });
  const { toast } = useToast();

  // Function to play notification sound using Web Audio API
  const playNotificationSound = () => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant notification sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Start at 800Hz
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1); // Rise to 1000Hz
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2); // Back to 800Hz
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Start volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log('Audio playback failed:', error);
      }
    }
  };

  // Function to replay notification with sound and popup
  const replayNotification = async (notification: Notification) => {
    try {
      // Play sound immediately for admin
      playNotificationSound();

      // Use Supabase real-time to broadcast replay event instead of creating persistent notifications
      const replayEvent = {
        type: 'notification_replay',
        notification: {
          id: `replay_${notification.id}_${Date.now()}`, // Temporary unique ID
          title: notification.title,
          message: notification.message,
          created_at: new Date().toISOString(),
          is_replay: true,
        },
        timestamp: new Date().toISOString(),
      };

      // Create and subscribe to the channel, then broadcast
      const channel = supabase.channel('notification-replay');
      
      // Subscribe first, then send
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const broadcastStatus = await channel.send({
            type: 'broadcast',
            event: 'replay-notification',
            payload: replayEvent,
          });
          
          console.log('Broadcast status:', broadcastStatus);
          
          // Clean up the channel after sending
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        }
      });

      toast({
        title: "Notification replayed!",
        description: "The notification has been replayed with sound and popup for all participants.",
      });

    } catch (error: any) {
      toast({
        title: "Error replaying notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Function to replay team notification with sound and popup
  const replayTeamNotification = async (notification: UserNotification) => {
    try {
      console.log('Admin: Starting team notification replay for:', {
        id: notification.id,
        title: notification.title,
        user_id: notification.user_id
      });
      
      // Don't play sound on admin side - only broadcast to participants

      // Use Supabase real-time to broadcast team replay event instead of creating persistent notifications
      const replayEvent = {
        type: 'team_notification_replay',
        notification: {
          id: notification.id, // Use original notification ID, not a new one
          title: notification.title, // Use original title without [REPLAY] prefix
          message: notification.message,
          created_at: notification.created_at,
          user_id: notification.user_id,
          team_id: notification.team_id,
          is_active: true,
        },
        timestamp: new Date().toISOString(),
      };

      console.log('Admin: Creating replay event:', replayEvent);

      // Create and subscribe to the channel, then broadcast
      const channel = supabase.channel('team-notification-replay');
      console.log('Admin: Created team notification replay channel');
      
      // Subscribe first, then send
      await channel.subscribe(async (status) => {
        console.log('Admin: Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Admin: Sending team notification replay broadcast...');
          
          const broadcastStatus = await channel.send({
            type: 'broadcast',
            event: 'replay-team-notification',
            payload: replayEvent,
          });
          
          console.log('Admin: Team notification broadcast status:', broadcastStatus);
          
          // Clean up the channel after sending
          setTimeout(() => {
            console.log('Admin: Cleaning up replay channel after delay');
            supabase.removeChannel(channel);
          }, 1000);
        }
      });

      toast({
        title: "Team notification replayed!",
        description: "The team notification has been replayed with sound and popup for the participant.",
      });

    } catch (error: any) {
      toast({
        title: "Error replaying team notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Test function for sound debugging
  const testGlobalNotificationSend = async () => {
    try {
      const testNotification = {
        title: `Test Notification ${Date.now()}`,
        message: `This is a test notification sent at ${new Date().toLocaleTimeString()} to verify sound functionality.`,
        created_by: user?.id,
        is_active: true,
      };

      const { error } = await supabase
        .from('notifications')
        .insert([testNotification]);

      if (error) throw error;
      
      toast({ 
        title: "Test notification sent!",
        description: "Check the participant dashboard to see if the sound plays."
      });
    } catch (error: any) {
      toast({
        title: "Error sending test notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadNotifications();
    loadTeamNotifications();

    // Set up real-time subscriptions
    const globalChannel = supabase
      .channel('admin-global-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Admin: Global notification change detected:', payload);
          loadNotifications();
        }
      )
      .subscribe();

    const teamChannel = supabase
      .channel('admin-team-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications'
        },
        (payload) => {
          console.log('Admin: Team notification change detected:', payload);
          loadTeamNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(teamChannel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out replay notifications on the client side if the column exists
      let filteredData = data || [];
      if (data && data.length > 0 && 'is_replay' in data[0]) {
        filteredData = data.filter((notification: any) => !notification.is_replay);
      }
      
      setNotifications(filteredData || []);
    } catch (error: any) {
      toast({
        title: "Error loading notifications",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamNotifications = async () => {
    try {
      // Try to load user notifications with profile data using a proper join
      const { data, error } = await supabase
        .from('user_notifications')
        .select(`
          id,
          title,
          message,
          created_at,
          user_id,
          team_id,
          is_active,
          read_at,
          profiles!user_notifications_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Team notifications table not ready:', error);
        // Try without profile join as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_notifications')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!fallbackError && fallbackData) {
          setUserNotifications(fallbackData.map(item => ({
            ...item,
            profiles: undefined
          })) as UserNotification[]);
        }
        return;
      }
      
      // Format the data to match our interface
      const formattedData = (data || []).map(item => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }));
      
      console.log('Team notifications loaded:', formattedData);
      setUserNotifications(formattedData as UserNotification[]);
    } catch (error) {
      console.log('Error loading team notifications:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      is_active: true,
    });
    setEditingNotification(null);
  };

  const openEditDialog = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      is_active: notification.is_active,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        created_by: user?.id,
      };

      if (editingNotification) {
        const { error } = await supabase
          .from('notifications')
          .update(payload)
          .eq('id', editingNotification.id);

        if (error) throw error;
        toast({ title: "Notification updated successfully!" });
      } else {
        const { error } = await supabase
          .from('notifications')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Notification created successfully!" });
      }

      closeDialog();
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error saving notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Notification deleted successfully!" });
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error deleting notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleNotificationVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('notifications')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ 
        title: `Notification ${newStatus ? 'shown' : 'hidden'} successfully!`,
        description: newStatus ? "Notification is now visible to participants." : "Notification is now hidden from participants."
      });
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error updating notification visibility",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTeamNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Team notification deleted successfully!" });
      loadTeamNotifications();
    } catch (error: any) {
      toast({
        title: "Error deleting team notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markTeamNotificationAsRead = async (id: string, currentReadStatus: string | null) => {
    try {
      const newReadStatus = currentReadStatus ? null : new Date().toISOString();
      
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: newReadStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ 
        title: currentReadStatus ? "Marked as unread" : "Marked as read",
        description: "Team notification status updated successfully!"
      });
      loadTeamNotifications();
    } catch (error: any) {
      toast({
        title: "Error updating notification status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAllTeamNotificationsAsRead = async () => {
    try {
      const unreadNotifications = userNotifications.filter(n => !n.read_at);
      
      if (unreadNotifications.length === 0) {
        toast({
          title: "No unread notifications",
          description: "All team notifications are already marked as read."
        });
        return;
      }

      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadNotifications.map(n => n.id));

      if (error) throw error;
      
      toast({ 
        title: "Success",
        description: `Marked ${unreadNotifications.length} notifications as read!`
      });
      loadTeamNotifications();
    } catch (error: any) {
      toast({
        title: "Error marking notifications as read",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentNotifications = viewMode === 'global' ? 
    notifications.filter(notification => {
      switch (globalNotificationFilter) {
        case 'visible':
          return notification.is_active;
        case 'hidden':
          return !notification.is_active;
        default:
          return true;
      }
    }) : [];
  const filteredTeamNotifications = viewMode === 'team' ? 
    userNotifications.filter(notification => {
      switch (teamNotificationFilter) {
        case 'read':
          return notification.read_at !== null;
        case 'unread':
          return notification.read_at === null;
        default:
          return true;
      }
    }) : [];
  const currentTeamNotifications = filteredTeamNotifications;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications Management
          </h2>
          <p className="text-muted-foreground">
            Manage global notifications and view team notifications sent to participants.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'global' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('global')}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              Global
            </Button>
            <Button
              variant={viewMode === 'team' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('team')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Team
            </Button>
          </div>

          {viewMode === 'global' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Notification
                </Button>
              </DialogTrigger>
              <Button 
                onClick={testGlobalNotificationSend}
                variant="outline"
                className="ml-2"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Test Sound
              </Button>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingNotification ? 'Edit Notification' : 'Create New Notification'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingNotification 
                      ? 'Update the notification details below.' 
                      : 'Create a new global notification that will be visible to all participants.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter notification title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter notification message"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <div>
                      <Label htmlFor="is-active">Visible to participants</Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, this notification will be visible to all participants
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingNotification ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === 'global' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Global Notifications
                </CardTitle>
                <CardDescription>
                  System-wide notifications visible to all participants
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={globalNotificationFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGlobalNotificationFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={globalNotificationFilter === 'visible' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGlobalNotificationFilter('visible')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Visible
                  </Button>
                  <Button
                    variant={globalNotificationFilter === 'hidden' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGlobalNotificationFilter('hidden')}
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                    Hidden
                  </Button>
                </div>
                <Badge variant="secondary">
                  {currentNotifications.length} notifications
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {globalNotificationFilter === 'all' ? 'No global notifications created yet.' : 
                 globalNotificationFilter === 'visible' ? 'No visible notifications found.' :
                 'No hidden notifications found.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="max-w-md truncate">{notification.message}</TableCell>
                      <TableCell>
                        <Badge variant={notification.is_active ? "default" : "secondary"}>
                          {notification.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleNotificationVisibility(notification.id, notification.is_active)}
                            title={notification.is_active ? "Hide notification from participants" : "Show notification to participants"}
                          >
                            {notification.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => replayNotification(notification)}
                            title="Replay with sound and popup"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(notification)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'team' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Notifications
                </CardTitle>
                <CardDescription>
                  Notifications sent to specific team members via the team management system
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={teamNotificationFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTeamNotificationFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={teamNotificationFilter === 'unread' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTeamNotificationFilter('unread')}
                  >
                    Unread
                  </Button>
                  <Button
                    variant={teamNotificationFilter === 'read' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTeamNotificationFilter('read')}
                  >
                    Read
                  </Button>
                </div>
                <Badge variant="secondary">
                  {currentTeamNotifications.length} total
                </Badge>
                <Badge variant="outline">
                  {userNotifications.filter(n => !n.read_at).length} unread
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTeamNotifications}
                  title="Refresh team notifications"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {userNotifications.filter(n => !n.read_at).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllTeamNotificationsAsRead}
                    title="Mark all as read"
                  >
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentTeamNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                {teamNotificationFilter === 'all' ? (
                  <>
                    <p className="text-muted-foreground mb-2">
                      No team notifications sent yet.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Team notifications are sent from the Team Management page or when admins send notifications to specific teams.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-2">
                      No {teamNotificationFilter} team notifications found.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setTeamNotificationFilter('all')}
                    >
                      View All Notifications
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Team ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTeamNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="max-w-md truncate">{notification.message}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{notification.profiles?.full_name || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">{notification.profiles?.email || notification.user_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {notification.team_id || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={notification.read_at ? "default" : "secondary"}>
                          {notification.read_at ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => replayTeamNotification(notification)}
                            title="Replay team notification"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markTeamNotificationAsRead(notification.id, notification.read_at)}
                            title={notification.read_at ? "Mark as unread" : "Mark as read"}
                          >
                            {notification.read_at ? "👁️" : "👁️‍🗨️"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTeamNotification(notification.id)}
                            title="Delete team notification"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminNotifications;