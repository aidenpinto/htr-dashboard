import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Loader2 } from 'lucide-react';

const AdminSystemSettings = () => {
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Use raw SQL to query system_config table
      const { data, error } = await supabase
        .from('system_config' as any)
        .select('value')
        .eq('key', 'registration_open')
        .single();

      if (error) throw error;
      
      setRegistrationOpen((data as any)?.value === true);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      // Default to true if there's an error loading
      setRegistrationOpen(true);
      toast({
        title: "Error loading settings",
        description: "Using default settings. " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (isOpen: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_config' as any)
        .update({ 
          value: isOpen,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('key', 'registration_open');

      if (error) throw error;

      setRegistrationOpen(isOpen);
      toast({
        title: "Settings updated",
        description: `Registration has been ${isOpen ? 'opened' : 'closed'}.`,
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>System Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>System Settings</span>
        </CardTitle>
        <CardDescription>
          Manage global system configuration and feature toggles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="registration-toggle" className="text-base font-medium">
              Registration Open
            </Label>
            <p className="text-sm text-muted-foreground">
              {registrationOpen 
                ? 'Participants can register and edit their registration details' 
                : 'Registration is closed. Participants cannot register or edit their details'}
            </p>
            {!registrationOpen && (
              <p className="text-xs text-orange-600 mt-1">
                Participants will see a message directing them to hi@hacktheridge.ca for inquiries
              </p>
            )}
          </div>
          <Switch
            id="registration-toggle"
            checked={registrationOpen}
            onCheckedChange={updateRegistrationStatus}
            disabled={saving}
          />
        </div>
        
        {saving && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Updating settings...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSystemSettings;
