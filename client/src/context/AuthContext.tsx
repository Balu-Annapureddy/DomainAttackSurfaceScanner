import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, QuotaInfo } from '../../../shared/types';
import { getAuthStatus, loginUser, registerUser, logoutUser } from '../lib/api';

interface AuthContextType {
  user: User | null;
  quota: QuotaInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const data = await getAuthStatus();
      setUser(data.user);
      setQuota(data.quota);
    } catch {
      setUser(null);
      setQuota(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    setUser(data.user);
    setQuota(data.quota);
  };

  const register = async (email: string, password: string) => {
    const data = await registerUser(email, password);
    setUser(data.user);
    setQuota(data.quota);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    void refreshAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        quota,
        loading,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
