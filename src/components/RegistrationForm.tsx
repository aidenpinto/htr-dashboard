import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, UserPlus } from 'lucide-react';

const RegistrationForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    university: '',
    year_of_study: '',
    github_username: '',
    experience_level: '',
    team_name: '',
    dietary_restrictions: '',
    t_shirt_size: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    if (user) {
      checkRegistrationStatus();
    }
  }, [user]);

  const checkRegistrationStatus = async () => {
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setIsRegistered(true);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        university: data.university || '',
        year_of_study: data.year_of_study || '',
        github_username: data.github_username || '',
        experience_level: data.experience_level || '',
        team_name: data.team_name || '',
        dietary_restrictions: data.dietary_restrictions || '',
        t_shirt_size: data.t_shirt_size || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const registrationData = {
        user_id: user?.id,
        email: user?.email,
        ...formData,
      };

      if (isRegistered) {
        const { error } = await supabase
          .from('registrations')
          .update(registrationData)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: "Registration updated!",
          description: "Your registration has been successfully updated.",
        });
      } else {
        const { error } = await supabase
          .from('registrations')
          .insert([registrationData]);

        if (error) throw error;

        setIsRegistered(true);
        toast({
          title: "Registration complete!",
          description: "You're all set for Hack the Ridge!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isRegistered ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          <span>
            {isRegistered ? 'Update Registration' : 'Register for Hack the Ridge'}
          </span>
        </CardTitle>
        <CardDescription>
          {isRegistered 
            ? 'Update your registration details below.'
            : 'Complete your registration to participate in the hackathon.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="university">University/School</Label>
              <Input
                id="university"
                value={formData.university}
                onChange={(e) => handleInputChange('university', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year_of_study">Year of Study</Label>
              <Select onValueChange={(value) => handleInputChange('year_of_study', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high-school">High School</SelectItem>
                  <SelectItem value="freshman">Freshman</SelectItem>
                  <SelectItem value="sophomore">Sophomore</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_username">GitHub Username</Label>
              <Input
                id="github_username"
                value={formData.github_username}
                onChange={(e) => handleInputChange('github_username', e.target.value)}
                placeholder="@username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience_level">Experience Level *</Label>
              <Select onValueChange={(value) => handleInputChange('experience_level', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team_name">Team Name (if applicable)</Label>
              <Input
                id="team_name"
                value={formData.team_name}
                onChange={(e) => handleInputChange('team_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="t_shirt_size">T-Shirt Size</Label>
              <Select onValueChange={(value) => handleInputChange('t_shirt_size', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">XS</SelectItem>
                  <SelectItem value="s">S</SelectItem>
                  <SelectItem value="m">M</SelectItem>
                  <SelectItem value="l">L</SelectItem>
                  <SelectItem value="xl">XL</SelectItem>
                  <SelectItem value="2xl">2XL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
            <Textarea
              id="dietary_restrictions"
              value={formData.dietary_restrictions}
              onChange={(e) => handleInputChange('dietary_restrictions', e.target.value)}
              placeholder="Any dietary restrictions or allergies we should know about?"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-primary text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isRegistered ? 'Updating...' : 'Registering...'}
              </>
            ) : (
              isRegistered ? 'Update Registration' : 'Complete Registration'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RegistrationForm;