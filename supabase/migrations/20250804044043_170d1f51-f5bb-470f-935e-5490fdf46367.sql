-- Add missing fields to registrations table for hackathon registration
ALTER TABLE public.registrations 
ADD COLUMN grade text,
ADD COLUMN school_name text,
ADD COLUMN hackathons_attended integer DEFAULT 0,
ADD COLUMN school_name_other text,
ADD COLUMN dietary_restrictions_other text;

-- Update existing registrations to have default values
UPDATE public.registrations 
SET hackathons_attended = 0 
WHERE hackathons_attended IS NULL;