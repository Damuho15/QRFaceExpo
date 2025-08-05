
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { FirstTimer, NewComerAttendanceLog } from '@/lib/types';
import FirstTimersDataTable from './first-timers-data-table';
import { columns } from './columns';
import { getFirstTimers, getFirstTimerAttendanceLogs, promoteFirstTimerToMember } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Crown, Loader2, Star } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface AttendanceCount {
    [key: string]: {
        name: string,
        count: number,
        firstTimer: FirstTimer
    }
}

const NewComerAttendanceDashboard = ({ firstTimers, attendanceLogs, onPromoteSuccess, isLoading }: { firstTimers: FirstTimer[], attendanceLogs: NewComerAttendanceLog[], onPromoteSuccess: () => void, isLoading: boolean }) => {
    const { toast } = useToast();
    const [isPromoting, setIsPromoting] = useState<string | null>(null);

    const handlePromote = async (firstTimer: FirstTimer) => {
        setIsPromoting(firstTimer.id);
        try {
            await promoteFirstTimerToMember(firstTimer);
            toast({
                title: "Promotion Successful",
                description: `${firstTimer.fullName} has been added to the main members database.`,
            });
            onPromoteSuccess();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Promotion Failed',
                description: error.message || "Could not promote the new comer.",
            });
        } finally {
            setIsPromoting(null);
        }
    }

    const attendanceCounts = React.useMemo(() => {
        const counts: AttendanceCount = {};
        
        // Filter for "Actual" logs and count unique days per person
        const actualLogs = attendanceLogs.filter(log => log.type === 'Actual');
        const uniqueCheckins = new Set<string>();

        actualLogs.forEach(log => {
            const eventDate = new Date(log.timestamp).toISOString().split('T')[0];
            const uniqueKey = `${log.first_timer_id}-${eventDate}`;

            if (!uniqueCheckins.has(uniqueKey)) {
                uniqueCheckins.add(uniqueKey);

                if (!counts[log.first_timer_id]) {
                    const firstTimer = firstTimers.find(ft => ft.id === log.first_timer_id);
                    if (firstTimer) {
                         counts[log.first_timer_id] = {
                            name: log.first_timer_name,
                            count: 0,
                            firstTimer: firstTimer,
                        };
                    }
                }
                if (counts[log.first_timer_id]) {
                    counts[log.first_timer_id].count++;
                }
            }
        });
        
        return Object.values(counts).sort((a,b) => b.count - a.count);
    }, [attendanceLogs, firstTimers]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>New Comer Attendance</CardTitle>
                <CardDescription>
                    Track how many "Actual" events new comers have attended. They can be promoted to members after 4 attendances.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72 w-full">
                    <div className="space-y-4 pr-6">
                        {isLoading ? (
                            Array.from({length: 5}).map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            ))
                        ) : attendanceCounts.length > 0 ? (
                            attendanceCounts.map(({ name, count, firstTimer }) => (
                                <div key={firstTimer.id} className="flex items-center justify-between">
                                    <p className="font-medium">{name}</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Star className="h-4 w-4 text-accent" />
                                            <span className="font-bold">{count}</span>
                                            <span className="text-sm">Attendance</span>
                                        </div>
                                        {count >= 4 && (
                                            <Button
                                                size="sm"
                                                onClick={() => handlePromote(firstTimer)}
                                                disabled={isPromoting === firstTimer.id}
                                            >
                                                {isPromoting === firstTimer.id ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Crown className="mr-2 h-4 w-4" />
                                                )}
                                                Promote
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                             <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground">No "Actual" attendance records found for new comers.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}


export default function FirstTimersPage() {
  const [firstTimers, setFirstTimers] = useState<FirstTimer[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<NewComerAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
        const [fetchedFirstTimers, fetchedLogs] = await Promise.all([
            getFirstTimers(),
            getFirstTimerAttendanceLogs()
        ]);
        setFirstTimers(fetchedFirstTimers);
        setAttendanceLogs(fetchedLogs);
    } catch (error) {
        console.error("Failed to fetch new comers data:", error);
        // Optionally, add toast notifications for errors
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">New Comer Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your new comers. Promote them to members based on attendance.
        </p>
      </div>

      <NewComerAttendanceDashboard 
        firstTimers={firstTimers}
        attendanceLogs={attendanceLogs}
        onPromoteSuccess={refreshData}
        isLoading={loading}
      />

      <FirstTimersDataTable columns={columns} data={firstTimers} onAction={refreshData} isLoading={loading} />
    </div>
  );
}
