
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  QrCode,
  MessageSquareHeart,
  UserPlus,
  ShieldCheck,
  LogOut,
  CalendarPlus,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { useSidebar } from '../ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: false, roles: [] },
  { href: '/members', label: 'Members', icon: Users, requiresAuth: true, roles: ['admin', 'viewer'] },
  { href: '/first-timers', label: 'New Comers', icon: UserPlus, requiresAuth: true, roles: ['admin', 'viewer'] },
  { href: '/attendance-logs', label: 'Attendance Logs', icon: ClipboardList, requiresAuth: true, roles: ['admin'] },
  { href: '/user-management', label: 'User Management', icon: ShieldCheck, requiresAuth: true, roles: ['admin'] },
  { href: '/event-creation', label: 'Event Creation', icon: CalendarPlus, requiresAuth: true, roles: ['admin'] },
  { href: '/', label: 'Check-in', icon: QrCode, requiresAuth: false, roles: [] },
  { href: '/feedback', label: 'Feedback', icon: MessageSquareHeart, requiresAuth: false, roles: [] },
];

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

export default function Nav() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  }

  const checkPermission = (item: typeof navItems[0]) => {
    if (!item.requiresAuth) return true;
    if (!isAuthenticated || !user) return false;
    if (item.roles.length > 0) {
        return item.roles.includes(user.role);
    }
    return true; 
  };


  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
            <MonkeyIcon className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">ExpAttendance</h1>
        </div>
      </div>
      <SidebarMenu className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const hasAccess = checkPermission(item);
          const isActive = pathname === item.href;
          
          const button = (
             <SidebarMenuButton
                isActive={isActive}
                tooltip={item.label}
                disabled={!hasAccess}
                className={cn(!isActive && !hasAccess && "text-muted-foreground/50 cursor-not-allowed")}
            >
              <item.icon />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </SidebarMenuButton>
          )

          return (
          <SidebarMenuItem key={item.href}>
             {hasAccess ? <Link href={item.href}>{button}</Link> : button}
          </SidebarMenuItem>
        )})}
      </SidebarMenu>
       <div className="p-4 mt-auto">
        {isAuthenticated && (
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4"/>
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        )}
      </div>
    </div>
  );
}
