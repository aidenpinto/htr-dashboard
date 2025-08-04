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
    grade: '',
    school_name: '',
    hackathons_attended: '',
    dietary_restrictions: '',
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
        grade: data.grade || '',
        school_name: data.school_name || '',
        hackathons_attended: data.hackathons_attended || '',
        dietary_restrictions: data.dietary_restrictions || '',
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