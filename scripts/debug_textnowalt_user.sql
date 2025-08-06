-- Debug script to check user registration status
-- Run this in Supabase SQL Editor to diagnose the issue with textnowalt1234@gmail.com

-- 1. Check if the user exists in profiles table
SELECT 'Profiles table check:' as check_type;
SELECT user_id, email, full_name, created_at 
FROM profiles 
WHERE email = 'textnowalt1234@gmail.com';

-- 2. Check if the user exists in registrations table
SELECT 'Registrations table check:' as check_type;
SELECT user_id, email, full_name, checked_in, registered_at 
FROM registrations 
WHERE email = 'textnowalt1234@gmail.com';

-- 3. Check by user_id (in case there's a mismatch)
SELECT 'Registration by user_id check:' as check_type;
SELECT r.user_id, r.email, r.full_name, r.checked_in, r.registered_at 
FROM registrations r
WHERE r.user_id = (
    SELECT user_id 
    FROM profiles 
    WHERE email = 'textnowalt1234@gmail.com'
    LIMIT 1
);

-- 4. Check all registrations count (to verify we can read the table)
SELECT 'Total registrations count:' as check_type;
SELECT COUNT(*) as total_registrations FROM registrations;

-- 5. Check checked-in users count
SELECT 'Checked-in users count:' as check_type;
SELECT COUNT(*) as checked_in_count 
FROM registrations 
WHERE checked_in = true;

-- 6. Check if there are any RLS policy issues by checking a sample
SELECT 'Sample registrations (first 3):' as check_type;
SELECT user_id, email, full_name, checked_in 
FROM registrations 
ORDER BY registered_at DESC 
LIMIT 3;

-- 7. Check current user context (to see if RLS is affecting queries)
SELECT 'Current auth context:' as check_type;
SELECT auth.uid() as current_user_id;

-- 8. Check if current user is admin
SELECT 'Admin check:' as check_type;
SELECT is_admin 
FROM profiles 
WHERE user_id = auth.uid();
