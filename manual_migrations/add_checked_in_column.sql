-- Add checked_in column to registrations table
-- This migration adds check-in functionality to track which users have physically arrived at the event

-- Add the checked_in column
ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE;

-- Add an index for better performance when filtering by check-in status
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON public.registrations(checked_in);

-- Add a comment to document the column
COMMENT ON COLUMN public.registrations.checked_in IS 'Indicates whether the participant has been checked in at the event';

-- Optional: Add a policy to ensure only admins can update check-in status
-- This prevents users from checking themselves in
CREATE POLICY IF NOT EXISTS "Only admins can update check-in status" ON public.registrations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN (
                SELECT email FROM public.admin_users WHERE is_active = true
            )
        )
    );
