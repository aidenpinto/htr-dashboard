-- Add read_by field to track which users have read global notifications
ALTER TABLE public.notifications ADD COLUMN read_by JSONB DEFAULT '[]'::jsonb;
