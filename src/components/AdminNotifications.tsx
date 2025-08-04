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
import { Bell, Plus, Edit, Trash2, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';

// No external sound file needed - using Web Audio API

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
}

const AdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
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

  const openDialog = (notification?: Notification) => {
    if (notification) {
      setEditingNotification(notification);
      setFormData({
        title: notification.title,
        message: notification.message,
        is_active: notification.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const notificationData = {
        ...formData,
        created_by: user?.id,
      };

      if (editingNotification) {
        const { error } = await supabase
          .from('notifications')
          .update(notificationData)
          .eq('id', editingNotification.id);

        if (error) throw error;

        toast({
          title: "Notification updated!",
          description: "The notification has been successfully updated.",
        });
      } else {
        const { error } = await supabase
          .from('notifications')
          .insert([notificationData]);

        if (error) throw error;

        toast({
          title: "Notification sent!",
          description: "The notification has been sent to all participants.",
        });
        playNotificationSound(); // Play sound on successful send
      }

      closeDialog();
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      toast({
        title: "Notification deleted!",
        description: "The notification has been successfully deleted.",
      });

      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleNotificationStatus = async (notificationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_active: !currentStatus })
        .eq('id', notificationId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Notification deactivated" : "Notification activated",
        description: `The notification is now ${!currentStatus ? 'visible' : 'hidden'} to participants.`,
      });

      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Management</span>
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
              <span>Notification Management</span>
            </CardTitle>
            <CardDescription>
              Send real-time notifications to all participants
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="gradient-primary text-white">
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingNotification ? 'Edit Notification' : 'Send New Notification'}
                </DialogTitle>
                <DialogDescription>
                  {editingNotification 
                    ? 'Update the notification details below.'
                    : 'This notification will be sent to all participants in real-time.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Important announcement"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Your notification message here..."
                    rows={4}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Show to participants</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gradient-primary text-white">
                    {editingNotification ? 'Update' : 'Send Notification'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No notifications sent yet.</p>
            <Button onClick={() => openDialog()} className="gradient-primary text-white">
              <Send className="w-4 h-4 mr-2" />
              Send First Notification
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={notification.is_active ? "default" : "secondary"}
                        className={notification.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {notification.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNotificationStatus(notification.id, notification.is_active)}
                          title={notification.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {notification.is_active ? '👁️' : '👁️‍🗨️'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(notification)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminNotifications;