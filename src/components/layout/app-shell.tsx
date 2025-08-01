"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Nav from './nav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarContent className="p-0">
            <Nav />
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-col w-full">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <SidebarTrigger className="md:hidden" />
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6">
                {children}
            </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
