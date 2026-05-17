import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, withTimeout } from '../lib/supabase';
import { ADMIN_EMAIL } from '../constants';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  syncAccount: (user: User, additionalData?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
  loginWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  syncAccount: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync user data to Supabase profiles table
  const syncAccount = async (user: User, additionalData: any = {}) => {
    try {
      const getUserPromise = supabase.auth.getUser();
      const { data: { user: currentUser } } = await withTimeout(getUserPromise) as any;
      const userToSync = currentUser || user;
      
      if (!userToSync) return;

      const metadata = userToSync.user_metadata || {};
      const { error } = await withTimeout(supabase.from('profiles').upsert({
        id: userToSync.id,
        full_name: metadata.full_name || additionalData.name || metadata.name || 'User',
        email: userToSync.email,
        avatar_url: metadata.avatar_url || metadata.picture
      })) as any;

      if (error) {
        console.warn("Profile sync warning (this is normal if table schema differs):", error.message);
      }
    } catch (error) {
      console.error("Error syncing user to Supabase:", error);
    }
  };

  const checkAdminStatus = async (user: User) => {
    // 1. Hardcoded check
    if (user.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      return;
    }

    // 2. Database check
    try {
      const { data, error } = await withTimeout(supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(), 5000, { data: null, error: null } as any) as any;

      if (error) {
        // If role doesn't exist or profile doesn't exist, just ignore
        console.info("Info: Profiles table might not have role column or profile missing.");
        setIsAdmin(false);
        return;
      }

      if (data && (data as any).role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await checkAdminStatus(currentUser);
        syncAccount(currentUser).catch(console.error);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Initial session check
    const authTimeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("[AuthContext] Session check timeout (10s). Forcing loading back to false.");
          return false;
        }
        return currentLoading;
      });
    }, 10000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(authTimeout);
        if (!mounted) return;
        
        const user = session?.user ?? null;
        setUser(user);
        
        if (user) {
          withTimeout(checkAdminStatus(user), 5000).catch(err => {
            console.error("[AuthContext] Admin check failed or timed out:", err);
          });
          withTimeout(syncAccount(user), 5000).catch(err => {
            console.error("[AuthContext] Sync account failed or timed out:", err);
          });
        }
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(authTimeout);
        console.error("[AuthContext] Session fetch error:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      loading, 
      logout, 
      loginWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      syncAccount 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
