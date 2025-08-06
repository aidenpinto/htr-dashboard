import { supabase } from '@/integrations/supabase/client';

export const getRegistrationStatus = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('system_config' as any)
      .select('value')
      .eq('key', 'registration_open')
      .single();

    if (error) {
      console.error('Error checking registration status:', error);
      // Default to open if there's an error
      return true;
    }

    return (data as any)?.value === true;
  } catch (error) {
    console.error('Error checking registration status:', error);
    // Default to open if there's an error
    return true;
  }
};
