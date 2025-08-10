

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from './stat-card';
import { Users, UserCheck, CalendarClock, QrCode, Fingerprint, Calendar as CalendarIcon, TrendingUp, Loader2, Award, UserPlus, UserRoundCheck, UserMinus, Copy, UserX, Download,ClipboardCheck, Cake, PartyPopper, Walking, UserRoundCog } from 'lucide-react';
import { getMembers, getAttendanceLogs, getFirstTimerAttendanceLogs, getEventConfig, parseDateAsUTC, getMemberCount, getMemberAttendanceForPeriod } from '@/lib/supabaseClient';
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
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

const AttendanceReport = ({ defaultStartDate, defaultEndDate, allLogs }: { defaultStartDate?: Date; defaultEndDate?: Date; allLogs: (AttendanceLog | NewComerAttendanceLog)[] }) => {
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

        // Filter logs that are already in memory
        const adjustedEndDate = new Date(end);
        adjustedEndDate.setHours(23, 59, 59, 999);

        const logsInRange = allLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= adjustedEndDate;
        });
        
        const combinedLogs = logsInRange.map(l => ({ 
            ...l, 
            name: 'member_name' in l ? l.member_name : l.first_timer_name, 
            timestamp: l.timestamp, 
            type: l.type 
        }));

        const actualLogs = combinedLogs.filter(log => log.type === 'Actual');
        const uniqueAttendance = new Set<string>();

        actualLogs.forEach(log => {
            const eventDate = new Date(log.timestamp).toISOString().split('T')[0];
            const uniqueKey = `${log.name}-${eventDate}`;
            uniqueAttendance.add(uniqueKey);
        });
        
        setTotalActualAttendance(uniqueAttendance.size);
        setIsLoading(false);

    }, [toast, allLogs]);
    
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

