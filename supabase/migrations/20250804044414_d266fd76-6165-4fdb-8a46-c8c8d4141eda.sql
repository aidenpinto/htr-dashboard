-- Create a security definer function to check if current user is admin
-- This bypasses RLS policies to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate the policy using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_current_user_admin());

-- Also update the registrations policy to use the same function
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.registrations;

CREATE POLICY "Admins can view all registrations" 
ON public.registrations 
FOR ALL 
USING (public.is_current_user_admin());

-- Update notifications policy as well
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;

CREATE POLICY "Admins can manage notifications" 
ON public.notifications 
FOR ALL 
USING (public.is_current_user_admin());

-- Update schedule policy 
DROP POLICY IF EXISTS "Admins can manage schedule" ON public.schedule;

CREATE POLICY "Admins can manage schedule" 
ON public.schedule 
FOR ALL 
USING (public.is_current_user_admin());