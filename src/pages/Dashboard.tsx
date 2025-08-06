import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckinStatus } from '@/hooks/use-checkin-status';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MessageSquare, Package, Bell, LogOut, Users, Trophy, UserPlus } from 'lucide-react';
import htrLogo from '../assets/htr_logo_transparent.svg';
import RegistrationForm from '@/components/RegistrationForm';
import EventSchedule from '@/components/EventSchedule';
import NotificationBanner from '@/components/NotificationBanner';
import TeamNotificationBanner from '@/components/TeamNotificationBanner';
import NewUserNotifications from '@/components/NewUserNotifications';
import TeamManagement from '@/components/TeamManagement';
import TeamInviteNotification from '@/components/TeamInviteNotification';
import UserNotifications from '@/components/UserNotifications';
const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { isCheckedIn, loading: checkinLoading } = useCheckinStatus();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [teamNotifications, setTeamNotifications] = useState<any[]>([]);
  const [teamInvites, setTeamInvites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  
  // Compute the current tab value
  const getCurrentTab = () => {
    if (activeTab !== "") {
      console.log('Dashboard: Using actively selected tab:', activeTab);
      return activeTab;
    }
    // If no tab is actively selected, use default based on check-in status
    if (!checkinLoading && isCheckedIn !== null) {
      const defaultTab = isCheckedIn === true ? "teams" : "registration";
      console.log('Dashboard: Using default tab based on check-in status:', {
        isCheckedIn,
        defaultTab,
        user: user?.email
      });
      return defaultTab;
    }
    // Fallback during loading
    console.log('Dashboard: Using fallback tab during loading');
    return "registration";
  };

  useEffect(() => {
    if (user && isCheckedIn) {
      // Only load notifications and team data for checked-in users
      loadNotifications();
      loadTeamNotifications();
      loadTeamInvites();

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
          (payload) => {
            console.log('Dashboard: Real-time notification received', payload);
            loadNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications'
          },
          (payload) => {
            console.log('Dashboard: Real-time team notification received', payload);
            loadTeamNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_invites'
          },
          (payload) => {
            console.log('Dashboard: Real-time team invite received', payload);
            console.log('Payload details:', {
              event: payload.eventType,
              table: payload.table,
              new: payload.new,
              old: payload.old
            });
            loadTeamInvites();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (user && isCheckedIn === false) {
      // Clear notifications and team data for non-checked-in users
      setNotifications([]);
      setTeamNotifications([]);
      setTeamInvites([]);
    }
  }, [user, isCheckedIn]);

  const loadNotifications = async () => {
    console.log('Dashboard: Loading notifications...');
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) {
      console.log('Dashboard: Notifications loaded', {
        count: data.length,
        notifications: data.map(n => ({ id: n.id, title: n.title, is_replay: n.is_replay }))
      });
      
      // Filter out replay notifications on the client side if the column exists
      let filteredData = data || [];
      if (data && data.length > 0 && 'is_replay' in data[0]) {
        filteredData = data.filter((notification: any) => !notification.is_replay);
        console.log('Dashboard: Filtered out replay notifications', {
          original: data.length,
          filtered: filteredData.length
        });
      }
      
      setNotifications(filteredData);
    }
  };

  const loadTeamNotifications = async () => {
    if (!user?.id) return;
    
    console.log('Dashboard: Loading team notifications for user:', user.id);
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('Team notifications table not ready:', error);
    } else if (data) {
      console.log('Dashboard: Team notifications loaded', {
        count: data.length,
        notifications: data.map(n => ({ id: n.id, title: n.title }))
      });
      setTeamNotifications(data);
    }
  };

  const loadTeamInvites = async () => {
    console.log('Dashboard: Loading team invites for email:', user?.email);
    const { data, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('invitee_email', user?.email)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Dashboard: Error loading team invites:', error);
    } else {
      console.log('Dashboard: Team invites loaded', {
        count: data?.length || 0,
        invites: data?.map(i => ({ id: i.id, team_id: i.team_id, invitee_email: i.invitee_email })) || []
      });
      setTeamInvites(data || []);
    }
  };

  if (loading || checkinLoading) {
    console.log('Dashboard: Loading state', { loading, checkinLoading, isCheckedIn, activeTab });
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Team Invite Notifications - Must be responded to */}
      {teamInvites.length > 0 && (
        <div className="bg-primary/10 border-b border-primary/20 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-4">
              {teamInvites.map((invite) => (
                <TeamInviteNotification
                  key={invite.id}
                  invite={invite}
                  onRespond={() => {
                    loadTeamInvites();
                    loadTeamNotifications(); // Also reload team notifications when responding to invites
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Regular Notifications Banner */}
      {notifications.length > 0 && (
        <NotificationBanner notifications={notifications} />
      )}

      {/* Team Notifications as Popups */}
      {teamNotifications.length > 0 && (
        <TeamNotificationBanner notifications={teamNotifications} />
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
        <Tabs 
          value={getCurrentTab()}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {isCheckedIn !== true ? (
            // Tabs for users who are NOT checked in (or loading)
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
              <TabsTrigger value="registration" className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Register</span>
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
          ) : (
            // Tabs for users who ARE checked in
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
              <TabsTrigger value="teams" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Teams</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="devpost" className="flex items-center space-x-2">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Devpost</span>
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
          )}

          {isCheckedIn !== true ? (
            // Content for users who are NOT checked in (or loading)
            <>
              <TabsContent value="registration">
                <RegistrationForm />
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
            </>
          ) : (
            // Content for users who ARE checked in
            <>
              <TabsContent value="teams">
                <TeamManagement />
              </TabsContent>

              <TabsContent value="schedule">
                <EventSchedule />
              </TabsContent>

              <TabsContent value="notifications">
                <div className="space-y-6">
                  <NewUserNotifications />
                </div>
              </TabsContent>

              <TabsContent value="devpost">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5" />
                      <span>Submit Your Project</span>
                    </CardTitle>
                    <CardDescription>
                      Submit your hackathon project to Devpost
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Ready to showcase your amazing project? Submit it to our official 
                      Devpost page to participate in judging and compete for prizes!
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Submission Requirements:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                        <li>Project description and what it does</li>
                        <li>How you built it (technologies used)</li>
                        <li>Challenges you ran into</li>
                        <li>Accomplishments you're proud of</li>
                        <li>What you learned</li>
                        <li>Screenshots or demo video</li>
                        <li>Links to code repository</li>
                      </ul>
                    </div>
                    <Button 
                      asChild
                      className="gradient-primary text-white"
                    >
                      <a 
                        href="https://hack-the-ridge.devpost.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>Submit on Devpost</span>
                      </a>
                    </Button>
                  </CardContent>
                </Card>
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
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;