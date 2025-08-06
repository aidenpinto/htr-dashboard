-- Enforce 15 character limit for team names
ALTER TABLE teams 
ALTER COLUMN name TYPE VARCHAR(15);

-- Add a check constraint to ensure team names don't exceed 15 characters
-- This is redundant with the VARCHAR(15) but provides better error messages
ALTER TABLE teams 
ADD CONSTRAINT check_team_name_length 
CHECK (LENGTH(name) <= 15 AND LENGTH(name) > 0);

-- Update any existing team names that exceed 15 characters
-- This will truncate them to 15 characters
UPDATE teams 
SET name = LEFT(name, 15) 
WHERE LENGTH(name) > 15;
