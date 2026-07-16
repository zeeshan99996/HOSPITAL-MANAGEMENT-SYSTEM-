import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'lab_technician' | 'pharmacist' | 'accountant' | 'patient';
  profileId: number | null;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerPatientAccount: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('hms_token');
      const savedUser = localStorage.getItem('hms_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Validate token in background
          const res = await apiClient.get('/auth/profile');
          const updatedUser: UserSession = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
            profileId: res.details?.id || null,
          };
          setUser(updatedUser);
          localStorage.setItem('hms_user', JSON.stringify(updatedUser));
        } catch (error) {
          console.error('[Auth] Token verification failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient.post('/auth/login', { email, password });
      const sessionUser: UserSession = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        profileId: data.user.profileId,
      };

      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('hms_user', JSON.stringify(sessionUser));
      setUser(sessionUser);
    } catch (err: any) {
      throw new Error(err.message || 'Login failed.');
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
        profileId: res.user.patientId,
      };

      localStorage.setItem('hms_token', res.token);
      localStorage.setItem('hms_user', JSON.stringify(sessionUser));
      setUser(sessionUser);
    } catch (err: any) {
      throw new Error(err.message || 'Registration failed.');
    }
  };

  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerPatientAccount, logout }}>
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
