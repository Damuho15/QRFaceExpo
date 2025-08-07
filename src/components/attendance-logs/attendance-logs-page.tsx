
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

    const combinedLogs = useMemo(() => {
        const memberLogsMapped = attendanceLogs.map(l => ({ ...l, attendeeType: 'Member' as const }));
        const firstTimerLogsMapped = firstTimerLogs.map(l => ({ 
            ...l, 
            id: l.id, 
            member_name: l.first_timer_name, 
            member_id: l.first_timer_id, 
            attendeeType: 'New Comer' as const 
        }));
        
        return [...memberLogsMapped, ...firstTimerLogsMapped]
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
    }, [attendanceLogs, firstTimerLogs]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-headline">Attendance Logs</h1>
                <p className="text-muted-foreground">
                    View and manage all attendance records for all event periods.
                </p>
            </div>
            <AttendanceDataTable columns={columns} data={combinedLogs} isLoading={loading} onAction={fetchData} />
        </div>
    );
}
