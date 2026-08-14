import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'pharmacist' | 'accountant' | 'patient';
  profileId: number | null;
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
      const token = localStorage.getItem('hms_token');

      if (token) {
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {}
        }

        try {
          const res = await apiClient.get('/auth/profile');
          if (res?.user) {
            const updatedUser: UserSession = {
              id: res.user.id,
              name: res.user.name,
              email: res.user.email,
              role: res.user.role,
              profileId: res.details?.id || null,
            };
            setUser(updatedUser);
            localStorage.setItem('hms_user', JSON.stringify(updatedUser));
          }
        } catch (error) {
          console.warn('[AuthInit] Session expired or invalid:', error);
          localStorage.removeItem('hms_token');
          localStorage.removeItem('hms_user');
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (!data?.token || !data?.user) {
        throw new Error(data?.message || 'Login failed. Please check your credentials.');
      }

      const sessionUser: UserSession = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        profileId: data.user.profileId || null,
      };

      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('hms_user', JSON.stringify(sessionUser));
      setUser(sessionUser);
    } catch (backendErr: any) {
      throw new Error(backendErr.message || 'Login failed.');
    }
  };

  const registerPatientAccount = async (data: any) => {
    try {
      const res = await apiClient.post('/auth/register', data);
      const sessionUser: UserSession = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        profileId: res.user.patientId || null,
      };

      if (res.token) {
        localStorage.setItem('hms_token', res.token);
      }
      localStorage.setItem('hms_user', JSON.stringify(sessionUser));
      setUser(sessionUser);
    } catch (err: any) {
      throw new Error(err.message || 'Registration failed.');
    }
  };

  const resetPassword = async (_email: string) => {
    // Password resets can be handled directly by admin in SecurityManagement
    throw new Error('Self-service password reset is disabled. Please contact your Clinic Administrator.');
  };

  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('hms_user');
    setUser(null);
    window.location.href = '/';
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
