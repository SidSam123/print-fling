
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
      // Create a unique identifier for this logout process for debugging
      const logoutId = `logout-${Date.now()}`;
      console.log(`[${logoutId}] Starting logout process...`);
      
      // Clear Supabase-specific cookies right away - this is critical
      document.cookie.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        const name = parts[0].trim();
        if (name.startsWith("sb-")) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          console.log(`[${logoutId}] Cleared Supabase cookie: ${name}`);
        }
      });
      
      // Clear user state first for immediate UI feedback
      console.log(`[${logoutId}] Clearing user state...`);
      setUser(null);

      // Suppress errors from Supabase signOut - we're going to force clean up anyway
      try {
        console.log(`[${logoutId}] Calling supabase.auth.signOut()...`);
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error(`[${logoutId}] Supabase signOut error:`, error);
          // Continue with logout process even if Supabase signOut fails
        } else {
          console.log(`[${logoutId}] Supabase signOut completed successfully`);
        }
      } catch (signOutError) {
        console.error(`[${logoutId}] Exception during supabase.auth.signOut():`, signOutError);
        // Continue with logout process even if Supabase signOut throws
      }
      
      // Forcefully clear all storage mechanisms
      try {
        // Local storage cleanup
        console.log(`[${logoutId}] Clearing localStorage...`);
        localStorage.removeItem('sb-refresh-token');
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('supabase.auth.token');
        // These are the keys we know about, but clear everything to be safe
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
            console.log(`[${logoutId}] Removed localStorage key: ${key}`);
          }
        }
        
        // Add an extra clean sweep attempt for ALL storage
        console.log(`[${logoutId}] Final storage cleanup sweep...`);
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (storageError) {
          console.error(`[${logoutId}] Error during final storage cleanup:`, storageError);
        }
        
        console.log(`[${logoutId}] Storage cleared successfully`);
      } catch (storageError) {
        console.error(`[${logoutId}] Error clearing storage:`, storageError);
      }

      console.log(`[${logoutId}] Logout process completed, redirecting to auth page...`);
      
      // Navigate to auth page - use a timeout to ensure all cleanup operations complete
      // and a clean redirect happens even if something fails along the way
      window.location.href = '/auth';
      
      // Don't rely on the timeout, force the redirect immediately
      setTimeout(() => {
        console.log(`[${logoutId}] Backup timeout redirect triggered`);
        window.location.href = '/auth';
      }, 500);
    } catch (error: any) {
      console.error('Logout failed:', error);
      
      // Final failsafe - force redirect to auth page regardless of errors
      try {
        // Clear sensitive data even if we had an error
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Final error cleanup failed:', e);
      }
      
      // Force redirect to auth page as a last resort
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
