-- Script to automatically assign single-member teams to the Library
-- This handles existing teams that might not be properly assigned

-- Update single-member teams to be assigned to Library
UPDATE teams 
SET room = 'Library'
WHERE id IN (
  SELECT t.id 
  FROM teams t
  LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.status = 'accepted'
  GROUP BY t.id, t.leader_id
  HAVING COUNT(tm.id) <= 1  -- Either 0 accepted members (just leader) or 1 accepted member (leader is also member)
) 
AND (room IS NULL OR room = '' OR room = 'TBD');

-- Create a function to automatically assign single-member teams to Library on finalization
CREATE OR REPLACE FUNCTION auto_assign_single_member_teams()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the team being finalized has only one member
  IF NEW.is_finalized = true AND OLD.is_finalized = false THEN
    -- Count accepted members for this team
    IF (SELECT COUNT(*) FROM team_members WHERE team_id = NEW.id AND status = 'accepted') <= 1 THEN
      -- Single member team, assign to Library
      NEW.room = 'Library';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run the function when teams are updated
DROP TRIGGER IF EXISTS trigger_auto_assign_single_member_teams ON teams;
CREATE TRIGGER trigger_auto_assign_single_member_teams
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_single_member_teams();

-- Also create a trigger for when team members are removed
CREATE OR REPLACE FUNCTION check_team_member_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If a member is removed and team becomes single-member, and it's finalized, move to Library
  IF (SELECT COUNT(*) FROM team_members WHERE team_id = OLD.team_id AND status = 'accepted') <= 1 THEN
    UPDATE teams 
    SET room = 'Library'
    WHERE id = OLD.team_id 
    AND is_finalized = true 
    AND room != 'Library';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_team_member_count_on_delete ON team_members;
CREATE TRIGGER trigger_check_team_member_count_on_delete
  AFTER DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION check_team_member_count_on_delete();
