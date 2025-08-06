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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { useSidebar } from '../ui/sidebar';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/first-timers', label: 'New Comers', icon: UserPlus },
  { href: '/check-in', label: 'Check-in', icon: QrCode },
  { href: '/feedback', label: 'Feedback', icon: MessageSquareHeart },
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
  const { toggleSidebar } = useSidebar();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
            <MonkeyIcon className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">ExpAttendance</h1>
        </div>
      </div>
      <SidebarMenu className="p-4 space-y-2">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref>
                <SidebarMenuButton
                as="a"
                isActive={pathname === item.href}
                tooltip={item.label}
                >
                <item.icon />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </div>
  );
}
