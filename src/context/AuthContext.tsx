
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { getUserByUsername } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password?: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, password?: string): Promise<User | null> => {
    try {
        const fetchedUser = await getUserByUsername(username);

        if (fetchedUser && fetchedUser.password === password) {
            // In a real app, never store the password in the client-side state.
            const { password: _, ...userToStore } = fetchedUser;
            setUser(userToStore);
            return userToStore;
        } else {
            // This will be caught by the UI and shown as a toast.
            throw new Error("The username or password you entered is incorrect.");
        }
    } catch (error) {
        // Re-throw the error to be handled by the calling function (e.g., in the login page component).
        throw error;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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
