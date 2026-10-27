import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, UserProfile } from '../services/api';
import { localDb, requestPersistentStorage } from '../services/db';
import { connectivity } from '../services/connectivity';
import { FighterId } from '../types/combat';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    displayName: string;
    avatarColor?: string;
    avatarStyle?: string;
    selectedFighter?: FighterId;
  }) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and check persistent storage
  useEffect(() => {
    requestPersistentStorage();
    connectivity.startMonitoring(10000);

    const initAuth = async () => {
      let currentToken = api.getToken();
      if (currentToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);

          // Cache in IndexedDB for fast UI rendering
          await localDb.profiles.put({
            userId: res.user.id,
            displayName: res.user.displayName,
            email: res.user.email,
            avatarColor: res.user.avatarColor,
            avatarStyle: 'starlight',
            cachedAt: Date.now(),
          });
        } catch (err) {
          console.warn('Auth token refresh fallback to cached/guest profile:', err);
        }
      }

      // If still no user, auto-initialize an instant fighter profile
      setUser((existing) => {
        if (existing) return existing;
        const autoUser: UserProfile = {
          id: 'fighter_' + Math.random().toString(36).substring(2, 9),
          email: 'challenger@lovebattle.com',
          displayName: 'Heart Fighter',
          selectedFighter: 'heart_knight',
          avatarColor: '#ff2a85',
          title: 'Passionate Challenger',
          level: 1,
          exp: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          createdAt: new Date().toISOString(),
        };
        const token = 'token_' + autoUser.id;
        api.setToken(token);
        setTokenState(token);
        return autoUser;
      });

      setIsLoading(false);
    };

    initAuth();

    return () => {
      connectivity.stopMonitoring();
    };
  }, []);

  const login = async (payload: { email: string; password: string }) => {
    const res = await api.login(payload);
    setUser(res.user);
    setTokenState(res.token);

    await localDb.profiles.put({
      userId: res.user.id,
      displayName: res.user.displayName,
      email: res.user.email,
      avatarColor: res.user.avatarColor,
      avatarStyle: 'starlight',
      cachedAt: Date.now(),
    });
  };

  const register = async (payload: {
    email: string;
    password: string;
    displayName: string;
    avatarColor?: string;
    avatarStyle?: string;
    selectedFighter?: FighterId;
  }) => {
    const res = await api.register(payload);
    setUser(res.user);
    setTokenState(res.token);

    await localDb.profiles.put({
      userId: res.user.id,
      displayName: res.user.displayName,
      email: res.user.email,
      avatarColor: res.user.avatarColor,
      avatarStyle: 'starlight',
      cachedAt: Date.now(),
    });
  };

  const logout = () => {
    api.logout();
    setTokenState(null);
    setUser(null);
  };

  const refreshUserData = async () => {
    if (!api.getToken()) return;
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err) {
      console.warn('Failed to refresh user data:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
