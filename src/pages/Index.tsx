import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect unauthenticated users to auth page
  return <Navigate to="/auth" replace />;
};

export default Index;
