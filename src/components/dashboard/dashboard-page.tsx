

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StatCard from './stat-card';
import { Users, UserCheck, CalendarClock, QrCode, Fingerprint } from 'lucide-react';
import { getMembers, getAttendanceLogs, getEventConfig, parseDateAsUTC } from '@/lib/supabaseClient';
import AttendanceChart from './attendance-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import AttendanceDataTable from './attendance-data-table';
import { columns } from './columns';
import type { AttendanceLog, Member } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

const RecentActivityItem = ({ log }: { log: AttendanceLog }) => {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    setTimeString(new Date(log.timestamp).toLocaleTimeString());
  }, [log.timestamp]);

  return (
    <div className="flex items-center">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{log.member_name}</p>
        <p className="text-sm text-muted-foreground">{log.method} check-in ({log.type})</p>
      </div>
      <div className="text-sm text-muted-foreground">{timeString}</div>
    </div>
  );
};

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [memberData, eventConfig] = await Promise.all([
                getMembers(),
                getEventConfig()
            ]);
            
            let logData: AttendanceLog[] = [];
            if (eventConfig) {
                const startDate = parseDateAsUTC(eventConfig.pre_reg_start_date);
                
                // Set end date to the end of the event day
                const endDate = parseDateAsUTC(eventConfig.event_date);
                endDate.setUTCHours(23, 59, 59, 999);

                logData = await getAttendanceLogs(startDate, endDate);
            } else {
                // Fallback to fetching all logs if config is not available
                logData = await getAttendanceLogs();
            }

            setMembers(memberData);
            setAttendanceLogs(logData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            // You might want to add a toast here
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 30000); // Refresh every 30 seconds
        return () => clearInterval(intervalId); // Cleanup on component unmount
    }, [fetchData]);


  const totalMembers = members.length;
  const preRegistrations = attendanceLogs.filter(log => log.type === 'Pre-registration').length;
  const actualRegistrations = attendanceLogs.filter(log => log.type === 'Actual').length;
  const qrCheckins = attendanceLogs.filter(log => log.method === 'QR').length;
  const faceCheckins = attendanceLogs.filter(log => log.method === 'Face').length;
  
  if (loading) {
      return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4"><CardHeader><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-64" /></CardHeader><CardContent><Skeleton className="h-56 w-full" /></CardContent></Card>
                <Card className="lg:col-span-3"><CardHeader><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-56" /></CardHeader><CardContent className="space-y-4">{Array(5).fill(0).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
            </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                     <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">
          An overview of your event attendance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Members" value={totalMembers} icon={Users} />
        <StatCard title="Pre-registrations" value={preRegistrations} icon={UserCheck} />
        <StatCard title="Actual-day Registrations" value={actualRegistrations} icon={CalendarClock} />
        <StatCard 
            title="Check-in Methods" 
            value={`${qrCheckins} QR / ${faceCheckins} Face`} 
            icon={QrCode} 
            subIcon={Fingerprint} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Attendance Over Time</CardTitle>
                <CardDescription>A summary of check-ins throughout the event.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <AttendanceChart data={attendanceLogs} />
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
             <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>The latest members to check-in.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                {attendanceLogs.slice(0, 5).map(log => (
                    <RecentActivityItem key={log.id} log={log} />
                ))}
                </div>
            </CardContent>
        </Card>
      </div>

      <AttendanceDataTable columns={columns} data={attendanceLogs} isLoading={loading} />

    </div>
  );
}
