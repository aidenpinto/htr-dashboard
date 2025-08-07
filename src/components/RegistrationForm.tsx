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
import { Loader2, CheckCircle, UserPlus, Lock, Mail } from 'lucide-react';
import { getRegistrationStatus } from '@/lib/registration-utils';

const RegistrationForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    grade: '',
    school_name: '',
    hackathons_attended: '',
    dietary_restrictions: '',
    school_name_other: '',
    dietary_restrictions_other: '',
  });

  useEffect(() => {
    if (user) {
      checkRegistrationStatus();
      checkSystemRegistrationStatus();
    }
  }, [user]);

  const checkSystemRegistrationStatus = async () => {
    setCheckingStatus(true);
    try {
      const isOpen = await getRegistrationStatus();
      setRegistrationOpen(isOpen);
    } catch (error) {
      console.error('Error checking registration status:', error);
      setRegistrationOpen(true); // Default to open
    } finally {
      setCheckingStatus(false);
    }
  };

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
        grade: data.grade || '',
        school_name: data.school_name || '',
        hackathons_attended: data.hackathons_attended?.toString() || '',
        dietary_restrictions: data.dietary_restrictions || '',
        school_name_other: data.school_name_other || '',
        dietary_restrictions_other: data.dietary_restrictions_other || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if registration is still open before allowing submission
    const isOpen = await getRegistrationStatus();
    if (!isOpen) {
      toast({
        title: "Registration Closed",
        description: "Registration is currently closed. Please contact hi@hacktheridge.ca for additional inquiries.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        user_id: user?.id,
        email: user?.email,
        full_name: formData.full_name,
        grade: formData.grade,
        school_name: formData.school_name,
        hackathons_attended: parseInt(formData.hackathons_attended) || 0,
        dietary_restrictions: formData.dietary_restrictions,
        school_name_other: formData.school_name_other,
        dietary_restrictions_other: formData.dietary_restrictions_other,
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

  // Show loading state while checking registration status
  if (checkingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Show registration closed message
  if (!registrationOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-orange-600" />
            <span>Registration Closed</span>
          </CardTitle>
          <CardDescription>
            Registration is currently closed and participants cannot register or edit their registration details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/50">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Have additional inquiries?</p>
              <p className="text-sm text-muted-foreground">
                Please email us at{' '}
                <a 
                  href="mailto:hi@hacktheridge.ca" 
                  className="text-primary hover:underline"
                >
                  hi@hacktheridge.ca
                </a>
              </p>
            </div>
          </div>
          {isRegistered && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-medium text-green-800 dark:text-green-200">
                  You are already registered for Hack the Ridge!
                </p>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your registration is saved and you're all set for the event.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

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
          <div className="grid grid-cols-1 gap-4">
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
              <Label htmlFor="grade">Grade *</Label>
              <Select value={formData.grade} onValueChange={(value) => handleInputChange('grade', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elementary-6-8">Elementary 6-8</SelectItem>
                  <SelectItem value="9">9</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="11">11</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_name">School Name *</Label>
              <Select value={formData.school_name} onValueChange={(value) => handleInputChange('school_name', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iroquois-ridge-high-school">Iroquois Ridge High School</SelectItem>
                  <SelectItem value="white-oaks-secondary-school">White Oaks Secondary School</SelectItem>
                  <SelectItem value="abbey-park-high-school">Abbey Park High School</SelectItem>
                  <SelectItem value="oakville-trafalgar-high-school">Oakville Trafalgar High School</SelectItem>
                  <SelectItem value="ta-blakelock-high-school">TA Blakelock High School</SelectItem>
                  <SelectItem value="garth-webb-secondary-school">Garth Webb Secondary School</SelectItem>
                  <SelectItem value="joshua-creek-public-school">Joshua Creek Public School</SelectItem>
                  <SelectItem value="falgarwood-public-school">Falgarwood Public School</SelectItem>
                  <SelectItem value="wh-morden-public-school">W.H. Morden Public School</SelectItem>
                  <SelectItem value="munns-public-school">Munn's Public School</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {formData.school_name === 'other' && (
                <Input
                  placeholder="Enter your school name"
                  value={formData.school_name_other || ''}
                  onChange={(e) => handleInputChange('school_name_other', e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hackathons_attended">Number of Hackathons Attended *</Label>
              <Input
                id="hackathons_attended"
                type="number"
                min="0"
                value={formData.hackathons_attended}
                onChange={(e) => handleInputChange('hackathons_attended', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietary_restrictions">Dietary Restrictions *</Label>
              <Select value={formData.dietary_restrictions} onValueChange={(value) => handleInputChange('dietary_restrictions', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dietary restrictions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="kosher">Kosher</SelectItem>
                  <SelectItem value="gluten-free">Gluten Free</SelectItem>
                  <SelectItem value="halal">Halal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {formData.dietary_restrictions === 'other' && (
                <Input
                  placeholder="Please specify dietary restrictions"
                  value={formData.dietary_restrictions_other || ''}
                  onChange={(e) => handleInputChange('dietary_restrictions_other', e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-primary text-white"
            disabled={loading || !registrationOpen}
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