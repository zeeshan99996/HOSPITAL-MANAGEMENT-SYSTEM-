import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { supabase } from '../config/supabaseClient';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'pharmacist' | 'accountant' | 'patient';
  profileId: number | null;
  supabase_user_id?: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerPatientAccount: (data: any) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('hms_user');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          localStorage.setItem('hms_token', session.access_token);
        }

        const token = localStorage.getItem('hms_token');
        if (token) {
          if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch (e) {}
          }
          const res = await apiClient.get('/auth/profile');
          const updatedUser: UserSession = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
            profileId: res.details?.id || null,
            supabase_user_id: res.user.supabase_user_id,
          };
          setUser(updatedUser);
          localStorage.setItem('hms_user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.warn('[AuthInit] Session verify warning:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        localStorage.setItem('hms_token', session.access_token);
        localStorage.setItem('supabase_token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('hms_user');
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // 1. Authenticate with Supabase Auth
      let token = '';
      try {
        const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (sbData?.session?.access_token) {
          token = sbData.session.access_token;
          localStorage.setItem('supabase_token', token);
          localStorage.setItem('hms_token', token);
        }
      } catch (sbEx) {
        console.warn('[Supabase Auth Client Warning]:', sbEx);
      }

      // 2. Authenticate / Fetch matching Hostinger MySQL user profile from backend
      const data = await apiClient.post('/auth/login', { email, password });
      const sessionUser: UserSession = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        profileId: data.user.profileId,
        supabase_user_id: data.user.supabase_user_id,
      };

      if (!token && data.token) {
        token = data.token;
      }

      localStorage.setItem('hms_token', token);
      localStorage.setItem('hms_user', JSON.stringify(sessionUser));
      setUser(sessionUser);
    } catch (err: any) {
      throw new Error(err.message || 'Login failed.');
    }
  };

  const registerPatientAccount = async (data: any) => {
    try {
      // Create user in Supabase Auth first if email/password provided
      if (data.email && data.password) {
        try {
          const { data: sbReg } = await supabase.auth.signUp({
            email: data.email.trim(),
            password: data.password,
          });
          if (sbReg?.session?.access_token) {
            localStorage.setItem('hms_token', sbReg.session.access_token);
          }
        } catch (e) {}
      }

      const res = await apiClient.post('/auth/register', data);
      const sessionUser: UserSession = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        profileId: res.user.patientId,
      };

      localStorage.setItem('hms_token', res.token || localStorage.getItem('hms_token') || '');
      localStorage.setItem('hms_user', JSON.stringify(sessionUser));
      setUser(sessionUser);
    } catch (err: any) {
      throw new Error(err.message || 'Registration failed.');
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.removeItem('hms_token');
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('hms_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerPatientAccount, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
