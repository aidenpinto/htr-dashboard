import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, UserCheck, UserX, Crown, MapPin, CheckCircle, XCircle } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  leader_id: string;
  room: string;
  is_finalized: boolean;
  created_at: string;
  members: TeamMember[];
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

const TeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [invitingMembers, setInvitingMembers] = useState(false);
  const [finalizingTeam, setFinalizingTeam] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<string[]>([]);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>(['']);
  const [selectedRoom, setSelectedRoom] = useState('');

  useEffect(() => {
    if (user) {
      loadUserTeam();
      
      // Set up real-time updates
      const channel = supabase
        .channel('team_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teams'
          },
          () => {
            loadUserTeam();
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
            loadUserTeam();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadUserTeam = async () => {
    try {
      // Get team where user is a member
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          status,
          teams (
            id,
            name,
            leader_id,
            room,
            is_finalized,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'accepted')
        .single();

      if (teamError) {
        console.log('No team found for user:', teamError);
        setLoading(false);
        return;
      }

      if (teamMembers?.teams) {
        // Get team members
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            status
          `)
          .eq('team_id', teamMembers.teams.id);

        if (membersError) {
          console.error('Error loading team members:', membersError);
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
              status: member.status as 'pending' | 'accepted' | 'declined',
              profile: profile || { full_name: 'Unknown', email: 'unknown@example.com' }
            };
          })
        );

        setUserTeam({
          ...teamMembers.teams,
          members: memberProfiles || []
        });
      }
    } catch (error) {
      console.error('Error loading user team:', error);
    } finally {
      setLoading(false);
    }
  };



  const createTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a team name",
        variant: "destructive"
      });
      return;
    }

    if (teamName.trim().length > 15) {
      toast({
        title: "Error",
        description: "Team name must be 15 characters or less",
        variant: "destructive"
      });
      return;
    }

    setCreatingTeam(true);
    try {
      console.log('Creating team with user ID:', user?.id);
      
      // Create team - single member teams start with Library as default
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          leader_id: user?.id,
          room: 'TBD' // Will be set to Library when finalized if still single member
        })
        .select()
        .single();

      if (teamError) {
        console.error('Team creation error:', teamError);
        throw teamError;
      }

      console.log('Team created:', team);

      // Add leader as first member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user?.id,
          status: 'accepted'
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
        throw memberError;
      }

      toast({
        title: "Success",
        description: "Team created successfully!",
      });

      setTeamName('');
      loadUserTeam();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: `Failed to create team: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setCreatingTeam(false);
    }
  };

  const inviteMembers = async () => {
    const validEmails = inviteEmails.filter(email => email.trim()).map(email => email.trim());
    
    // Clear previous errors
    setInviteErrors([]);
    
    if (validEmails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one email address",
        variant: "destructive"
      });
      return;
    }

    if (!userTeam) return;

    setInvitingMembers(true);
    const errors: string[] = [];
    
    try {
      // Debug: Let's see what emails are in the profiles table
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('email')
        .limit(10);
      console.log('Available profiles:', allProfiles);
      // Check current member count
      const currentCount = userTeam.members.length;
      if (currentCount + validEmails.length > 4) {
        toast({
          title: "Error",
          description: "Teams can have a maximum of 4 members",
          variant: "destructive"
        });
        return;
      }

      // Check if users exist and are checked in before sending invites
      for (const email of validEmails) {
        console.log('Checking profile for email:', email);
        
        // Try to get the profile
        console.log('Looking for profile with email:', email);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, email')
          .eq('email', email)
          .single();

        console.log('Profile query result:', { profile, profileError });

        if (profileError) {
          console.error('Profile not found for email:', email, profileError);
          const errorMsg = `User with email ${email} not found. Make sure they have created an account on the platform.`;
          errors.push(errorMsg);
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive"
          });
          continue;
        }

        if (profile) {
          // Check if the user is registered and checked in
          console.log('Checking registration status for user_id:', profile.user_id);
          const { data: registration, error: regError } = await supabase
            .from('registrations')
            .select('checked_in')
            .eq('user_id', profile.user_id)
            .single();

          console.log('Registration query result:', { registration, regError });

          if (regError || !registration) {
            console.error('Registration not found for user:', email, regError);
            const errorMsg = `User ${email} is not registered for the event.`;
            errors.push(errorMsg);
            toast({
              title: "Error", 
              description: errorMsg,
              variant: "destructive"
            });
            continue;
          }

          // Check if user is checked in (handle case where column might not exist)
          const isCheckedIn = registration && 'checked_in' in registration 
            ? (registration as any).checked_in 
            : false;

          if (!isCheckedIn) {
            const errorMsg = `${email} has not been checked in to the event yet and cannot be invited to a team.`;
            errors.push(errorMsg);
            toast({
              title: "Error",
              description: errorMsg,
              variant: "destructive"
            });
            continue;
          }

          console.log('User is registered and checked in, proceeding with invite for:', email);

          console.log('Creating invite for:', email, 'user_id:', profile.user_id, 'team_id:', userTeam.id);
          
          // Try to create the invite
          console.log('Attempting to create invite with data:', {
            team_id: userTeam.id,
            inviter_id: user?.id,
            invitee_email: email
          });
          
          const { data: invite, error: inviteError } = await supabase
            .from('team_invites')
            .insert({
              team_id: userTeam.id,
              inviter_id: user?.id,
              invitee_email: email
            })
            .select()
            .single();

          console.log('Invite creation result:', { invite, inviteError });

          if (inviteError) {
            console.error('Error creating invite:', inviteError);
            const errorMsg = `Failed to invite ${email}: ${inviteError.message}`;
            errors.push(errorMsg);
            toast({
              title: "Error",
              description: errorMsg,
              variant: "destructive"
            });
          } else {
            console.log('Invite created successfully:', invite);
            toast({
              title: "Success",
              description: `Invite sent to ${email}`,
            });
          }
        }
      }

      // Update error state
      setInviteErrors(errors);

      // Only show success if there were no errors
      if (errors.length === 0) {
        toast({
          title: "Success",
          description: "All invites sent successfully!",
        });
        setInviteEmails(['']); // Reset to one empty field
      } else if (errors.length < validEmails.length) {
        toast({
          title: "Partial Success",
          description: "Some invites were sent successfully, but some failed. Check the errors below.",
          variant: "destructive"
        });
      }

      loadUserTeam(); // Refresh team data
    } catch (error) {
      console.error('Error inviting members:', error);
      const errorMsg = "Failed to send invites";
      setInviteErrors([errorMsg]);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setInvitingMembers(false);
    }
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const removeEmailField = (index: number) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index));
    }
  };

  const updateEmailField = (index: number, value: string) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = value;
    setInviteEmails(newEmails);
    
    // Clear invite errors when user starts typing
    if (inviteErrors.length > 0) {
      setInviteErrors([]);
    }
  };

  const finalizeTeam = async () => {
    if (!userTeam) return;

    // Check if team only has one member (the leader) - auto-assign to Library
    const acceptedMembers = userTeam.members.filter(m => m.status === 'accepted');
    const isSingleMemberTeam = acceptedMembers.length === 1;
    
    let roomToAssign = selectedRoom;
    if (isSingleMemberTeam) {
      roomToAssign = 'Library';
    } else if (!selectedRoom) {
      toast({
        title: "Error",
        description: "Please select a room",
        variant: "destructive"
      });
      return;
    }

    setFinalizingTeam(true);
    try {
      // Check room capacity (only for non-Library rooms or non-single-member teams)
      if (!isSingleMemberTeam) {
        const { data: roomCount } = await supabase
          .from('teams')
          .select('id', { count: 'exact' })
          .eq('room', roomToAssign)
          .eq('is_finalized', true);

        const currentCount = roomCount?.length || 0;
        const maxCapacity = roomToAssign === 'Library' ? 999 : 2;

        if (currentCount >= maxCapacity) {
          toast({
            title: "Error",
            description: `Room ${roomToAssign} is at full capacity`,
            variant: "destructive"
          });
          return;
        }
      }

      // Finalize team
      await supabase
        .from('teams')
        .update({
          room: roomToAssign,
          is_finalized: true
        })
        .eq('id', userTeam.id);

      toast({
        title: "Success",
        description: isSingleMemberTeam 
          ? "Team finalized and automatically assigned to the Library!"
          : "Team finalized successfully!",
      });

      loadUserTeam();
    } catch (error) {
      console.error('Error finalizing team:', error);
      toast({
        title: "Error",
        description: "Failed to finalize team",
        variant: "destructive"
      });
    } finally {
      setFinalizingTeam(false);
    }
  };



  const isTeamLeader = userTeam?.leader_id === user?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Note: Team invites are now handled in the main dashboard notification area */}

      {/* User's Team */}
      {userTeam ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>{userTeam.name}</span>
              {isTeamLeader && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Crown className="w-3 h-3" />
                  <span>Leader</span>
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {userTeam.is_finalized ? (
                <span className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalized - Room: {userTeam.room}</span>
                </span>
              ) : (
                <div className="space-y-1">
                  <span className="flex items-center space-x-2 text-yellow-600">
                    <XCircle className="w-4 h-4" />
                    <span>Not finalized</span>
                  </span>
                  {(() => {
                    const acceptedMembers = userTeam.members.filter(m => m.status === 'accepted');
                    const isSingleMemberTeam = acceptedMembers.length === 1;
                    if (isSingleMemberTeam) {
                      return (
                        <Badge variant="outline" className="text-xs">
                          Single member → Library assignment
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Team Members */}
            <div>
              <h4 className="font-medium mb-3">Team Members ({userTeam.members.length}/4)</h4>
              <div className="space-y-2">
                {userTeam.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.profile.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.profile.email}</p>
                    </div>
                    <Badge variant={member.status === 'accepted' ? 'default' : 'secondary'}>
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Actions */}
            {isTeamLeader && !userTeam.is_finalized && (
              <div className="space-y-4">
                {/* Invite Members */}
                <div className="space-y-2">
                  <Label>Invite Members</Label>
                  
                  {/* Display invitation errors */}
                  {inviteErrors.length > 0 && (
                    <Alert className="border-destructive">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <AlertDescription>
                        <div className="font-medium text-destructive mb-1">
                          Unable to invite the following users:
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {inviteErrors.map((error, index) => (
                            <li key={index} className="text-destructive">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    {inviteEmails.map((email, index) => (
                      <div key={index} className="flex space-x-2">
                        <Input
                          value={email}
                          onChange={(e) => updateEmailField(index, e.target.value)}
                          placeholder="email@example.com"
                          className="flex-1"
                        />
                        {inviteEmails.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEmailField(index)}
                            className="px-2"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEmailField}
                        disabled={inviteEmails.length >= 3}
                        className="flex items-center space-x-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add Another Email ({inviteEmails.length}/3)</span>
                      </Button>
                      <Button
                        onClick={inviteMembers}
                        disabled={invitingMembers || inviteEmails.every(email => !email.trim())}
                        className="flex items-center space-x-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Send Invites</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Finalize Team */}
                <div className="space-y-2">
                  {(() => {
                    const acceptedMembers = userTeam.members.filter(m => m.status === 'accepted');
                    const isSingleMemberTeam = acceptedMembers.length === 1;
                    
                    if (isSingleMemberTeam) {
                      return (
                        <div>
                          <Label>Room Assignment</Label>
                          <Alert className="mt-2">
                            <MapPin className="h-4 w-4" />
                            <AlertDescription>
                              Single-member teams are automatically assigned to the <strong>Library</strong>. No room selection needed.
                            </AlertDescription>
                          </Alert>
                          <Button
                            onClick={finalizeTeam}
                            disabled={finalizingTeam}
                            className="flex items-center space-x-1 mt-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Finalize Team (Library)</span>
                          </Button>
                        </div>
                      );
                    } else {
                      return (
                        <div>
                          <Label htmlFor="room-select">Select Room</Label>
                          <div className="flex space-x-2">
                            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a room" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROOM_OPTIONS.map((room) => (
                                  <SelectItem key={room} value={room}>
                                    {room}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={finalizeTeam}
                              disabled={finalizingTeam || !selectedRoom}
                              className="flex items-center space-x-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Finalize</span>
                            </Button>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            )}

            {userTeam.is_finalized && (
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Your team is finalized and assigned to room <strong>{userTeam.room}</strong>. 
                  No further changes can be made.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Create Team */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Create a Team</span>
            </CardTitle>
            <CardDescription>
              Create a team and invite up to 3 other members (4 total including you)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name (max 15 characters)</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                maxLength={15}
              />
              <div className="text-xs text-muted-foreground">
                {teamName.length}/15 characters
              </div>
            </div>
            <Button
              onClick={createTeam}
              disabled={creatingTeam || !teamName.trim()}
              className="flex items-center space-x-1"
            >
              <Users className="w-4 h-4" />
              <span>Create Team</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamManagement; 