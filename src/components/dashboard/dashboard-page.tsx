

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from './stat-card';
import { Users, UserCheck, CalendarClock, QrCode, Fingerprint, Calendar as CalendarIcon, TrendingUp, Loader2, Award, UserPlus, UserRoundCheck, UserMinus, Copy, UserX, Download,ClipboardCheck } from 'lucide-react';
import { getMembers, getAttendanceLogs, getFirstTimerAttendanceLogs, getEventConfig, parseDateAsUTC } from '@/lib/supabaseClient';
import AttendanceChart from './attendance-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import AttendanceDataTable from './attendance-data-table';
import { columns } from './columns';
import type { AttendanceLog, Member, NewComerAttendanceLog, EventConfig } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import * as XLSX from 'xlsx';

const AttendanceReport = ({ defaultStartDate, defaultEndDate }: { defaultStartDate?: Date; defaultEndDate?: Date; }) => {
    const { toast } = useToast();
    const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
    const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);
    const [isLoading, setIsLoading] = useState(false);
    const [totalActualAttendance, setTotalActualAttendance] = useState<number | null>(null);
    const hasFetchedOnLoad = React.useRef(false);

    const handleGenerateReport = useCallback(async (start: Date, end: Date) => {
        if (!start || !end) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date Range',
                description: 'Please select both a start and an end date.',
            });
            return;
        }

        if (start > end) {
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
            const adjustedEndDate = new Date(end);
            adjustedEndDate.setHours(23, 59, 59, 999);

            const [memberLogs, firstTimerLogs] = await Promise.all([
                getAttendanceLogs(start, adjustedEndDate),
                getFirstTimerAttendanceLogs(start, adjustedEndDate)
            ]);
            
            const combinedLogs = [
                ...memberLogs.map(l => ({ ...l, name: l.member_name, timestamp: l.timestamp, type: l.type })), 
                ...firstTimerLogs.map(l => ({ ...l, name: l.first_timer_name, timestamp: l.timestamp, type: l.type }))
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
    }, [toast]);
    
    useEffect(() => {
        if (defaultStartDate && defaultEndDate && !hasFetchedOnLoad.current) {
            handleGenerateReport(defaultStartDate, defaultEndDate);
            hasFetchedOnLoad.current = true;
        }
    }, [defaultStartDate, defaultEndDate, handleGenerateReport]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Actual Attendance Report</CardTitle>
                <CardDescription>
                    Select a date range to see the total unique "Actual" attendance for events in that period.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="space-y-2 w-full">
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
                     <div className="space-y-2 w-full">
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
                    <Button onClick={() => startDate && endDate && handleGenerateReport(startDate, endDate)} disabled={isLoading} className="w-full sm:w-auto">
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

const chartConfig = {
  averageAttendance: {
    label: "Average Attendance",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const MonthlyAverageChart = ({ allLogs }: { allLogs: (AttendanceLog | NewComerAttendanceLog)[] }) => {
    
    const availableYears = useMemo(() => {
        const years = new Set(allLogs.map(log => new Date(log.timestamp).getFullYear()));
        return Array.from(years).sort((a,b) => b - a);
    }, [allLogs]);

    const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    const monthlyAverageData = useMemo(() => {
        const actualLogs = allLogs.filter(log => log.type === 'Actual' && new Date(log.timestamp).getFullYear() === selectedYear);
        
        const attendeesByMonthDay: { [monthKey: string]: { [dayKey: string]: Set<string> } } = {};
        
        actualLogs.forEach(log => {
            const timestamp = new Date(log.timestamp);
            const monthKey = format(timestamp, 'yyyy-MM');
            const dayKey = format(timestamp, 'yyyy-MM-dd');
            const name = 'member_name' in log ? log.member_name : log.first_timer_name;
            
            if (!attendeesByMonthDay[monthKey]) {
                attendeesByMonthDay[monthKey] = {};
            }
            if (!attendeesByMonthDay[monthKey][dayKey]) {
                attendeesByMonthDay[monthKey][dayKey] = new Set();
            }
            attendeesByMonthDay[monthKey][dayKey].add(name);
        });

        const monthsOfYear = Array.from({ length: 12 }, (_, i) => format(new Date(selectedYear, i, 1), 'yyyy-MM'));

        const result = monthsOfYear.map(monthKey => {
            const monthData = attendeesByMonthDay[monthKey];
            if (!monthData) {
                return {
                    month: format(new Date(monthKey), 'MMM'),
                    averageAttendance: 0,
                };
            }

            const eventDays = Object.keys(monthData);
            const numEvents = eventDays.length;
            const totalAttendees = eventDays.reduce((sum, dayKey) => sum + monthData[dayKey].size, 0);
            
            return {
                month: format(new Date(monthKey), 'MMM'),
                averageAttendance: numEvents > 0 ? parseFloat((totalAttendees / numEvents).toFixed(1)) : 0,
            };
        });

        return result;

    }, [allLogs, selectedYear]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className='space-y-1.5'>
                        <CardTitle>Average Monthly Attendance</CardTitle>
                        <CardDescription>
                            Average unique "Actual" attendance per event for each month in {selectedYear}.
                        </CardDescription>
                    </div>
                    <div className="w-full sm:w-auto">
                        <Select
                            value={String(selectedYear)}
                            onValueChange={(value) => setSelectedYear(Number(value))}
                            disabled={availableYears.length === 0}
                        >
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select a year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 {monthlyAverageData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                        <BarChart accessibilityLayer data={monthlyAverageData}>
                            <XAxis
                                dataKey="month"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                            <Bar dataKey="averageAttendance" fill="var(--color-averageAttendance)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                 ) : (
                    <div className="text-center text-muted-foreground py-12">
                        No "Actual" attendance data found for the selected year.
                    </div>
                 )}
            </CardContent>
        </Card>
    )
}

const PromotionHistory = ({ members, isLoading }: { members: Member[], isLoading: boolean }) => {
    
    const promotedMembers = useMemo(() => {
        return members
            .filter(member => !!member.promoted_at)
            .sort((a, b) => new Date(b.promoted_at!).getTime() - new Date(a.promoted_at!).getTime());
    }, [members]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Promotion History</CardTitle>
                <CardDescription>A log of new comers who have been promoted to members.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    {isLoading ? (
                        <div className="space-y-4">
                           {Array.from({ length: 5 }).map((_, i) => (
                             <div key={i} className="flex items-center justify-between">
                                 <Skeleton className="h-5 w-32" />
                                 <Skeleton className="h-5 w-48" />
                             </div>
                           ))}
                        </div>
                    ) : promotedMembers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member Name</TableHead>
                                    <TableHead className="text-right">Promotion Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promotedMembers.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Award className="h-4 w-4 text-accent" />
                                            {member.fullName}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {new Date(member.promoted_at!).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex h-full items-center justify-center pt-10">
                            <p className="text-muted-foreground">No promotion history found.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

const NamesListDialog = ({
    isOpen,
    onClose,
    title,
    names
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    names: string[];
}) => {
    const { toast } = useToast();

    const handleCopy = () => {
        const textToCopy = names.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            toast({
                title: 'Copied to Clipboard',
                description: `${names.length} names have been copied.`
            });
        }, (err) => {
            console.error('Could not copy text: ', err);
            toast({
                variant: 'destructive',
                title: 'Copy Failed',
                description: 'Could not copy the list to your clipboard.'
            });
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        A list of {names.length} attendees for this category.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72 mt-4">
                    <div className="space-y-2 pr-4">
                        {names.length > 0 ? (
                            names.map((name, index) => (
                                <div key={index} className="text-sm p-2 rounded-md bg-muted/50">
                                    {name}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center pt-8">
                                No attendees in this category.
                            </p>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 sm:justify-between">
                    {names.length > 0 && (
                        <Button variant="secondary" onClick={handleCopy}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy All
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose} className={cn(names.length === 0 && 'w-full')}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const InactiveMembersDialog = ({
    isOpen,
    onClose,
    inactiveMembers,
    monthName
}: {
    isOpen: boolean;
    onClose: () => void;
    inactiveMembers: Member[];
    monthName: string;
}) => {
    const { toast } = useToast();
    
    const handleDownload = () => {
        const dataToExport = inactiveMembers.map(member => ({
            'Full Name': member.fullName,
            'Email': member.email || 'N/A',
            'Phone Number': member.phone || 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inactive Members");
        XLSX.writeFile(workbook, `Inactive_Members_${monthName}.xlsx`);
        
        toast({
            title: "Download Started",
            description: `An Excel file with ${inactiveMembers.length} inactive members is being downloaded.`
        });
    };

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Inactive Members for {monthName}</DialogTitle>
                    <DialogDescription>
                        A list of {inactiveMembers.length} members with no "Actual" attendance last month.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72 mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Full Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inactiveMembers.length > 0 ? (
                                inactiveMembers.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.fullName}</TableCell>
                                        <TableCell>{member.email || 'N/A'}</TableCell>
                                        <TableCell>{member.phone || 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No inactive members found for {monthName}.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <DialogFooter className="pt-4 sm:justify-between">
                     {inactiveMembers.length > 0 && (
                        <Button variant="secondary" onClick={handleDownload}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Excel
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose} className={cn(inactiveMembers.length === 0 && 'w-full')}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [firstTimerLogs, setFirstTimerLogs] = useState<NewComerAttendanceLog[]>([]);
    const [allTimeLogs, setAllTimeLogs] = useState<(AttendanceLog | NewComerAttendanceLog)[]>([]);
    const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
    const [inactiveMembers, setInactiveMembers] = useState<Member[]>([]);

    // State for the names list dialog
    const [isNamesDialogOpen, setIsNamesDialogOpen] = useState(false);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogNames, setDialogNames] = useState<string[]>([]);
    
    // State for inactive members dialog
    const [isInactiveDialogOpen, setIsInactiveDialogOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [memberData, fetchedEventConfig, allMemberLogs, allFirstTimerLogs] = await Promise.all([
                getMembers(),
                getEventConfig(),
                getAttendanceLogs(), // Fetch all logs for monthly report
                getFirstTimerAttendanceLogs() // Fetch all logs for monthly report
            ]);
            
            setEventConfig(fetchedEventConfig);
            setMembers(memberData);

            const combinedAllLogs = [
                ...allMemberLogs,
                ...allFirstTimerLogs,
            ];
            setAllTimeLogs(combinedAllLogs);
            
            let currentEventLogs: AttendanceLog[] = [];
            let currentFirstTimerLogs: NewComerAttendanceLog[] = [];

            if (fetchedEventConfig) {
                const startDate = parseDateAsUTC(fetchedEventConfig.pre_reg_start_date);
                const endDate = parseDateAsUTC(fetchedEventConfig.event_date);
                endDate.setUTCHours(23, 59, 59, 999);

                currentEventLogs = allMemberLogs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= startDate && logDate <= endDate;
                });
                currentFirstTimerLogs = allFirstTimerLogs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= startDate && logDate <= endDate;
                })

            } else {
                 currentEventLogs = allMemberLogs;
                 currentFirstTimerLogs = allFirstTimerLogs;
            }

            setAttendanceLogs(currentEventLogs);
            setFirstTimerLogs(currentFirstTimerLogs);

            // --- Inactive Member Calculation ---
            const today = new Date();
            const prevMonthDate = subMonths(today, 1);
            const startOfPrevMonth = startOfMonth(prevMonthDate);
            const endOfPrevMonth = endOfMonth(prevMonthDate);

            const prevMonthLogs = allMemberLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                return log.type === 'Actual' && logDate >= startOfPrevMonth && logDate <= endOfPrevMonth;
            });
            const attendedMemberIds = new Set(prevMonthLogs.map(log => log.member_id));
            const inactive = memberData.filter(member => !attendedMemberIds.has(member.id));
            setInactiveMembers(inactive);

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


  
  const combinedLogs = useMemo(() => [
      ...attendanceLogs.map(l => ({ ...l, member_name: l.member_name, type: l.type, method: l.method, timestamp: l.timestamp, id: l.id })),
      ...firstTimerLogs.map(l => ({ ...l, id: l.id, member_name: l.first_timer_name, member_id: l.first_timer_id, type: l.type, method: l.method, timestamp: l.timestamp }))
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

  const { totalPreRegistrations, actualRegistrations, preRegisteredNoShows, allPreRegisteredNames } = useMemo(() => {
        const allPreRegistered = new Set<string>();
        const allActual = new Set<string>();

        combinedLogs.forEach(log => {
            const name = log.member_name;
            if (log.type === 'Pre-registration') {
                allPreRegistered.add(name);
            } else if (log.type === 'Actual') {
                allActual.add(name);
            }
        });

        const noShows = new Set([...allPreRegistered].filter(name => !allActual.has(name)));

        return {
            totalPreRegistrations: allPreRegistered.size,
            allPreRegisteredNames: Array.from(allPreRegistered),
            actualRegistrations: allActual.size,
            preRegisteredNoShows: Array.from(noShows),
        };
    }, [combinedLogs]);
  
  const { qrCheckins, faceCheckins } = useMemo(() => {
      let qr = 0;
      let face = 0;
      latestLogs.forEach(log => {
          if (log.method === 'QR') qr++;
          if (log.method === 'Face') face++;
      });
      return { qrCheckins: qr, faceCheckins: face };
  }, [latestLogs]);
  
  const attendanceReportDefaults = useMemo(() => {
    if (!eventConfig) {
      const today = new Date();
      const defaultEndDate = subDays(today, 1);
      const defaultStartDate = subDays(defaultEndDate, 6);
      return { defaultStartDate, defaultEndDate };
    }
    // Calculate the week before the current event date.
    const eventDate = parseDateAsUTC(eventConfig.event_date);
    const defaultEndDate = subDays(eventDate, 1); // e.g., Saturday if event is Sunday
    const defaultStartDate = subDays(defaultEndDate, 6); // Go back 6 more days to get a full week
    return { defaultStartDate, defaultEndDate };
  }, [eventConfig]);
  
  const { membersActualOnly, firstTimersActualOnly } = useMemo(() => {
        const memberAttendance = new Map<string, Set<string>>();
        attendanceLogs.forEach(log => {
            if (!memberAttendance.has(log.member_name)) {
                memberAttendance.set(log.member_name, new Set());
            }
            memberAttendance.get(log.member_name)!.add(log.type);
        });

        const firstTimerAttendance = new Map<string, Set<string>>();
        firstTimerLogs.forEach(log => {
            if (!firstTimerAttendance.has(log.first_timer_name)) {
                firstTimerAttendance.set(log.first_timer_name, new Set());
            }
            firstTimerAttendance.get(log.first_timer_name)!.add(log.type);
        });

        const membersActualOnlyList = Array.from(memberAttendance.entries())
            .filter(([, types]) => types.has('Actual') && !types.has('Pre-registration'))
            .map(([name]) => name);

        const firstTimersActualOnlyList = Array.from(firstTimerAttendance.entries())
            .filter(([, types]) => types.has('Actual') && !types.has('Pre-registration'))
            .map(([name]) => name);

        return {
            membersActualOnly: membersActualOnlyList,
            firstTimersActualOnly: firstTimersActualOnlyList,
        };
    }, [attendanceLogs, firstTimerLogs]);

    const handleStatCardClick = (title: string, names: string[]) => {
        setDialogTitle(title);
        setDialogNames(names);
        setIsNamesDialogOpen(true);
    };

    const previousMonthName = format(subMonths(new Date(), 1), 'MMMM yyyy');
  
  if (loading) {
      return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-8" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
                <Card className="lg:col-span-4"><CardHeader><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-64" /></CardHeader><CardContent><Skeleton className="h-56 w-full" /></CardContent></Card>
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
    <>
    <div className="flex flex-col gap-6 p-4 md:p-6">
       <div>
        <h1 className="text-2xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">
          An overview of your event attendance.
        </p>
      </div>
      
      <div className="border-b pb-6">
        <h2 className="text-lg font-semibold mb-2">Current Event Stats</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard 
                title="Pre-registered (No-Show)" 
                value={preRegisteredNoShows.length} 
                icon={UserCheck}
                onClick={() => handleStatCardClick("Pre-registered (No-Show)", preRegisteredNoShows)}
                subIcon={UserMinus}
            />
             <StatCard 
                title="Total Pre-registered" 
                value={totalPreRegistrations} 
                icon={ClipboardCheck}
                onClick={() => handleStatCardClick("Total Pre-registered", allPreRegisteredNames)}
            />
            <StatCard title="Actual-day Registrations" value={actualRegistrations} icon={CalendarClock} />
            <StatCard 
                title="Members (Actual Only)" 
                value={membersActualOnly.length} 
                icon={UserRoundCheck} 
                onClick={() => handleStatCardClick("Members (Actual Only)", membersActualOnly)}
            />
            <StatCard 
                title="New Comers (Actual Only)" 
                value={firstTimersActualOnly.length} 
                icon={UserPlus} 
                onClick={() => handleStatCardClick("New Comers (Actual Only)", firstTimersActualOnly)}
            />
            <StatCard 
                title="Check-in Methods" 
                value={`${qrCheckins} QR / ${faceCheckins} Face`} 
                icon={QrCode} 
                subIcon={Fingerprint} 
            />
            <StatCard 
                title={`Inactive Members (${previousMonthName})`}
                value={inactiveMembers.length} 
                icon={UserX}
                onClick={() => setIsInactiveDialogOpen(true)}
            />
        </div>
      </div>
      
      <AttendanceReport {...attendanceReportDefaults} />

      <MonthlyAverageChart allLogs={allTimeLogs} />

      <PromotionHistory members={members} isLoading={loading} />

      <div className="grid grid-cols-1 gap-4">
        <Card>
            <CardHeader>
                <CardTitle>Attendance Over Time</CardTitle>
                <CardDescription>A summary of check-ins throughout the event.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <AttendanceChart data={attendanceLogs} />
            </CardContent>
        </Card>
      </div>

      <AttendanceDataTable columns={columns} data={latestLogs} isLoading={loading} />

    </div>
    <NamesListDialog
        isOpen={isNamesDialogOpen}
        onClose={() => setIsNamesDialogOpen(false)}
        title={dialogTitle}
        names={dialogNames}
    />
     <InactiveMembersDialog 
        isOpen={isInactiveDialogOpen}
        onClose={() => setIsInactiveDialogOpen(false)}
        inactiveMembers={inactiveMembers}
        monthName={previousMonthName}
     />
    </>
  );
}
