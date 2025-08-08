
'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, Legend, CartesianGrid, LineChart } from 'recharts';
import type { AttendanceLog, NewComerAttendanceLog } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { format, eachDayOfInterval } from 'date-fns';

interface AttendanceChartProps {
  data: (AttendanceLog | NewComerAttendanceLog)[];
  startDate?: Date | null;
  endDate?: Date | null;
}

const chartConfig = {
  "Pre-registered (Cumulative)": {
    label: "Pre-registered (Cumulative)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function AttendanceChart({ data, startDate, endDate }: AttendanceChartProps) {
    const processData = (logs: (AttendanceLog | NewComerAttendanceLog)[], start?: Date | null, end?: Date | null) => {
        if (!start || !end) {
            return [];
        }
        
        const interval = eachDayOfInterval({ start, end });
        const dateKeys = interval.map(d => format(d, 'yyyy-MM-dd'));

        const dailyData: { [key: string]: { "Pre-registered (Cumulative)": number } } = {};
        dateKeys.forEach(key => {
            dailyData[key] = { "Pre-registered (Cumulative)": 0 };
        });
        
        const preRegLogs = logs.filter(log => log.type === 'Pre-registration')
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Calculate cumulative counts for pre-registrations
        let cumulativeCount = 0;
        dateKeys.forEach(dayKey => {
            const logsThisDay = preRegLogs.filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === dayKey);
            cumulativeCount += logsThisDay.length;
            if (dailyData[dayKey]) {
                dailyData[dayKey]["Pre-registered (Cumulative)"] = cumulativeCount;
            }
        });
        
        const combinedData = dateKeys.map(dayKey => {
            return {
                name: format(new Date(dayKey), 'EEE, MMM d'),
                "Pre-registered (Cumulative)": dailyData[dayKey]?.["Pre-registered (Cumulative)"] || 0,
            }
        });

        return combinedData;
    }

    const chartData = processData(data, startDate, endDate);

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer>
            <LineChart data={chartData}>
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
                <Line type="monotone" dataKey="Pre-registered (Cumulative)" stroke="var(--color-Pre-registered (Cumulative))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
            </LineChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}

