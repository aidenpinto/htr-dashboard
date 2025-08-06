-- Add checked_in column to registrations table
ALTER TABLE public.registrations 
ADD COLUMN checked_in BOOLEAN NOT NULL DEFAULT FALSE;

-- Add an index for better performance when filtering by check-in status
CREATE INDEX idx_registrations_checked_in ON public.registrations(checked_in);

-- Add a comment to document the column
COMMENT ON COLUMN public.registrations.checked_in IS 'Indicates whether the participant has been checked in at the event';
