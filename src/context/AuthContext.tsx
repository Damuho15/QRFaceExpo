
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { getUserByEmail } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password?: string): Promise<User | null> => {
    // In a real app, you would validate the password.
    // Here we are just fetching the user by email for demonstration.
    try {
        const fetchedUser = await getUserByEmail(email);

        if (fetchedUser) {
            setUser(fetchedUser);
            return fetchedUser;
        } else {
            // This is the expected path for a non-existent user.
            // Throw a specific error to be caught by the login form.
            throw new Error("User not found or invalid credentials.");
        }
    } catch (error) {
        // Re-throw the error for the UI to handle.
        // This includes the "User not found" error from above.
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
