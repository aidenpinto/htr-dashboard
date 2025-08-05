-- Test script for team invites
-- Run this in your Supabase SQL Editor to check if everything is working

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_members', 'team_invites', 'profiles');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('teams', 'team_members', 'team_invites');

-- Check if we can insert into team_invites (this will fail if RLS is blocking)
-- First, let's get a real team ID and user ID
SELECT 'Available teams:' as info;
SELECT id, name, leader_id FROM teams LIMIT 5;

SELECT 'Available users:' as info;
SELECT user_id, email FROM profiles LIMIT 5;

-- Now let's try to insert with real data (uncomment and modify the line below with real IDs)
-- INSERT INTO team_invites (team_id, inviter_id, invitee_email)
-- VALUES ('actual-team-id-here', 'actual-user-id-here', 'test@example.com')
-- ON CONFLICT DO NOTHING;

-- Check existing team_invites
SELECT * FROM team_invites LIMIT 5;

-- Check existing profiles
SELECT email FROM profiles LIMIT 10; 