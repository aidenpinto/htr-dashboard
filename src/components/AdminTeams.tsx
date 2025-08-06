import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Edit, CheckCircle, MessageSquare, Crown, MapPin, UserPlus, UserX, Trash2, XCircle, RefreshCw, Mail } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  leader_id: string;
  room: string;
  is_finalized: boolean;
  confirmed: boolean;
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

interface RoomData {
  id: string;
  name: string;
  teams: Team[];
  maxTeams: number;
}

const ROOMS = [
  { id: '124', name: 'Room 124', maxTeams: 2 },
  { id: '123', name: 'Room 123', maxTeams: 2 },
  { id: '121', name: 'Room 121', maxTeams: 2 },
  { id: '119', name: 'Room 119', maxTeams: 2 },
  { id: '115', name: 'Room 115', maxTeams: 2 },
  { id: '103', name: 'Room 103', maxTeams: 2 },
  { id: '105', name: 'Room 105', maxTeams: 2 },
  { id: '107', name: 'Room 107', maxTeams: 2 },
  { id: '201', name: 'Room 201', maxTeams: 2 },
  { id: '203', name: 'Room 203', maxTeams: 2 },
  { id: '205', name: 'Room 205', maxTeams: 2 },
  { id: '207', name: 'Room 207', maxTeams: 2 },
  { id: '209', name: 'Room 209', maxTeams: 2 },
  { id: '202', name: 'Room 202', maxTeams: 2 },
  { id: '204', name: 'Room 204', maxTeams: 2 },
  { id: '206', name: 'Room 206', maxTeams: 2 },
  { id: '216', name: 'Room 216', maxTeams: 2 },
  { id: '211', name: 'Room 211', maxTeams: 2 },
  { id: '213', name: 'Room 213', maxTeams: 2 },
  { id: '215', name: 'Room 215', maxTeams: 2 },
  { id: '217', name: 'Room 217', maxTeams: 2 },
  { id: '219', name: 'Room 219', maxTeams: 2 },
  { id: '223', name: 'Room 223', maxTeams: 2 },
  { id: '225', name: 'Room 225', maxTeams: 2 },
  { id: '227', name: 'Room 227', maxTeams: 2 },
  { id: '220', name: 'Room 220', maxTeams: 2 },
  { id: '222', name: 'Room 222', maxTeams: 2 },
  { id: '228', name: 'Room 228', maxTeams: 2 },
  { id: '230', name: 'Room 230', maxTeams: 2 },
  { id: 'Library Conference Room', name: 'Library Conference Room', maxTeams: 2 },
  { id: 'Library', name: 'Library', maxTeams: 999 },
  { id: 'unassigned', name: 'Unassigned Teams', maxTeams: 999 }
];

