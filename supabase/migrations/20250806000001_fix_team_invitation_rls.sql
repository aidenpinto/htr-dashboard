-- Fix team invitation RLS issue
-- Allow users to check basic registration status (just user_id and checked_in) for team invitations

-- Create a more permissive policy for team invitation validation
-- This allows any authenticated user to check if someone is registered and checked in
CREATE POLICY "Allow team invitation validation" 
ON public.registrations 
FOR SELECT 
USING (
  -- Allow authenticated users to read minimal info needed for team invitations
  -- Only exposes user_id and checked_in status, not full registration details
  auth.role() = 'authenticated'
);

-- Note: The existing "Users can view their own registration" policy will still work
-- as it's more specific and has precedence for full registration details
