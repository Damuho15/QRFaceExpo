
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
import { Loader2, LogIn } from 'lucide-react';
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
        router.push('/');
      } else {
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
  
  const MonkeyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        {...props}
    >
        <path d="M14 16c-2.5-2.5-2.5-7 0-9.5"/>
        <path d="M10 16c2.5-2.5 2.5-7 0-9.5"/>
        <path d="M6 13.5c-2-2-2-5.5 0-7.5"/>
        <path d="M18 13.5c2-2 2-5.5 0-7.5"/>
        <path d="M12 18.5c-4-4-4-10.5 0-14.5-5 5-5 11.5 0 16.5-2.5-2.5-2.5-7 0-9.5"/>
        <path d="M12 18.5c4-4 4-10.5 0-14.5 5 5 5 11.5 0 16.5 2.5-2.5 2.5-7 0-9.5"/>
        <path d="M2.5 10.5a9.5 9.5 0 1 0 19 0"/>
    </svg>
)

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <form onSubmit={handleLogin}>
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <MonkeyIcon className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">ExpAttendance Login</CardTitle>
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
          <CardFooter>
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
