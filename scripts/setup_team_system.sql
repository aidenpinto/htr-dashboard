-- Team Management System Setup
-- Run this in your Supabase SQL Editor

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room VARCHAR(50) NOT NULL,
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create team_invites table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_room ON teams(room);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_invitee_email ON team_invites(invitee_email);

-- Create function to check if user is team leader
CREATE OR REPLACE FUNCTION is_team_leader(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_uuid AND leader_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get team members count
CREATE OR REPLACE FUNCTION get_team_members_count(team_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM team_members 
    WHERE team_id = team_uuid AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if room has capacity
CREATE OR REPLACE FUNCTION check_room_capacity(room_name VARCHAR, team_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_capacity INTEGER;
BEGIN
  -- Get current team count in room
  SELECT COUNT(*) INTO current_count
  FROM teams 
  WHERE room = room_name AND is_finalized = TRUE;
  
  -- If updating existing team, exclude it from count
  IF team_id IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM teams 
    WHERE room = room_name AND is_finalized = TRUE AND id != team_id;
  END IF;
  
  -- Set max capacity based on room
  IF room_name = 'Library' THEN
    max_capacity := 999; -- Unlimited for Library
  ELSE
    max_capacity := 2; -- 2 teams per room for others
  END IF;
  
  RETURN current_count < max_capacity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they are members of" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id AND user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Team leaders can update their teams" ON teams
  FOR UPDATE USING (leader_id = auth.uid());

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (leader_id = auth.uid());

-- Team members policies
CREATE POLICY "Users can view team members of teams they belong to" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm2
      WHERE tm2.team_id = team_members.team_id AND tm2.user_id = auth.uid() AND tm2.status = 'accepted'
    )
  );

CREATE POLICY "Team leaders can manage team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_members.team_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own team membership" ON team_members
  FOR UPDATE USING (user_id = auth.uid());

-- Team invites policies
CREATE POLICY "Users can view invites sent to them" ON team_invites
  FOR SELECT USING (
    invitee_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Team leaders can manage invites" ON team_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_invites.team_id AND leader_id = auth.uid()
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON teams TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON team_invites TO authenticated; 