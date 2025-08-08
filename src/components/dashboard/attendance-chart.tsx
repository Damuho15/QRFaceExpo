
'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { AttendanceLog, NewComerAttendanceLog } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { format, eachDayOfInterval } from 'date-fns';

interface AttendanceChartProps {
  data: (AttendanceLog | NewComerAttendanceLog)[];
  startDate?: Date | null;
  endDate?: Date | null;
}

const chartConfig = {
  "Pre-registrations": {
    label: "Pre-registrations",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function AttendanceChart({ data, startDate, endDate }: AttendanceChartProps) {
    const processData = (logs: (AttendanceLog | NewComerAttendanceLog)[], start?: Date | null, end?: Date | null) => {
        if (!start || !end || end < start) {
            return [];
        }
        
        const interval = eachDayOfInterval({ start, end });
        const alreadyCounted = new Set<string>();

        const dailyData = interval.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            
            const logsThisDay = logs.filter(log => {
                const logDateKey = format(new Date(log.timestamp), 'yyyy-MM-dd');
                return logDateKey === dayKey && log.type === 'Pre-registration';
            });
            
            let uniqueRegistrationsThisDay = 0;
            const uniqueAttendeesForDay = new Set<string>();

            logsThisDay.forEach(log => {
                const attendeeId = 'member_id' in log ? log.member_id : log.first_timer_id;
                
                // Only count if this person hasn't been counted on a previous day
                // and hasn't already been counted for today.
                if (!alreadyCounted.has(attendeeId) && !uniqueAttendeesForDay.has(attendeeId)) {
                    uniqueRegistrationsThisDay++;
                    uniqueAttendeesForDay.add(attendeeId);
                }
            });

            // After counting for the day, add these attendees to the master "alreadyCounted" set
            // so they won't be counted on subsequent days.
            uniqueAttendeesForDay.forEach(id => alreadyCounted.add(id));

            return {
                name: format(day, 'EEE, MMM d'),
                "Pre-registrations": uniqueRegistrationsThisDay,
            };
        });

        return dailyData;
    }

    const chartData = processData(data, startDate, endDate);

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer>
            <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="name"
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
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
                />
                <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="Pre-registrations" fill="var(--color-Pre-registrations)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