const AdminTeams = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'rooms' | 'list'>('rooms');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>(['']);
  const [invitingTeam, setInvitingTeam] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
    
    const channel = supabase
      .channel('admin-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => loadTeams())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (teams.length > 0) organizeTeamsByRoom();
  }, [teams]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, leader_id, room, is_finalized, confirmed, created_at')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const teamsWithMembers = await Promise.all(
          data.map(async (team) => {
            const { data: members } = await supabase
              .from('team_members')
              .select('id, user_id, status')
              .eq('team_id', team.id);

            const { data: leaderProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', team.leader_id)
              .single();

            const memberProfiles = await Promise.all(
              (members || []).map(async (member) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('full_name, email')
                  .eq('user_id', member.user_id)
                  .single();

                return {
                  ...member,
                  status: member.status as 'pending' | 'accepted' | 'declined',
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

        setTeams(teamsWithMembers);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast({ title: "Error", description: "Failed to load teams", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const organizeTeamsByRoom = () => {
    const roomData: RoomData[] = ROOMS.map(room => ({
      ...room,
      teams: teams.filter(team => {
        if (room.id === 'unassigned') return !team.room || team.room === '';
        return team.room === room.id;
      })
    }));
    setRooms(roomData);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const destinationRoomId = destination.droppableId;
    const destinationRoom = ROOMS.find(room => room.id === destinationRoomId);
    if (!destinationRoom) return;

    // Check if this is a single-member team that should stay in Library
    const team = teams.find(t => t.id === draggableId);
    if (team) {
      const acceptedMembers = team.members.filter(m => m.status === 'accepted');
      const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
      const totalMembers = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
      
      if (totalMembers === 1 && destinationRoomId !== 'Library') {
        toast({
          title: "Cannot Move Team",
          description: "Single-member teams must remain in the Library",
          variant: "destructive"
        });
        return;
      }
    }

    if (destinationRoomId !== 'unassigned' && destinationRoomId !== 'Library') {
      const destinationRoomData = rooms.find(room => room.id === destinationRoomId);
      if (destinationRoomData && destinationRoomData.teams.length >= destinationRoom.maxTeams) {
        toast({
          title: "Room Full",
          description: `${destinationRoom.name} is at capacity`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setUpdating(true);
      const newRoom = destinationRoomId === 'unassigned' ? null : destinationRoomId;
      const { error } = await supabase.from('teams').update({ room: newRoom }).eq('id', draggableId);
      if (error) throw error;
      toast({ title: "Success", description: `Team moved to ${destinationRoom.name}` });
      await loadTeams();
    } catch (error) {
      console.error('Error updating team room:', error);
      toast({ title: "Error", description: "Failed to update team room", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const updateTeamRoom = async (teamId: string, newRoom: string) => {
    try {
      await supabase.from('teams').update({ room: newRoom }).eq('id', teamId);
      toast({ title: "Success", description: "Team room updated successfully!" });
      loadTeams();
    } catch (error) {
      console.error('Error updating room:', error);
      toast({ title: "Error", description: "Failed to update team room", variant: "destructive" });
    }
  };

  const sendTeamNotification = async (team: Team) => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({ title: "Error", description: "Please fill in both title and message", variant: "destructive" });
      return;
    }

    setSendingNotification(true);
    try {
      // Get all team members (accepted members + leader)
      const teamMemberIds = [team.leader_id];
      team.members
        .filter(member => member.status === 'accepted')
        .forEach(member => {
          if (!teamMemberIds.includes(member.user_id)) {
            teamMemberIds.push(member.user_id);
          }
        });

      // Create notifications for each team member
      const notifications = teamMemberIds.map(userId => ({
        user_id: userId,
        title: `[${team.name}] ${notificationTitle}`,
        message: notificationMessage,
        created_by: user?.id || team.leader_id,
        team_id: team.id
      }));

      const { error } = await supabase.from('user_notifications').insert(notifications);
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `Notification sent to ${teamMemberIds.length} team members of ${team.name}!` 
      });
      setNotificationTitle('');
      setNotificationMessage('');
      setEditingTeam(null); // Close the dialog
    } catch (error) {
      console.error('Error sending team notification:', error);
      toast({ title: "Error", description: "Failed to send team notification", variant: "destructive" });
    } finally {
      setSendingNotification(false);
    }
  };

  const confirmTeamPlacement = async (teamId: string) => {
    try {
      const team = teams.find(t => t.id === teamId);
      const newConfirmedStatus = !team?.confirmed;
      
      await supabase.from('teams').update({ confirmed: newConfirmedStatus }).eq('id', teamId);
      toast({ 
        title: "Success", 
        description: newConfirmedStatus ? "Team confirmed!" : "Team confirmation removed" 
      });
      loadTeams();
    } catch (error) {
      console.error('Error updating team confirmation:', error);
      toast({ title: "Error", description: "Failed to update team confirmation", variant: "destructive" });
    }
  };

  const deleteTeam = async (teamId: string) => {
    setDeletingTeam(teamId);
    try {
      await supabase.from('team_members').delete().eq('team_id', teamId);
      await supabase.from('team_invites').delete().eq('team_id', teamId);
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      toast({ title: "Success", description: "Team deleted successfully" });
      setShowDeleteDialog(null);
      loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({ title: "Error", description: "Failed to delete team", variant: "destructive" });
    } finally {
      setDeletingTeam(null);
    }
  };

  const inviteToTeam = async (teamId: string) => {
    const validEmails = inviteEmails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      toast({ title: "Error", description: "Please enter at least one email address", variant: "destructive" });
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const email of validEmails) {
        console.log('AdminTeams: Checking profile for email:', email);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, email')
          .eq('email', email.trim())
          .single();

        console.log('AdminTeams: Profile query result:', { profile, profileError });

        if (profileError || !profile) {
          console.error('AdminTeams: Profile not found for email:', email, profileError);
          toast({ title: "Warning", description: `User with email ${email} not found. Make sure they have an account on the platform.`, variant: "destructive" });
          errorCount++;
          continue;
        }

        // Check if the user is registered and checked in
        console.log('AdminTeams: Checking registration for user_id:', profile.user_id);
        
        const { data: registrations, error: regError } = await supabase
          .from('registrations')
          .select('user_id, email, full_name, checked_in')
          .eq('user_id', profile.user_id);

        console.log('AdminTeams: Registration query result:', { registrations, regError });

        if (regError) {
          console.error('AdminTeams: Error checking registration for user:', email, regError);
          toast({ title: "Error", description: `Error checking registration status for ${email}: ${regError.message}`, variant: "destructive" });
          errorCount++;
          continue;
        }

        if (!registrations || registrations.length === 0) {
          console.log('AdminTeams: No registration found for user:', email, 'user_id:', profile.user_id);
          toast({ 
            title: "Registration Required", 
            description: `User ${email} has an account but is not registered for the hackathon. They need to complete registration first.`, 
            variant: "destructive" 
          });
          errorCount++;
          continue;
        }

        // Get the first registration (should only be one per user)
        const registration = registrations[0];
        console.log('AdminTeams: Found registration:', registration);

        // Check if the user is checked in
        const isCheckedIn = registration?.checked_in === true;
        console.log('AdminTeams: Check-in status:', isCheckedIn);

        if (!isCheckedIn) {
          toast({ 
            title: "Check-in Required", 
            description: `${email} is registered but has not been checked in to the event yet. Please check them in before inviting to a team.`, 
            variant: "destructive" 
          });
          errorCount++;
          continue;
        }

        console.log('AdminTeams: User passed all checks:', email);

        const { error } = await supabase.from('team_invites').insert({
          team_id: teamId,
          inviter_id: team.leader_id,
          invitee_email: email.trim()
        });

        if (error) {
          console.error('Error creating invite:', error);
          toast({ title: "Error", description: `Failed to invite ${email}`, variant: "destructive" });
          errorCount++;
        } else {
          successCount++;
        }
      }

      // Show summary message
      if (successCount > 0 && errorCount === 0) {
        toast({ title: "Success", description: `All ${successCount} invites sent successfully!` });
      } else if (successCount > 0 && errorCount > 0) {
        toast({ title: "Partial Success", description: `${successCount} invites sent successfully, ${errorCount} failed (only checked-in users can be invited)` });
      } else if (errorCount > 0) {
        toast({ title: "Failed", description: `All invites failed. Only checked-in users can be invited to teams.`, variant: "destructive" });
      }

      setInviteEmails(['']);
      setInvitingTeam(null); // Close the invite dialog
    } catch (error) {
      console.error('Error inviting users:', error);
      toast({ title: "Error", description: "Failed to send invites", variant: "destructive" });
    }
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const removeEmailField = (index: number) => {
    if (inviteEmails.length > 1) {
      const newEmails = inviteEmails.filter((_, i) => i !== index);
      setInviteEmails(newEmails);
    }
  };

  const updateEmailField = (index: number, value: string) => {
    setInviteEmails(prevEmails => {
      const newEmails = [...prevEmails];
      newEmails[index] = value;
      return newEmails;
    });
  };

  const TeamCard = ({ team, index, isInRoomView = false }: { team: Team; index: number; isInRoomView?: boolean }) => {
    if (isInRoomView) {
      return (
        <Draggable draggableId={team.id} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`mb-3 transform transition-all duration-200 ${
                snapshot.isDragging ? 'rotate-1 scale-105 shadow-xl z-50' : 'hover:scale-[1.02] hover:shadow-md'
              }`}
            >
              <Card className={`cursor-move border-l-4 ${
                team.confirmed 
                  ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' 
                  : 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
              } ${snapshot.isDragging ? 'shadow-xl border-primary bg-background' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-sm font-medium">{team.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {team.is_finalized && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        Finalized
                      </Badge>
                    )}
                    {(() => {
                      const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                      const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                      const totalMembers = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                      if (totalMembers === 1) {
                        return (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                            Solo → Library
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                    {team.confirmed ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                        Unconfirmed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center text-muted-foreground text-xs">
                    <Crown className="w-3 h-3 mr-1 text-yellow-600" />
                    <span className="truncate">{team.leader_profile.full_name}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    <span>{(() => {
                      const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                      const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                      return leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                    })()}/4</span>
                  </div>
                  {/* Confirm/Unconfirm toggle button for room view */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmTeamPlacement(team.id);
                    }}
                    className={`w-full text-xs h-8 border transition-colors ${
                      team.confirmed 
                        ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:border-red-300' 
                        : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:border-green-300'
                    }`}
                  >
                    {team.confirmed ? (
                      <>
                        <XCircle className="w-3 h-3 mr-1.5" />
                        <span className="text-xs">Remove Confirmation</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        <span className="text-xs">Confirm Team</span>
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </Draggable>
      );
    }

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <div className="flex items-center space-x-2">
                {team.is_finalized && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    Finalized
                  </Badge>
                )}
                {(() => {
                  const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                  const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                  const totalMembers = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                  if (totalMembers === 1) {
                    return (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                        Solo → Library
                      </Badge>
                    );
                  }
                  return null;
                })()}
                {team.confirmed ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Unconfirmed
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{team.room || 'Unassigned'}</span>
              </Badge>
              <Badge variant="secondary">
                {(() => {
                  const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                  const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                  return leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                })()}/4 members
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{team.leader_profile.full_name}</span>
              <Crown className="w-4 h-4 text-yellow-500" />
            </div>

            <div className="space-y-1 mb-3">
              {team.members.filter(member => member.status === 'accepted').map((member) => (
                <div key={member.id} className="flex items-center justify-between text-sm">
                  <span>{member.profile.full_name}</span>
                  <Badge variant="secondary" className="text-xs">Member</Badge>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center space-x-1"
                onClick={() => {
                  setEditingTeam(team.id);
                  setNotificationTitle('');
                  setNotificationMessage('');
                }}
              >
                <Edit className="w-3 h-3" />
                <span>Edit</span>
              </Button>

              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center space-x-1"
                onClick={() => {
                  setInvitingTeam(team.id);
                  setInviteEmails(['']);
                }}
              >
                <UserPlus className="w-3 h-3" />
                <span>Invite</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => confirmTeamPlacement(team.id)}
                className={`flex items-center space-x-1 ${
                  team.confirmed 
                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' 
                    : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'
                }`}
              >
                {team.confirmed ? (
                  <>
                    <XCircle className="w-3 h-3" />
                    <span>Remove Confirmation</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Confirm</span>
                  </>
                )}
              </Button>

              <Dialog open={showDeleteDialog === team.id} onOpenChange={(open) => setShowDeleteDialog(open ? team.id : null)}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="flex items-center space-x-1">
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Team</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{team.name}"? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(null)} disabled={deletingTeam === team.id}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => deleteTeam(team.id)} disabled={deletingTeam === team.id}>
                      {deletingTeam === team.id ? 'Deleting...' : 'Delete Team'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RoomColumn = ({ room }: { room: RoomData }) => (
    <Card className="mb-6 min-h-[400px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            <span>{room.name}</span>
          </div>
          <Badge 
            variant={
              room.teams.length >= room.maxTeams && room.maxTeams !== 999 
                ? "destructive" 
                : room.teams.length > 0 
                ? "default" 
                : "secondary"
            }
          >
            {room.teams.length}/{room.maxTeams === 999 ? '∞' : room.maxTeams}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Droppable droppableId={room.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[300px] p-3 rounded-lg transition-all duration-200 ${
                snapshot.isDraggingOver 
                  ? 'bg-primary/10 border-2 border-primary border-dashed shadow-inner' 
                  : 'bg-muted/30 border-2 border-transparent'
              }`}
            >
              {room.teams.map((team, index) => (
                <TeamCard key={team.id} team={team} index={index} isInRoomView={true} />
              ))}
              {provided.placeholder}
              {room.teams.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-2">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <span>Drop teams here</span>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">
            {viewMode === 'rooms' 
              ? 'Drag and drop teams to assign them to different rooms' 
              : 'Manage teams, invite members, and assign rooms'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
            <Button
              size="sm"
              variant={viewMode === 'rooms' ? 'default' : 'ghost'}
              onClick={() => setViewMode('rooms')}
              className="text-xs"
            >
              Room View
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="text-xs"
            >
              List View
            </Button>
          </div>
          <Button 
            onClick={loadTeams} 
            disabled={updating}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{teams.length}</p>
                <p className="text-sm text-muted-foreground">Total Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.room && t.room !== '').length}
                </p>
                <p className="text-sm text-muted-foreground">Assigned Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teams.filter(t => !t.room || t.room === '').length}
                </p>
                <p className="text-sm text-muted-foreground">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.confirmed).length}
                </p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'rooms' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map(room => (
              <RoomColumn key={room.id} room={room} />
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="space-y-4">
          {teams.map((team, index) => (
            <TeamCard key={team.id} team={team} index={index} isInRoomView={false} />
          ))}
        </div>
      )}

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

      {updating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Updating team assignment...</span>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => setEditingTeam(open ? editingTeam : null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team: {teams.find(t => t.id === editingTeam)?.name}</DialogTitle>
            <DialogDescription>
              Update team room assignment and send notifications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Room Assignment</Label>
              {(() => {
                const team = teams.find(t => t.id === editingTeam);
                if (team) {
                  const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                  const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                  const totalMembers = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                  
                  if (totalMembers === 1) {
                    return (
                      <div>
                        <Alert>
                          <MapPin className="h-4 w-4" />
                          <AlertDescription>
                            Single-member teams are automatically assigned to the Library and cannot be moved.
                          </AlertDescription>
                        </Alert>
                        {team.room !== 'Library' && (
                          <Button
                            onClick={() => updateTeamRoom(editingTeam, 'Library')}
                            className="mt-2"
                            size="sm"
                          >
                            Assign to Library
                          </Button>
                        )}
                      </div>
                    );
                  }
                }
                
                return (
                  <Select
                    value={teams.find(t => t.id === editingTeam)?.room || 'unassigned'}
                    onValueChange={(value) => updateTeamRoom(editingTeam, value === 'unassigned' ? '' : value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {ROOMS.filter(r => r.id !== 'unassigned').map((room) => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
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
                onClick={() => {
                  const team = teams.find(t => t.id === editingTeam);
                  if (team) sendTeamNotification(team);
                }}
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

      {/* Invite Team Members Dialog */}
      <Dialog open={!!invitingTeam} onOpenChange={(open) => setInvitingTeam(open ? invitingTeam : null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite Members to {teams.find(t => t.id === invitingTeam)?.name}</DialogTitle>
            <DialogDescription>
              Add up to 3 team members by entering their email addresses. Only users who are checked in to the event can be invited to teams.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Team Member Emails</Label>
              {inviteEmails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => updateEmailField(index, e.target.value)}
                    type="email"
                  />
                  {inviteEmails.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeEmailField(index)}
                    >
                      <UserX className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addEmailField}
                  disabled={inviteEmails.length >= 3}
                  className="flex items-center space-x-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Add Email ({inviteEmails.length}/3)</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => inviteToTeam(invitingTeam)}
                  className="flex items-center space-x-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>Send Invites</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeams;