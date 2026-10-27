import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import axios from 'axios';
import api from '../services/api';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  birthDate: string;
  gender: string;
  facebook: string;
  membershipTier: string;
  accountStatus: string;
  isVerified: boolean;
  is_admin?: boolean;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: any;
  userId?: string;
  _id?: string;
  token?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (userData: any) => Promise<AuthResponse>;
  logout: () => void;
  deleteAccount: () => Promise<AuthResponse>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const AUTH_ENDPOINT = '/api/v1/auth';

const extractErrorMessage = (data: any, fallback: string): string => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item: any) => item.msg || JSON.stringify(item))
      .join(', ');
  }

  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return fallback;
};

const normalizeUser = (data: any, fallbackEmail = ''): User => {
  const source = data?.user ?? data?.data?.user ?? data?.data ?? data ?? {};

  return {
    id: String(source.id || source._id || source.userId || ''),
    fullName: source.fullName || source.full_name || '',
    username: source.username || '',
    email: source.email || fallbackEmail || '',
    mobile: source.mobile || source.phone || '',
    birthDate: source.birthDate || source.birth_date || '',
    gender: source.gender || 'Other',
    facebook: source.facebook || '',
    membershipTier: source.membershipTier || source.membership_tier || 'EGB Backyard Member',
    accountStatus: source.accountStatus || source.account_status || source.status || 'Active',
    isVerified: Boolean(source.isVerified ?? source.is_verified ?? false),
    is_admin: Boolean(source.is_admin ?? source.isAdmin ?? false),
  };
};

const getError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    return extractErrorMessage(error.response?.data, error.message || fallback);
  }
  return error instanceof Error ? error.message : fallback;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('userProfileData');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('access_token');

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    const request = (async () => {
      try {
        const response = await api.get(`${AUTH_ENDPOINT}/profile`, {
          timeout: 10000,
        });

        const updatedUser = normalizeUser(response.data);
        if (!updatedUser.id) {
          // The server response is not a usable profile. Do not trust stale
          // cached user details as proof of a valid account.
          logout();
          return;
        }

        localStorage.setItem('userProfileData', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsAuthenticated(true);
        setError(null);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          logout();
          return;
        }

        // Keep a currently cached session during temporary network/server
        // errors; a transient outage should not automatically sign users out.
        console.warn('[EGB AuthContext] Profile refresh failed:', getError(err, 'Profile refresh failed.'));
      } finally {
        setIsLoading(false);
      }
    })();

    refreshInFlight.current = request;
    try {
      await request;
    } finally {
      refreshInFlight.current = null;
    }
  }, [logout]);

  useEffect(() => {
    const storedUser = localStorage.getItem('userProfileData');
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('access_token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser) as User);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('userProfileData');
        setUser(null);
        setIsAuthenticated(false);
      }
    }

    void refreshUser();

    const handleFocus = () => {
      void refreshUser();
    };
    const handleSessionExpired = () => logout();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('user_session_expired', handleSessionExpired);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('user_session_expired', handleSessionExpired);
    };
  }, [logout, refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        // Do not send an old token with a public login request.
        const response = await api.post(
          `${AUTH_ENDPOINT}/login`,
          { email, password },
          { headers: { Authorization: undefined }, timeout: 15000 }
        );

        const data = response.data ?? {};
        const token = data.token || data.access_token;

        if (!token) {
          const message = 'Login failed. The server did not return an access token.';
          setError(message);
          return { success: false, message };
        }

        localStorage.setItem('token', token);
        localStorage.setItem('access_token', token);

        const userData = normalizeUser(data, email);
        localStorage.setItem('userProfileData', JSON.stringify(userData));
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);

        return { success: true, user: userData, token };
      } catch (err: unknown) {
        const message = getError(err, 'Unable to connect to the server.');
        setError(message);
        return { success: false, message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (userData: any): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post(
          `${AUTH_ENDPOINT}/register`,
          userData,
          { headers: { Authorization: undefined }, timeout: 15000 }
        );

        const data = response.data ?? {};
        const returnedUser = data.user || data.data?.user || data;
        const id = data.userId || data._id || returnedUser?._id || returnedUser?.id;

        return {
          success: true,
          user: returnedUser,
          userId: id,
          _id: id,
          message: data.message,
        };
      } catch (err: unknown) {
        const message = getError(err, 'Registration failed.');
        setError(message);
        return { success: false, message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteAccount = useCallback(async (): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${AUTH_ENDPOINT}/me`);
      logout();
      return {
        success: true,
        message: response.data?.message || 'Account deleted successfully.',
      };
    } catch (err: unknown) {
      const message = getError(err, 'Failed to delete account.');
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    register,
    logout,
    deleteAccount,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
