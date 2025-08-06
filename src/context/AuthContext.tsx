
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
    console.log("Attempting login for email:", email);
    const fetchedUser = await getUserByEmail(email);

    if (fetchedUser) {
      console.log("User found:", fetchedUser);
      setUser(fetchedUser);
      return fetchedUser;
    } else {
      console.log("User not found for email:", email);
      setUser(null);
      throw new Error("User not found or invalid credentials.");
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
