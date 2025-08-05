-- ========================================
-- REMOVE TEAM MANAGEMENT SYSTEM
-- ========================================

-- Remove from realtime publication first
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.team_rooms;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.team_members;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.teams;

-- Drop all team-related tables (CASCADE will remove all dependencies)
DROP TABLE IF EXISTS public.team_rooms CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- Drop team-related functions
DROP FUNCTION IF EXISTS check_team_size_limit();
DROP FUNCTION IF EXISTS check_room_capacity();

-- ========================================
-- TEAM MANAGEMENT SYSTEM REMOVED!
-- ======================================== 