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
import { PanelLeft } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="flex-shrink-0">
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
            </header>
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
