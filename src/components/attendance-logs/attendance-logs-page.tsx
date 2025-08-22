
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAttendanceLogs, getFirstTimerAttendanceLogs } from '@/lib/supabaseClient';
import AttendanceDataTable from '@/components/dashboard/attendance-data-table';
import { columns } from '@/components/dashboard/columns';
import type { AttendanceLog, NewComerAttendanceLog } from '@/lib/types';
import { useDebounce } from 'use-debounce';

export default function AttendanceLogsPage() {
    const [loading, setLoading] = useState(true);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [firstTimerLogs, setFirstTimerLogs] = useState<NewComerAttendanceLog[]>([]);
    
    // State for pagination and filtering
    const [pageCount, setPageCount] = useState(0);
    const [pagination, setPagination] = useState({
      pageIndex: 0,
      pageSize: 15,
    });
    const [nameFilter, setNameFilter] = useState('');
    const [debouncedNameFilter] = useDebounce(nameFilter, 500);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                { logs: memberLogs, count: memberLogsCount }, 
                { logs: ftLogs, count: ftLogsCount }
            ] = await Promise.all([
                getAttendanceLogs({ 
                    pageIndex: pagination.pageIndex, 
                    pageSize: pagination.pageSize,
                    memberNameFilter: debouncedNameFilter 
                }),
                getFirstTimerAttendanceLogs({
                    pageIndex: pagination.pageIndex,
                    pageSize: pagination.pageSize,
                    nameFilter: debouncedNameFilter
                })
            ]);

            setAttendanceLogs(memberLogs);
            setFirstTimerLogs(ftLogs);
            
            // This is an approximation for pagination. A more robust solution might require a single query.
            const totalCount = memberLogsCount + ftLogsCount;
            setPageCount(Math.ceil(totalCount / pagination.pageSize));

        } catch (error) {
            console.error("Failed to fetch attendance data:", error);
        } finally {
            setLoading(false);
        }
    }, [pagination, debouncedNameFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // Reset page index when filter changes
    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [debouncedNameFilter]);

    const combinedLogs = useMemo(() => {
        const memberLogsMapped = attendanceLogs.map(l => ({ ...l, attendeeType: 'Member' as const }));
        const firstTimerLogsMapped = firstTimerLogs.map(l => ({ 
            ...l, 
            id: l.id, 
            member_name: l.first_timer_name, 
            member_id: l.first_timer_id, 
            attendeeType: 'New Comer' as const 
        }));
        
        // Note: Sorting only affects the current page. The overall order is handled by the database query.
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
            <AttendanceDataTable 
                columns={columns} 
                data={combinedLogs} 
                isLoading={loading} 
                onAction={fetchData}
                pageCount={pageCount}
                pagination={pagination}
                setPagination={setPagination}
                nameFilter={nameFilter}
                setNameFilter={setNameFilter}
            />
        </div>
    );
}
