-- Fix RLS policies for profiles table to allow team invite functionality
-- Run this in your Supabase SQL Editor

-- Check current policies for profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Add a policy to allow authenticated users to query profiles by email
-- This is needed for team invite functionality
CREATE POLICY "Users can view profiles for team invites" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Alternatively, if you want to be more restrictive and only allow 
-- team leaders to query profiles, you can use this policy instead:
-- 
-- CREATE POLICY "Team leaders can view profiles for invites" 
-- ON public.profiles 
-- FOR SELECT 
-- USING (
--   EXISTS (
--     SELECT 1 FROM teams 
--     WHERE leader_id = auth.uid()
--   )
-- );

-- Grant necessary permissions
GRANT SELECT ON profiles TO authenticated;

-- Test the fix
SELECT email FROM profiles WHERE email = 'textnowalt1234@gmail.com';
