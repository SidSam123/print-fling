
import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';

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

  // Memoize the redirect function to avoid recreating it on every render
  const redirectBasedOnRole = useCallback((role: UserRole) => {
    console.log(`Redirecting based on role: ${role}`);
    
    // Check if we're already on the appropriate dashboard
    const currentPath = location.pathname;
    const targetPath = `/${role}-dashboard`;
    
    if (currentPath === targetPath) {
      console.log(`Already on correct dashboard: ${targetPath}`);
      return; // Already on the correct page
    }
    
    // Use window.location for a full page refresh to ensure clean state
    window.location.href = targetPath;
  }, [location.pathname]);

  // Handle auth state and redirects
  useEffect(() => {
    let mounted = true;

    const handleRedirects = () => {
      if (loading) return;

      if (!mounted) return;
      
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
        window.location.href = redirectTo; // Use window.location for clean refresh
        return;
      }
      
      // If user doesn't have required role, redirect to their appropriate dashboard
      if (user && requiredRole !== null && user.role !== requiredRole) {
        console.log(`User has incorrect role (${user.role}, needs ${requiredRole}), redirecting`);
        redirectBasedOnRole(user.role);
      }
    };

    // Small timeout to ensure auth state is fully initialized
    const timeoutId = setTimeout(() => {
      if (mounted) {
        handleRedirects();
      }
    }, 50);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [user, loading, requiredRole, redirectTo, redirectBasedOnRole, location.pathname]);

  // Show loading or render children
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-md h-12 w-12 border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default UserRedirect;
