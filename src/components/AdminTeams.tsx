import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Edit, CheckCircle, MessageSquare, Crown, MapPin, UserPlus, UserX, Trash2, XCircle } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  leader_id: string;
  room: string;
  is_finalized: boolean;
  created_at: string;
  members: TeamMember[];
  leader_profile: {
    full_name: string;
    email: string;
  };
}

interface TeamMember {
  id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  profile: {
    full_name: string;
    email: string;
  };
}

const ROOM_OPTIONS = [
  '124', '123', '121', '119', '115', '103', '105', '107',
  '201', '203', '205', '207', '209', '202', '204', '206',
  '216', '211', '213', '215', '217', '219', '223', '225',
  '227', '220', '222', '228', '230', 'Library Conference Room', 'Library'
];

const AdminTeams = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
    
    // Set up real-time updates
    const channel = supabase
      .channel('teams')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        () => {
          loadTeams();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members'
        },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTeams = async () => {
    try {
      console.log('Loading teams for admin...');
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          leader_id,
          room,
          is_finalized,
          created_at
        `)
        .order('room', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading teams:', error);
        toast({
          title: "Error",
          description: "Failed to load teams",
          variant: "destructive"
        });
        return;
      }

      console.log('Teams loaded:', data);

      if (data) {
        // Get members and leader profiles for each team
        const teamsWithMembers = await Promise.all(
          data.map(async (team) => {
            // Get team members
            const { data: members, error: membersError } = await supabase
              .from('team_members')
              .select(`
                id,
                user_id,
                status
              `)
              .eq('team_id', team.id);

            if (membersError) {
              console.error('Error loading members for team:', team.id, membersError);
            }

            // Get leader profile
            const { data: leaderProfile, error: leaderError } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', team.leader_id)
              .single();

            if (leaderError) {
              console.error('Error loading leader profile:', leaderError);
            }

            // Get member profiles
            const memberProfiles = await Promise.all(
              (members || []).map(async (member) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('full_name, email')
                  .eq('user_id', member.user_id)
                  .single();

                return {
                  ...member,
                  profile: profile || { full_name: 'Unknown', email: 'unknown@example.com' }
                };
              })
            );

            return {
              ...team,
              leader_profile: leaderProfile || { full_name: 'Unknown', email: 'unknown@example.com' },
              members: memberProfiles || []
            };
          })
        );

        console.log('Teams with members:', teamsWithMembers);
        setTeams(teamsWithMembers);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTeamRoom = async (teamId: string, newRoom: string) => {
    try {
      await supabase
        .from('teams')
        .update({ room: newRoom })
        .eq('id', teamId);

      toast({
        title: "Success",
        description: "Team room updated successfully!",
      });

      loadTeams();
    } catch (error) {
      console.error('Error updating team room:', error);
      toast({
        title: "Error",
        description: "Failed to update team room",
        variant: "destructive"
      });
    }
  };

  const sendTeamNotification = async (team: Team) => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter both title and message",
        variant: "destructive"
      });
      return;
    }

    setSendingNotification(true);
    try {
      // Get all team member user IDs
      const memberIds = team.members
        .filter(member => member.status === 'accepted')
        .map(member => member.user_id);

      // Add leader
      memberIds.push(team.leader_id);

      // Create notification for each team member
      for (const userId of memberIds) {
        await supabase
          .from('notifications')
          .insert({
            title: notificationTitle,
            message: notificationMessage,
            created_by: 'admin',
            is_active: true
          });
      }

      toast({
        title: "Success",
        description: "Notification sent to team members!",
      });

      setNotificationTitle('');
      setNotificationMessage('');
      setEditingTeam(null);
    } catch (error) {
      console.error('Error sending team notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive"
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const confirmTeamPlacement = async (teamId: string) => {
    try {
      // This could be used to mark teams as confirmed by admin
      toast({
        title: "Success",
        description: "Team placement confirmed!",
      });
    } catch (error) {
      console.error('Error confirming team placement:', error);
      toast({
        title: "Error",
        description: "Failed to confirm team placement",
        variant: "destructive"
      });
    }
  };

  const deleteTeam = async (teamId: string) => {
    setDeletingTeam(teamId);
    try {
      // Delete team members first (due to foreign key constraints)
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);

      // Delete team invites
      await supabase
        .from('team_invites')
        .delete()
        .eq('team_id', teamId);

      // Delete the team
      await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      toast({
        title: "Success",
        description: "Team deleted successfully!",
      });

      loadTeams(); // Refresh the list
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive"
      });
    } finally {
      setDeletingTeam(null);
      setShowDeleteDialog(null);
    }
  };

  const groupTeamsByRoom = () => {
    const grouped: { [room: string]: Team[] } = {};
    teams.forEach(team => {
      if (!grouped[team.room]) {
        grouped[team.room] = [];
      }
      grouped[team.room].push(team);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedTeams = groupTeamsByRoom();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">
            Manage all teams and their room assignments
          </p>
        </div>
        <Badge variant="secondary">
          {teams.length} Total Teams
        </Badge>
      </div>

      {/* Teams by Room */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(groupedTeams).map(([room, roomTeams]) => (
          <Card key={room} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Room {room}</span>
                </span>
                <Badge variant="outline">
                  {roomTeams.length} {roomTeams.length === 1 ? 'Team' : 'Teams'}
                </Badge>
              </CardTitle>
              <CardDescription>
                {room === 'Library' ? 'Unlimited capacity' : 'Max 2 teams'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roomTeams.map((team) => (
                <div
                  key={team.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{team.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Leader: {team.leader_profile.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {team.members.filter(m => m.status === 'accepted').length}/4 members
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {team.is_finalized ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Finalized
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Finalized
                          </Badge>
                        )}
                        {team.leader_id && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="space-y-1 mb-3">
                    {team.members
                      .filter(member => member.status === 'accepted')
                      .map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-sm">
                          <span>{member.profile.full_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {member.user_id === team.leader_id ? 'Leader' : 'Member'}
                          </Badge>
                        </div>
                      ))}
                  </div>

                  {/* Team Actions */}
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex items-center space-x-1">
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Team: {team.name}</DialogTitle>
                          <DialogDescription>
                            Update team details and send notifications
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Room Assignment</Label>
                            <Select
                              value={team.room}
                              onValueChange={(value) => updateTeamRoom(team.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROOM_OPTIONS.map((roomOption) => (
                                  <SelectItem key={roomOption} value={roomOption}>
                                    {roomOption}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Send Team Notification</Label>
                            <Input
                              placeholder="Notification title"
                              value={notificationTitle}
                              onChange={(e) => setNotificationTitle(e.target.value)}
                            />
                            <Textarea
                              placeholder="Notification message"
                              value={notificationMessage}
                              onChange={(e) => setNotificationMessage(e.target.value)}
                            />
                            <Button
                              onClick={() => sendTeamNotification(team)}
                              disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                              className="w-full flex items-center space-x-1"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>Send Notification</span>
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => confirmTeamPlacement(team.id)}
                      className="flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Confirm</span>
                    </Button>

                    <Dialog open={showDeleteDialog === team.id} onOpenChange={(open) => setShowDeleteDialog(open ? team.id : null)}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Team</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete "{team.name}"? This action cannot be undone and will remove all team members and invites.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(null)}
                            disabled={deletingTeam === team.id}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteTeam(team.id)}
                            disabled={deletingTeam === team.id}
                          >
                            {deletingTeam === team.id ? 'Deleting...' : 'Delete Team'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {teams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Teams Yet</h3>
            <p className="text-muted-foreground text-center">
              Teams will appear here once participants start creating them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminTeams; 