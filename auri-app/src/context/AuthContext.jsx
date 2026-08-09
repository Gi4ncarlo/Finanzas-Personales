import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (token refreshes, tab refocus, sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(prevUser => {
        if (prevUser?.id === session?.user?.id && event === 'TOKEN_REFRESHED') {
          return prevUser; // Keep existing object reference to avoid child component re-renders
        }
        return session?.user || null;
      });

      if (session?.user) {
        // Only fetch profile on explicit sign in or if profile isn't loaded yet
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || !profile) {
          fetchProfile(session.user.id);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      setProfile(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return result;
  };

  const signUp = async (email, password, nombre) => {
    setLoading(true);
    const result = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          nombre: nombre,
        }
      }
    });
    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    const result = await supabase.auth.signOut();
    setLoading(false);
    return result;
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, setProfile, loading, signIn, signUp, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
