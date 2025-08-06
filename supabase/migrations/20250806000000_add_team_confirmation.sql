-- Add confirmed field to teams table for admin confirmation
-- This is separate from is_finalized which indicates participant can't make changes

ALTER TABLE teams ADD COLUMN confirmed BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX idx_teams_confirmed ON teams(confirmed);
