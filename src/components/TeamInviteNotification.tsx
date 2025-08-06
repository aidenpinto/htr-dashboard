import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckinStatus } from '@/hooks/use-checkin-status';
import { Users, UserCheck, UserX, Crown } from 'lucide-react';

interface TeamInvite {
  id: string;
  team_id: string;
  inviter_id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface TeamInviteNotificationProps {
  invite: TeamInvite;
  onRespond: () => void;
}

const TeamInviteNotification = ({ invite, onRespond }: TeamInviteNotificationProps) => {
  const { user } = useAuth();
  const { isCheckedIn } = useCheckinStatus();
  const { toast } = useToast();
  const [responding, setResponding] = useState(false);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [inviterInfo, setInviterInfo] = useState<any>(null);

  // Load team and inviter info
  React.useEffect(() => {
    const loadInviteInfo = async () => {
      try {
        // Get team info
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .eq('id', invite.team_id)
          .single();

        // Get inviter info
        const { data: inviter } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', invite.inviter_id)
          .single();

        setTeamInfo(team);
        setInviterInfo(inviter);
      } catch (error) {
        console.error('Error loading invite info:', error);
      }
    };

    loadInviteInfo();
  }, [invite]);

  const respondToInvite = async (status: 'accepted' | 'declined') => {
    if (!isCheckedIn) {
      toast({
        title: "Access Denied",
        description: "You must be checked in to the event to respond to team invites.",
        variant: "destructive"
      });
      return;
    }

    setResponding(true);
    try {
      // Update invite status
      await supabase
        .from('team_invites')
        .update({ status })
        .eq('id', invite.id);

      if (status === 'accepted') {
        // Add user as team member
        await supabase
          .from('team_members')
          .insert({
            team_id: invite.team_id,
            user_id: user?.id,
            status: 'accepted'
          });

        toast({
          title: "Success",
          description: `You've joined ${teamInfo?.name || 'the team'}!`,
        });
      } else {
        toast({
          title: "Invite Declined",
          description: "You've declined the team invitation.",
        });
      }

      onRespond(); // Refresh the parent component
    } catch (error) {
      console.error('Error responding to invite:', error);
      toast({
        title: "Error",
        description: "Failed to respond to invite",
        variant: "destructive"
      });
    } finally {
      setResponding(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Team Invitation</span>
          </div>
          <Badge variant="secondary" className="self-start sm:ml-auto">
            Action Required
          </Badge>
        </CardTitle>
        <CardDescription>
          You've been invited to join a team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 sm:space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <span className="font-medium">Team:</span>
            <span className="text-lg font-bold break-words">{teamInfo?.name || 'Loading...'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <span className="text-sm text-muted-foreground">Invited by:</span>
            <span className="text-sm break-words">{inviterInfo?.full_name || 'Loading...'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={teamInfo?.is_finalized ? "default" : "secondary"} className="self-start sm:self-auto">
              {teamInfo?.is_finalized ? "Finalized" : "Not Finalized"}
            </Badge>
          </div>
          {teamInfo?.room && teamInfo.room !== 'TBD' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <span className="text-sm text-muted-foreground">Room:</span>
              <span className="text-sm break-words">{teamInfo.room}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-4">
          <Button
            onClick={() => respondToInvite('accepted')}
            disabled={responding || !isCheckedIn}
            className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 min-h-[44px]"
          >
            <UserCheck className="w-4 h-4" />
            <span>Accept Invite</span>
          </Button>
          <Button
            onClick={() => respondToInvite('declined')}
            disabled={responding || !isCheckedIn}
            variant="destructive"
            className="flex-1 flex items-center justify-center space-x-2 min-h-[44px]"
          >
            <UserX className="w-4 h-4" />
            <span>Decline Invite</span>
          </Button>
        </div>

        {!isCheckedIn && (
          <div className="text-xs text-orange-600 text-center leading-relaxed bg-orange-50 p-2 rounded">
            You must be checked in to the event to respond to team invitations.
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center leading-relaxed">
          You must respond to this invitation to continue using the dashboard.
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamInviteNotification; 