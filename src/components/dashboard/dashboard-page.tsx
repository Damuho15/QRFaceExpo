

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StatCard from './stat-card';
import { Users, UserCheck, CalendarClock, QrCode, Fingerprint, Calendar as CalendarIcon, TrendingUp, Loader2 } from 'lucide-react';
import { getMembers, getAttendanceLogs, getFirstTimerAttendanceLogs, getEventConfig, parseDateAsUTC } from '@/lib/supabaseClient';
import AttendanceChart from './attendance-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import AttendanceDataTable from './attendance-data-table';
import { columns } from './columns';
import type { AttendanceLog, Member, NewComerAttendanceLog } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

const RecentActivityItem = ({ log }: { log: AttendanceLog | NewComerAttendanceLog & { member_name: string } }) => {
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

const AttendanceReport = () => {
    const { toast } = useToast();
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [totalActualAttendance, setTotalActualAttendance] = useState<number | null>(null);

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date Range',
                description: 'Please select both a start and an end date.',
            });
            return;
        }

        if (startDate > endDate) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date Range',
                description: 'The start date cannot be after the end date.',
            });
            return;
        }
        
        setIsLoading(true);
        setTotalActualAttendance(null);
        try {
            // Set end date to the end of the day to include all logs for that day
            const adjustedEndDate = new Date(endDate);
            adjustedEndDate.setHours(23, 59, 59, 999);

            const [memberLogs, firstTimerLogs] = await Promise.all([
                getAttendanceLogs(startDate, adjustedEndDate),
                getFirstTimerAttendanceLogs(startDate, adjustedEndDate)
            ]);
            
            const combinedLogs = [
                ...memberLogs.map(l => ({ ...l, name: l.member_name })), 
                ...firstTimerLogs.map(l => ({ ...l, name: l.first_timer_name }))
            ];

            const actualLogs = combinedLogs.filter(log => log.type === 'Actual');
            
            const uniqueAttendance = new Set<string>();

            actualLogs.forEach(log => {
                const eventDate = new Date(log.timestamp).toISOString().split('T')[0];
                const uniqueKey = `${log.name}-${eventDate}`;
                uniqueAttendance.add(uniqueKey);
            });
            
            setTotalActualAttendance(uniqueAttendance.size);

        } catch (error) {
            console.error("Failed to calculate attendance report:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to generate the attendance report.',
            });
            setTotalActualAttendance(0);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Attendance Report</CardTitle>
                <CardDescription>
                    Select a date range to see the total unique "Actual" attendance for events in that period.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="start-date"
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor="end-date">End Date</Label>
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                             id="end-date"
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button onClick={handleGenerateReport} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate Report'
                        )}
                    </Button>
                </div>
                <div className="pt-4">
                  {isLoading ? (
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <Skeleton className="h-5 w-40" />
                              <Skeleton className="h-4 w-4" />
                          </CardHeader>
                          <CardContent>
                              <Skeleton className="h-8 w-16" />
                          </CardContent>
                      </Card>
                  ) : totalActualAttendance !== null ? (
                      <StatCard 
                          title="Total Unique Actual Attendance" 
                          value={totalActualAttendance}
                          icon={TrendingUp}
                      />
                  ) : (
                      <div className="text-center text-muted-foreground py-8">
                          Please select a date range and click "Generate Report".
                      </div>
                  )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [firstTimerLogs, setFirstTimerLogs] = useState<NewComerAttendanceLog[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [memberData, eventConfig] = await Promise.all([
                getMembers(),
                getEventConfig()
            ]);
            
            let logData: AttendanceLog[] = [];
            let firstTimerLogData: NewComerAttendanceLog[] = [];

            if (eventConfig) {
                const startDate = parseDateAsUTC(eventConfig.pre_reg_start_date);
                
                const endDate = parseDateAsUTC(eventConfig.event_date);
                endDate.setUTCHours(23, 59, 59, 999);

                 [logData, firstTimerLogData] = await Promise.all([
                    getAttendanceLogs(startDate, endDate),
                    getFirstTimerAttendanceLogs(startDate, endDate)
                ]);

            } else {
                 [logData, firstTimerLogData] = await Promise.all([
                    getAttendanceLogs(),
                    getFirstTimerAttendanceLogs()
                ]);
            }

            setMembers(memberData);
            setAttendanceLogs(logData);
            setFirstTimerLogs(firstTimerLogData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 30000); 
        return () => clearInterval(intervalId);
    }, [fetchData]);


  const totalMembers = members.length;
  
  const combinedLogs = [
      ...attendanceLogs.map(l => ({ ...l, name: l.member_name, id: l.id, timestamp: l.timestamp, type: l.type, method: l.method, member_name: l.first_timer_name ? l.first_timer_name : l.member_name })),
      ...firstTimerLogs.map(l => ({ ...l, name: l.first_timer_name, id: l.id, timestamp: l.timestamp, type: l.type, method: l.method, member_name: l.first_timer_name}))
  ];
  
  const uniquePreRegistrantNames = new Set(combinedLogs.filter(log => log.type === 'Pre-registration').map(log => log.name));
  const preRegistrations = uniquePreRegistrantNames.size;
  
  const uniqueActualRegistrantNames = new Set(combinedLogs.filter(log => log.type === 'Actual').map(log => log.name));
  const actualRegistrations = uniqueActualRegistrantNames.size;
  
  const latestCheckins = Array.from(
      combinedLogs
          .reduce((map, log) => {
              const existing = map.get(log.name);
              if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
                  map.set(log.name, log);
              }
              return map;
          }, new Map<string, typeof combinedLogs[number]>())
          .values()
  );
  
  const qrCheckins = latestCheckins.filter(log => log.method === 'QR').length;
  const faceCheckins = latestCheckins.filter(log => log.method === 'Face').length;
  
  const sortedLogs = [...combinedLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
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
      
      <div className="border-b pb-6">
        <h2 className="text-lg font-semibold mb-2">Current Event Stats</h2>
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
      </div>
      
      <AttendanceReport />

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
                {sortedLogs.slice(0, 5).map(log => (
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
