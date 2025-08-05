-- Test manual invite insertion
-- Run this in your Supabase SQL Editor

-- First, let's get a team ID
SELECT 'Available teams:' as info;
SELECT id, name FROM teams LIMIT 3;

-- Now let's try to insert a test invite
-- Replace 'TEAM_ID_HERE' with an actual team ID from the query above
INSERT INTO team_invites (team_id, inviter_id, invitee_email)
VALUES ('TEAM_ID_HERE', 'd0bf54ef-0875-400d-91e0-e7492f227be5', 'textnowalt1234@gmail.com')
RETURNING *;

-- Check if the invite was created
SELECT * FROM team_invites WHERE invitee_email = 'textnowalt1234@gmail.com'; 