
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define user roles
export type UserRole = 'customer' | 'shopkeeper' | 'admin';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

// Hook for using the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Supabase profiles
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('Logging out...');
      
      // Clear user state first for immediate UI feedback
      setUser(null);
      
      // Clear Supabase session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }
      
      console.log('Supabase signOut completed');
      
      // Force clear all storage mechanisms
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach((cookie) => {
          document.cookie = cookie
            .replace(/^ +/, "")
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
        });
        
        console.log('Storage cleared');
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }

      // Navigate to auth page with a small delay to ensure cleanup is complete
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    } catch (error: any) {
      console.error('Logout failed:', error);
      
      // Even if there's an error, ensure we clean up
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Force redirect to auth page
      window.location.href = '/auth';
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && mounted) {
          console.log('Session found:', session.user.id);
          const profile = await fetchUserProfile(session.user.id);
          
          if (profile && mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: profile.name || '',
              role: profile.role as UserRole,
            });
            console.log('User profile loaded:', profile.name, profile.role);
          }
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          // Use timeout to prevent race conditions
          timeoutId = setTimeout(() => {
            if (mounted) {
              setLoading(false);
              console.log('Auth loading complete');
            }
          }, 100);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event);
      
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.id);
        const profile = await fetchUserProfile(session.user.id);
        
        if (profile && mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: profile.name || '',
            role: profile.role as UserRole,
          });
          
          timeoutId = setTimeout(() => {
            if (mounted) {
              setLoading(false);
            }
          }, 100);
        }
      } else if (event === 'SIGNED_OUT' && mounted) {
        console.log('User signed out');
        setUser(null);
        
        timeoutId = setTimeout(() => {
          if (mounted) {
            setLoading(false);
          }
        }, 100);
      }
    });

    // Cleanup subscription, mounted flag, and timeouts on unmount
    return () => {
      console.log('Cleaning up auth subscriptions');
      mounted = false;
      subscription.unsubscribe();
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // User data will be set by the onAuthStateChange listener
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (email: string, password: string, name: string, role: UserRole) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      
      if (error) throw error;
      
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Signup failed:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
