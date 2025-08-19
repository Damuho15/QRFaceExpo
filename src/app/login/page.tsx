'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
        router.push('/');
    }
  }, [isAuthenticated, router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await login(username, password);
      if (user) {
        toast({
          title: 'Login Successful',
          description: `Welcome back, ${user.full_name}!`,
        });
        // The useEffect will handle the redirect
      } else {
         // This case should ideally not be hit if login throws an error, but as a fallback:
         throw new Error('Invalid credentials');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'The username or password you entered is incorrect.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const FeastLogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width="100"
      height="100"
      {...props}
    >
      <g>
        <circle cx="100" cy="100" r="70" fill="black" />
        <path
          d="M100 20 A80 80 0 1 1 20 100"
          fill="none"
          stroke="black"
          strokeWidth="8"
        />
        <path
          d="M100 10 A90 90 0 1 1 10 100"
          fill="none"
          stroke="black"
          strokeWidth="8"
        />
        <text
          x="100"
          y="85"
          fontFamily="sans-serif"
          fontSize="24"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          the
        </text>
        <text
          x="100"
          y="125"
          fontFamily="sans-serif"
          fontSize="40"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          FEAST
        </text>
      </g>
    </svg>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <form onSubmit={handleLogin}>
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <FeastLogoIcon className="h-20 w-20" />
            </div>
            <CardTitle className="text-2xl">Feast Expo Attendance</CardTitle>
            <CardDescription>
              Enter your username and password to login.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g., admin"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" type="button" className="w-full" onClick={() => router.push('/')} disabled={isLoading}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
            </Button>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                  </>
              ) : (
                  <>
                      <LogIn className="mr-2 h-4 w-4" /> Sign In
                  </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
