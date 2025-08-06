
"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Nav from './nav';
import { Button } from '../ui/button';
import { LogOut, PanelLeft, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

export default function AppShell({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'viewer' | 'check_in_only' }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  }
  
  // If the content itself is the login page, we don't need the full shell logic.
  if (router.pathname === '/login') {
    return <>{children}</>;
  }

  const renderContent = () => {
    if (loading) {
       return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }

    if (!isAuthenticated) {
        router.push('/login');
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const hasPermission = !requiredRole || (user && (user.role === 'admin' || user.role === requiredRole));
    
    if (requiredRole && !hasPermission) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-8 text-center bg-card rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                    <p className="text-muted-foreground mt-2">You do not have the required permissions to view this page.</p>
                     <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    return children;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="flex-shrink-0 hidden md:block">
          <SidebarContent className="p-0 backdrop-blur-lg">
            <Nav />
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-1 flex-col min-w-0">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/50 backdrop-blur-lg px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <SidebarTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <PanelLeft className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SidebarTrigger>
                <div className="ml-auto">
                    {loading ? (
                       <Skeleton className="h-9 w-9 rounded-full" />
                    ) : isAuthenticated ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <UserIcon className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 mr-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                    <Avatar>
                                        <AvatarFallback>{user?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user?.full_name}</p>
                                        <p className="text-sm text-muted-foreground">{user?.username}</p>
                                    </div>
                                    </div>
                                    <Badge variant={user?.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">
                                        {user?.role?.replace('_', ' ')}
                                    </Badge>
                                </div>
                                    <Button variant="outline" onClick={handleLogout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Logout
                                    </Button>
                            </div>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <Button variant="outline" onClick={() => router.push('/login')}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Login
                        </Button>
                    )}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