const monthlyChartConfig = {
  averageAttendance: {
    label: "Average Attendance",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const MonthlyAverageChart = ({ allLogs, isLoading }: { allLogs: (AttendanceLog | NewComerAttendanceLog)[], isLoading: boolean }) => {
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
                    <div className="space-y-1.5">
                        <CardTitle>Average Monthly Attendance</CardTitle>
                        <CardDescription>
                            Average unique "Actual" attendance per event for each month in {selectedYear}.
                        </CardDescription>
                    </div>
                    <div className="w-full sm:w-auto">
                        <Select
                            value={String(selectedYear)}
                            onValueChange={(value) => setSelectedYear(Number(value))}
                            disabled={availableYears.length === 0 || isLoading}
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
                 {isLoading ? (
                    <div className="flex justify-center items-center min-h-[250px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                 ) : monthlyAverageData.length > 0 ? (
                    <ChartContainer config={monthlyChartConfig} className="min-h-[250px] w-full">
                        <BarChart accessibilityLayer data={monthlyAverageData}>
                             <defs>
                                <linearGradient id="colorAverageAttendance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-averageAttendance)" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="var(--color-averageAttendance)" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
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
                            <Bar dataKey="averageAttendance" fill="url(#colorAverageAttendance)" radius={4} />
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

const PromotionHistory = ({ allMembers, isLoading }: { allMembers: Member[], isLoading: boolean }) => {
    const promotedMembers = useMemo(() => {
        return allMembers
            .filter(member => !!member.promoted_at)
            .sort((a, b) => new Date(b.promoted_at!).getTime() - new Date(a.promoted_at!).getTime());
    }, [allMembers]);

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

type DetailedName = { name: string, type: 'Member' | 'New Comer' };

type NamesListDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  names: DetailedName[];
  groupedNames?: {
      checkedIn: DetailedName[];
      walkIns: DetailedName[];
  };
};

const NamesListDialog = ({
    isOpen,
    onClose,
    title,
    names,
    groupedNames,
}: NamesListDialogProps) => {
    const { toast } = useToast();

    const renderList = (list: DetailedName[], listTitle: string) => (
        <div>
            <h4 className="text-md font-semibold mb-2">{listTitle} ({list.length})</h4>
            {list.length > 0 ? (
                list.map((item, index) => (
                    <div key={`${listTitle}-${index}`} className="text-sm p-2 mb-2 rounded-md bg-muted/50 flex justify-between items-center">
                        <span>{item.name}</span>
                        <Badge variant={item.type === 'Member' ? 'secondary' : 'default'}>{item.type}</Badge>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No attendees in this category.
                </p>
            )}
        </div>
    );

    const handleCopy = () => {
        let textToCopy = '';
        let totalNames = 0;

        if (groupedNames) {
            textToCopy += 'Checked-in (Pre-registered):\n';
            textToCopy += groupedNames.checkedIn.map(item => item.name).join('\n') + '\n\n';
            textToCopy += 'Walk-ins:\n';
            textToCopy += groupedNames.walkIns.map(item => item.name).join('\n');
            totalNames = groupedNames.checkedIn.length + groupedNames.walkIns.length;
        } else {
            textToCopy = names.map(item => item.name).join('\n');
            totalNames = names.length;
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            toast({
                title: 'Copied to Clipboard',
                description: `${totalNames} names have been copied.`
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
                     {groupedNames ? (
                        <DialogDescription>
                            A breakdown of attendees for this category.
                        </DialogDescription>
                    ) : (
                        <DialogDescription>
                            A list of {names.length} attendees for this category.
                        </DialogDescription>
                    )}
                </DialogHeader>
                <ScrollArea className="h-72 mt-2">
                    <div className="space-y-4 pr-4">
                       {groupedNames ? (
                           <>
                                {renderList(groupedNames.checkedIn, 'Checked-in (Pre-registered)')}
                                {renderList(groupedNames.walkIns, 'Walk-ins')}
                           </>
                       ) : (
                           renderList(names, 'Attendees')
                       )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 sm:justify-between">
                    {(names.length > 0 || (groupedNames && (groupedNames.checkedIn.length > 0 || groupedNames.walkIns.length > 0))) && (
                        <Button variant="secondary" onClick={handleCopy}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy All
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
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

const CelebrantsDashboard = ({ allMembers, isLoading }: { allMembers: Member[], isLoading: boolean }) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

    const { birthdayCelebrants, anniversaryCelebrants } = useMemo(() => {
        const birthdays: { name: string, date: string }[] = [];
        const anniversaries: { name: string, date: string }[] = [];

        allMembers.forEach(member => {
            if (member.birthday) {
                const birthDate = new Date(member.birthday);
                if (birthDate.getUTCMonth() === selectedMonth) {
                    birthdays.push({
                        name: member.fullName,
                        date: format(birthDate, 'MMMM d')
                    });
                }
            }
            if (member.weddingAnniversary) {
                const anniversaryDate = new Date(member.weddingAnniversary);
                if (anniversaryDate.getUTCMonth() === selectedMonth) {
                    anniversaries.push({
                        name: member.fullName,
                        date: format(anniversaryDate, 'MMMM d')
                    });
                }
            }
        });
        
        const sortCelebrants = (a: { name: string, date: string }, b: { name: string, date: string }) => {
            return new Date(a.date + ', 2000').getTime() - new Date(b.date + ', 2000').getTime();
        }

        return {
            birthdayCelebrants: birthdays.sort(sortCelebrants),
            anniversaryCelebrants: anniversaries.sort(sortCelebrants)
        };
    }, [allMembers, selectedMonth]);

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: format(new Date(0, i), 'MMMM')
    }));

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Monthly Celebrants</CardTitle>
                        <CardDescription>Members celebrating birthdays and anniversaries.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))} disabled={isLoading}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(month => (
                                    <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center mb-4"><Cake className="mr-2 h-5 w-5 text-pink-500" /> Birthday Celebrants</h3>
                        <Separator />
                        <ScrollArea className="h-60 mt-4">
                            {isLoading ? (
                                <div className="space-y-4 pr-4">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                                </div>
                            ) : birthdayCelebrants.length > 0 ? (
                                <div className="space-y-2 pr-4">
                                {birthdayCelebrants.map(c => (
                                    <div key={c.name} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                        <span>{c.name}</span>
                                        <span className="font-medium">{c.date}</span>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center pt-10">No birthdays this month.</p>
                            )}
                        </ScrollArea>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold flex items-center mb-4"><PartyPopper className="mr-2 h-5 w-5 text-amber-500" /> Wedding Anniversaries</h3>
                        <Separator />
                        <ScrollArea className="h-60 mt-4">
                           {isLoading ? (
                                <div className="space-y-4 pr-4">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                                </div>
                            ) : anniversaryCelebrants.length > 0 ? (
                                <div className="space-y-2 pr-4">
                                {anniversaryCelebrants.map(c => (
                                    <div key={c.name} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                        <span>{c.name}</span>
                                        <span className="font-medium">{c.date}</span>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center pt-10">No anniversaries this month.</p>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    // Data states
    const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
    const [currentEventLogs, setCurrentEventLogs] = useState<(AttendanceLog | NewComerAttendanceLog)[]>([]);
    const [allLogs, setAllLogs] = useState<(AttendanceLog | NewComerAttendanceLog)[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [inactiveMembers, setInactiveMembers] = useState<Member[]>([]);
    
    // Dialog states
    const [isNamesDialogOpen, setIsNamesDialogOpen] = useState(false);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogNames, setDialogNames] = useState<DetailedName[]>([]);
    const [dialogGroupedNames, setDialogGroupedNames] = useState<{ checkedIn: DetailedName[]; walkIns: DetailedName[]; } | undefined>(undefined);
    const [isInactiveDialogOpen, setIsInactiveDialogOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch critical data in parallel
            const [
                fetchedEventConfig, 
                { logs: memberLogs },
                { logs: firstTimerLogs },
                { members: allMembersData },
            ] = await Promise.all([
                getEventConfig(),
                getAttendanceLogs(), // Fetch all member logs once
                getFirstTimerAttendanceLogs(), // Fetch all 1st timer logs once
                getMembers(0, 0), // Fetch all members once
            ]);

            setEventConfig(fetchedEventConfig);
            setAllMembers(allMembersData);
            const combinedLogs = [...memberLogs, ...firstTimerLogs];
            setAllLogs(combinedLogs);
            
            // --- Current Event Logs Calculation ---
            if (fetchedEventConfig) {
                const startDate = parseDateAsUTC(fetchedEventConfig.pre_reg_start_date);
                const endDate = parseDateAsUTC(fetchedEventConfig.event_date);
                endDate.setUTCHours(23, 59, 59, 999);
                
                const currentLogs = combinedLogs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= startDate && logDate <= endDate;
                });
                setCurrentEventLogs(currentLogs);
            } else {
                // If no config, maybe show all logs as "current"? Or an empty array?
                // For now, let's keep it consistent with the original logic
                 setCurrentEventLogs(combinedLogs);
            }

            // --- Inactive Member Calculation ---
            const today = new Date();
            const prevMonthDate = subMonths(today, 1);
            const startOfPrevMonth = startOfMonth(prevMonthDate);
            const endOfPrevMonth = endOfMonth(prevMonthDate);

            // Filter logs for the previous month (already in memory)
            const prevMonthMemberLogs = memberLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= startOfPrevMonth && logDate <= endOfPrevMonth;
            });
            
            const attendedMemberIds = new Set(prevMonthMemberLogs
                .filter(log => log.type === 'Actual')
                .map(log => log.member_id)
            );
            
            const inactive = allMembersData.filter(member => !attendedMemberIds.has(member.id));
            setInactiveMembers(inactive);

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchData();
    }, [fetchData]);
  
    const latestLogs = useMemo(() => {
      const latestCheckins = new Map<string, (typeof currentEventLogs)[number]>();
      
      currentEventLogs.forEach(log => {
          const name = 'member_name' in log ? log.member_name : (log as any).first_timer_name;
          const existing = latestCheckins.get(name);
          if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
              latestCheckins.set(name, log);
          }
      });
      
      return Array.from(latestCheckins.values())
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [currentEventLogs]);

  const {
        totalPreRegistrations,
        allPreRegisteredNames,
        preRegisteredNoShows,
        actualDayStats,
    } = useMemo(() => {
        const attendeeTypes = new Map<string, { types: Set<'Pre-registration' | 'Actual'>, attendee: DetailedName }>();

        currentEventLogs.forEach(log => {
            const name = 'member_name' in log ? log.member_name : log.first_timer_name;
            const attendeeType = 'member_id' in log ? 'Member' : 'New Comer';
            
            if (!attendeeTypes.has(name)) {
                attendeeTypes.set(name, { types: new Set(), attendee: { name, type: attendeeType } });
            }
            attendeeTypes.get(name)!.types.add(log.type);
        });

        const allPreRegistered = Array.from(attendeeTypes.values())
            .filter(({ types }) => types.has('Pre-registration'))
            .map(({ attendee }) => attendee);

        const noShows = allPreRegistered
            .filter(attendee => !attendeeTypes.get(attendee.name)?.types.has('Actual'));

        const actualAttendees = Array.from(attendeeTypes.values())
            .filter(({ types }) => types.has('Actual'));
            
        const checkedIn = actualAttendees
            .filter(({ types }) => types.has('Pre-registration'))
            .map(({ attendee }) => attendee);

        const walkIns = actualAttendees
            .filter(({ types }) => !types.has('Pre-registration'))
            .map(({ attendee }) => attendee);

        return {
            totalPreRegistrations: allPreRegistered.length,
            allPreRegisteredNames: allPreRegistered,
            preRegisteredNoShows: noShows,
            actualDayStats: {
                total: actualAttendees.length,
                checkedIn,
                walkIns,
            }
        };
    }, [currentEventLogs]);
  
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
  
    const handleStatCardClick = (title: string, names: DetailedName[], groupedNames?: { checkedIn: DetailedName[], walkIns: DetailedName[] }) => {
        setDialogTitle(title);
        setDialogNames(names);
        setDialogGroupedNames(groupedNames);
        setIsNamesDialogOpen(true);
    };

    const previousMonthName = format(subMonths(new Date(), 1), 'MMMM yyyy');

    const chartDateRange = useMemo(() => {
        if (!eventConfig) return { startDate: null, endDate: null };
        const startDate = parseDateAsUTC(eventConfig.pre_reg_start_date);
        const endDate = parseDateAsUTC(eventConfig.event_date);
        return { startDate, endDate };
    }, [eventConfig]);
  
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
                title="Total Pre-registered" 
                value={totalPreRegistrations} 
                icon={ClipboardCheck}
                onClick={() => handleStatCardClick("Total Pre-registered", allPreRegisteredNames)}
            />
            <StatCard 
                title="Actual-day Registrations" 
                value={actualDayStats.total} 
                icon={CalendarClock}
                description={`${actualDayStats.checkedIn.length} Checked-in, ${actualDayStats.walkIns.length} Walk-ins`}
                onClick={() => handleStatCardClick("Actual-day Registrations", [], { checkedIn: actualDayStats.checkedIn, walkIns: actualDayStats.walkIns })}
            />
            <StatCard 
                title="Pre-registered (No-Show)" 
                value={preRegisteredNoShows.length} 
                icon={UserMinus}
                onClick={() => handleStatCardClick("Pre-registered (No-Show)", preRegisteredNoShows)}
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

      <div className="grid grid-cols-1 gap-4">
        <Card>
            <CardHeader>
                <CardTitle>Attendance Over Time</CardTitle>
                <CardDescription>A summary of unique pre-registrations throughout the event week.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <AttendanceChart 
                    data={currentEventLogs} 
                    startDate={chartDateRange.startDate} 
                    endDate={chartDateRange.endDate} 
                />
            </CardContent>
        </Card>
      </div>

      <CelebrantsDashboard allMembers={allMembers} isLoading={loading} />

      <AttendanceReport {...attendanceReportDefaults} allLogs={allLogs} />

      <MonthlyAverageChart allLogs={allLogs} isLoading={loading} />
      
      <PromotionHistory allMembers={allMembers} isLoading={loading} />

    </div>
    <NamesListDialog
        isOpen={isNamesDialogOpen}
        onClose={() => setIsNamesDialogOpen(false)}
        title={dialogTitle}
        names={dialogNames}
        groupedNames={dialogGroupedNames}
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
