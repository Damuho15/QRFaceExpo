
'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
import type { AttendanceLog, NewComerAttendanceLog } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';

interface AttendanceChartProps {
  data: (AttendanceLog | NewComerAttendanceLog)[];
  startDate?: Date | null;
  endDate?: Date | null;
}

const chartConfig = {
  "Pre-registrations": {
    label: "Pre-registrations",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const GradientColors = () => {
    return (
      <linearGradient id="colorPreRegistrations" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--color-Pre-registrations)" stopOpacity={0.9} />
        <stop offset="95%" stopColor="var(--color-Pre-registrations)" stopOpacity={0.4} />
      </linearGradient>
    );
};


export default function AttendanceChart({ data, startDate, endDate }: AttendanceChartProps) {
    const processData = (logs: (AttendanceLog | NewComerAttendanceLog)[], start?: Date | null, end?: Date | null) => {
        if (!start || !end || end < start) {
            return [];
        }

        const interval = eachDayOfInterval({ start, end });

        const dailyData = interval.map(day => {
            const preRegistrationLogsForDay = logs.filter(log => {
                const logDate = new Date(log.timestamp);
                // Check if the log is for the current day in the interval and is a 'Pre-registration'
                return isSameDay(logDate, day) && log.type === 'Pre-registration';
            });
            
            const uniqueAttendeesForDay = new Set<string>();
            preRegistrationLogsForDay.forEach(log => {
                 const attendeeId = 'member_id' in log ? log.member_id : log.first_timer_id;
                 uniqueAttendeesForDay.add(attendeeId);
            });

            return {
                name: format(day, 'EEE, MMM d'),
                "Pre-registrations": uniqueAttendeesForDay.size,
            };
        });

        return dailyData;
    }

    const chartData = processData(data, startDate, endDate);
    
    // Enforce a minimum width to ensure the scrollbar is functional
    // 7 days * 80px per bar = 560px. Add some padding.
    const minWidth = "600px";


  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full" style={{ minWidth }}>
        <ResponsiveContainer>
            <BarChart data={chartData}>
                <defs>
                  <GradientColors />
                </defs>
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
                <Bar dataKey="Pre-registrations" fill="url(#colorPreRegistrations)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
