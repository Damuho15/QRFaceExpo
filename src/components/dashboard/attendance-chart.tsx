
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
        
        const dailyData = interval.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            
            // Filter logs for the specific day and type 'Pre-registration'
            const logsThisDay = logs.filter(log => {
                const logDateKey = format(new Date(log.timestamp), 'yyyy-MM-dd');
                return logDateKey === dayKey && log.type === 'Pre-registration';
            });

            // Count unique attendees for that day
            const uniqueAttendees = new Set(logsThisDay.map(log => 'member_id' in log ? log.member_id : log.first_timer_id));

            return {
                name: format(day, 'EEE, MMM d'),
                "Pre-registrations": uniqueAttendees.size,
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
