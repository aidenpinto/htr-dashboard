-- Fix RLS policies for team_invites table
-- Run this in your Supabase SQL Editor

-- First, let's check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'team_invites';

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can view invites sent to them" ON team_invites;
DROP POLICY IF EXISTS "Team leaders can manage invites" ON team_invites;

-- Create simpler, more permissive policies for testing
CREATE POLICY "Allow all operations on team_invites" ON team_invites
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON team_invites TO authenticated;

-- Test if we can insert (this should work now)
-- You can test this by trying to create an invite in the app 