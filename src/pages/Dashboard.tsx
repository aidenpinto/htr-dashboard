import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MessageSquare, Package, Bell, LogOut } from 'lucide-react';
import htrLogo from '../assets/htr_logo_transparent.svg';
import RegistrationForm from '@/components/RegistrationForm';
import EventSchedule from '@/components/EventSchedule';
import NotificationBanner from '@/components/NotificationBanner';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      // Load notifications
      loadNotifications();

      // Set up real-time notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications'
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) {
      setNotifications(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Notifications Banner */}
      {notifications.length > 0 && (
        <NotificationBanner notifications={notifications} />
      )}

      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src={htrLogo} alt="HTR Logo" className="w-16 h-16 object-contain" />
              <div>
                <h1 className="text-xl font-bold">Hack the Ridge</h1>
                <p className="text-sm text-muted-foreground">Participant Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="hidden sm:flex">
                {user.email}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="registration" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="registration" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Register</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="discord" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Discord</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registration">
            <RegistrationForm />
          </TabsContent>

          <TabsContent value="schedule">
            <EventSchedule />
          </TabsContent>

          <TabsContent value="discord">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Join Our Discord Community</span>
                </CardTitle>
                <CardDescription>
                  Connect with fellow hackers, mentors, and organizers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Join our Discord server to get real-time updates, ask questions, 
                  find teammates, and connect with the hackathon community.
                </p>
                <Button 
                  asChild
                  className="gradient-primary text-white"
                >
                  <a 
                    href="https://discord.gg/hacktheridge" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Join Discord Server</span>
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Hacker Package</span>
                </CardTitle>
                <CardDescription>
                  Essential resources and tools for your hackathon journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Access APIs, developer tools, design resources, and more to help 
                  you build amazing projects during the hackathon.
                </p>
                <Button 
                  asChild
                  className="gradient-primary text-white"
                >
                  <a 
                    href="/hacker-package.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2"
                  >
                    <Package className="w-4 h-4" />
                    <span>Download Hacker Package</span>
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;