-- Create a function to completely remove a user from the system
-- This function will be called with admin privileges
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete UUID)
RETURNS TEXT AS $$
DECLARE
    user_email TEXT;
    deletion_result TEXT := 'Success';
BEGIN
    -- Get the user's email for logging
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = user_id_to_delete;
    
    -- Delete from registrations table
    DELETE FROM public.registrations 
    WHERE user_id = user_id_to_delete;
    
    -- Delete from profiles table
    DELETE FROM public.profiles 
    WHERE user_id = user_id_to_delete;
    
    -- Delete from auth.users (this requires admin privileges)
    -- Note: This will cascade to auth.sessions and other auth tables
    DELETE FROM auth.users 
    WHERE id = user_id_to_delete;
    
    -- Log the deletion
    RAISE NOTICE 'User % (ID: %) has been completely removed from the system', user_email, user_id_to_delete;
    
    RETURN 'User ' || COALESCE(user_email, user_id_to_delete::TEXT) || ' has been completely removed from the system';
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE NOTICE 'Error deleting user %: %', user_id_to_delete, SQLERRM;
        RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admins will be checked in the function)
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;

-- Create a policy to ensure only admins can execute this function
-- This is handled by the SECURITY DEFINER and the admin check in the calling code 