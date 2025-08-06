
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '@/lib/types';
import { loginUser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password?: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect runs once on mount to check for a "session".
    // In our case, we just need to signal that the initial auth check is done.
    setLoading(false);
  }, []);


  const login = async (username: string, password?: string): Promise<User | null> => {
    if (!password) {
        throw new Error('Password is required.');
    }
    setLoading(true);
    try {
        const potentialUser = await loginUser(username, password);

        if (potentialUser) {
            const { password: _, ...userToStore } = potentialUser;
            setUser(userToStore);
            return userToStore;
        } else {
             // This will be caught by the UI and shown as a toast.
             throw new Error("The username or password you entered is incorrect.");
        }
    } catch (error) {
        // Re-throw the error to be handled by the calling function (e.g., in the login page component).
        throw error;
    } finally {
        setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
