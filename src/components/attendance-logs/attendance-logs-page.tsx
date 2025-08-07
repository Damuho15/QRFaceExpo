
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAttendanceLogs, getFirstTimerAttendanceLogs } from '@/lib/supabaseClient';
import AttendanceDataTable from '@/components/dashboard/attendance-data-table';
import { columns } from '@/components/dashboard/columns';
import type { AttendanceLog, NewComerAttendanceLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function AttendanceLogsPage() {
    const [loading, setLoading] = useState(true);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [firstTimerLogs, setFirstTimerLogs] = useState<NewComerAttendanceLog[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [memberLogs, ftLogs] = await Promise.all([
                getAttendanceLogs(),
                getFirstTimerAttendanceLogs()
            ]);

            setAttendanceLogs(memberLogs);
            setFirstTimerLogs(ftLogs);

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const combinedLogs = useMemo(() => [
        ...attendanceLogs.map(l => ({ ...l, member_name: l.member_name, type: l.type, method: l.method, timestamp: l.timestamp, id: l.id, attendeeType: 'Member' as const })),
        ...firstTimerLogs.map(l => ({ ...l, id: l.id, member_name: l.first_timer_name, member_id: l.first_timer_id, type: l.type, method: l.method, timestamp: l.timestamp, attendeeType: 'New Comer' as const }))
    ], [attendanceLogs, firstTimerLogs]);

    const latestLogs = useMemo(() => {
        const latestCheckins = new Map<string, (typeof combinedLogs)[number]>();

        combinedLogs.forEach(log => {
            const name = 'member_name' in log ? log.member_name : (log as any).first_timer_name;
            const existing = latestCheckins.get(name);
            if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
                latestCheckins.set(name, log);
            }
        });

        return Array.from(latestCheckins.values())
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [combinedLogs]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-headline">Attendance Logs</h1>
                <p className="text-muted-foreground">
                    View and manage all attendance records.
                </p>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>All Records</CardTitle>
                    <CardDescription>A detailed list of all check-ins for all event periods.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttendanceDataTable columns={columns} data={latestLogs} isLoading={loading} onAction={fetchData} />
                </CardContent>
            </Card>
        </div>
    );
}
