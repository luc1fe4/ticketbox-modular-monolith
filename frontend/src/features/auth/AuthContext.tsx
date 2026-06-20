import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../api/client';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: 'AUDIENCE' | 'ORGANIZER' | 'STAFF' | 'ADMIN';
}

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserSummary>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface TokenPayload {
  sub: string; // userId
  email: string;
  role: UserSummary['role'];
  fullName: string;
  exp: number;
}

function decodeJwt(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const decoded = decodeJwt(storedToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setToken(storedToken);
        setUser({
          id: decoded.sub,
          email: decoded.email,
          fullName: decoded.fullName,
          role: decoded.role,
        });
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<UserSummary> => {
    try {
      const data: any = await api.post('/api/auth/login', { email, password });
      const { accessToken, user: userSummary } = data;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(userSummary);
      return userSummary;
    } catch (err: any) {
      throw err;
    }
  };

  const register = async (email: string, password: string, fullName: string, phone: string): Promise<void> => {
    try {
      await api.post('/api/auth/register', { email, password, fullName, phone });
    } catch (err: any) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
