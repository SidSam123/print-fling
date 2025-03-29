import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

type UserRedirectProps = {
  children: React.ReactNode;
  requiredRole: UserRole | null;
  redirectTo?: string;
};

const UserRedirect: React.FC<UserRedirectProps> = ({ 
  children, 
  requiredRole = null, 
  redirectTo = '/auth' 
}) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Memoize the redirect function to avoid recreating it on every render
  const redirectBasedOnRole = useCallback((role: UserRole) => {
    // Don't redirect if already redirecting
    if (isRedirecting) return;
    
    console.log(`Redirecting based on role: ${role}`);
    
    // Check if we're already on the appropriate dashboard
    const currentPath = location.pathname;
    const targetPath = `/${role}-dashboard`;
    
    if (currentPath === targetPath) {
      console.log(`Already on correct dashboard: ${targetPath}`);
      return; // Already on the correct page
    }
    
    setIsRedirecting(true);
    
    // Navigate instead of window.location for smoother transitions
    navigate(targetPath, { replace: true });
  }, [location.pathname, navigate, isRedirecting]);

  // Handle auth state and redirects
  useEffect(() => {
    let mounted = true;

    const handleRedirects = () => {
      if (loading) return;
      
      console.log(`UserRedirect: handling redirects. User:`, user?.id ? `User ${user.id}` : 'No user', 
                  `Required role: ${requiredRole || 'none'}, Current path: ${location.pathname}`);
      
      // If we're on the auth page (requiredRole is null) and user is logged in,
      // redirect to their appropriate dashboard
      if (requiredRole === null && user) {
        console.log(`Logged in user on auth page, redirecting based on role: ${user.role}`);
        redirectBasedOnRole(user.role);
        return;
      }
      
      // If a role is required and no user is logged in, redirect to auth
      if (requiredRole !== null && !user) {
        console.log(`Role required but no user logged in, redirecting to: ${redirectTo}`);
        setIsRedirecting(true);
        navigate(redirectTo, { replace: true });
        return;
      }
      
      // If user doesn't have required role, redirect to their appropriate dashboard
      if (user && requiredRole !== null && user.role !== requiredRole) {
        console.log(`User has incorrect role (${user.role}, needs ${requiredRole}), redirecting`);
        redirectBasedOnRole(user.role);
      }
      
      // If we got here, auth check is complete
      if (mounted) {
        setAuthChecked(true);
      }
    };

    // Run immediately if auth is already loaded
    if (!loading) {
      handleRedirects();
    } else {
      // Set a short timeout to avoid flashing loading state for quick auth responses
      const timeoutId = setTimeout(() => {
        if (mounted && !authChecked) {
          handleRedirects();
        }
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }

    return () => {
      mounted = false;
    };
  }, [user, loading, requiredRole, redirectTo, redirectBasedOnRole, location.pathname, navigate, authChecked]);

  // Show optimized loading UI or render children
  if (loading && !authChecked && !isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Keep navbar space */}
        <div className="h-16 w-full">
          <Skeleton className="h-16 w-full" />
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-md h-12 w-12 border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show children once auth is verified or if authChecked is true
  return <>{children}</>;
};

export default UserRedirect;
