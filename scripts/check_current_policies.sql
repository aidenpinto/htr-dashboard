-- Check current RLS policies
-- Run this in your Supabase SQL Editor

-- Check all policies for team_invites
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'team_invites';

-- Check if we can query team_invites
SELECT COUNT(*) as invite_count FROM team_invites;

-- Check if we can query profiles
SELECT COUNT(*) as profile_count FROM profiles;

-- Check a specific profile
SELECT * FROM profiles WHERE email = 'textnowalt1234@gmail.com';

-- Check if we can insert into team_invites (this will help identify the issue)
-- First, let's get a real team ID
SELECT id, name FROM teams LIMIT 1;

-- And a real user ID
SELECT user_id, email FROM profiles WHERE email = 'weirdalt1234@gmail.com' LIMIT 1; 