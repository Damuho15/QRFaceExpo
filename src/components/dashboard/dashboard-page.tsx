'use client';

import React, { useState, useEffect } from 'react';
import StatCard from './stat-card';
import { Users, UserCheck, CalendarClock, QrCode, Fingerprint } from 'lucide-react';
import { mockMembers, mockAttendanceLogs } from '@/lib/data';
import AttendanceChart from './attendance-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import AttendanceDataTable from './attendance-data-table';
import { columns } from './columns';
import type { AttendanceLog } from '@/lib/types';

const RecentActivityItem = ({ log }: { log: AttendanceLog }) => {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    setTimeString(log.timestamp.toLocaleTimeString());
  }, [log.timestamp]);

  return (
    <div className="flex items-center">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{log.memberName}</p>
        <p className="text-sm text-muted-foreground">{log.method} check-in ({log.type})</p>
      </div>
      <div className="text-sm text-muted-foreground">{timeString}</div>
    </div>
  );
};

export default function DashboardPage() {
  const totalMembers = mockMembers.length;
  const preRegistrations = mockAttendanceLogs.filter(log => log.type === 'Pre-registration').length;
  const actualRegistrations = mockAttendanceLogs.filter(log => log.type === 'Actual').length;
  const qrCheckins = mockAttendanceLogs.filter(log => log.method === 'QR').length;
  const faceCheckins = mockAttendanceLogs.filter(log => log.method === 'Face').length;
  
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
                <AttendanceChart data={mockAttendanceLogs} />
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
             <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>The latest members to check-in.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                {mockAttendanceLogs.slice(-5).reverse().map(log => (
                    <RecentActivityItem key={log.id} log={log} />
                ))}
                </div>
            </CardContent>
        </Card>
      </div>

      <AttendanceDataTable columns={columns} data={mockAttendanceLogs} />

    </div>
  );
}
