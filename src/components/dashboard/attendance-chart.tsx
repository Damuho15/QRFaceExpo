
'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, Legend, CartesianGrid } from 'recharts';
import type { AttendanceLog, NewComerAttendanceLog } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';

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
  "Actual Check-ins": {
    label: "Actual Check-ins",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function AttendanceChart({ data, startDate, endDate }: AttendanceChartProps) {
    const processData = (logs: (AttendanceLog | NewComerAttendanceLog)[], start?: Date | null, end?: Date | null) => {
        if (!start || !end) {
            return [];
        }
        
        const interval = eachDayOfInterval({ start, end });
        const dateKeys = interval.map(d => format(d, 'yyyy-MM-dd'));

        const dailyData: { [key: string]: { "Pre-registered (Cumulative)": number; "Actual Check-ins": number } } = {};
        dateKeys.forEach(key => {
            dailyData[key] = { "Pre-registered (Cumulative)": 0, "Actual Check-ins": 0 };
        });
        
        const preRegLogs = logs.filter(log => log.type === 'Pre-registration')
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const actualLogs = logs.filter(log => log.type === 'Actual');

        // Calculate daily counts for actual check-ins
        actualLogs.forEach(log => {
            const dayKey = format(new Date(log.timestamp), 'yyyy-MM-dd');
            if (dailyData[dayKey]) {
                dailyData[dayKey]["Actual Check-ins"]++;
            }
        });

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
                "Actual Check-ins": dailyData[dayKey]?.["Actual Check-ins"] || 0,
            }
        });

        return combinedData;
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
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
                    label={{ value: 'Actual Check-ins (per day)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#888888' } }}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--chart-1))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
                    label={{ value: 'Pre-registered (cumulative)', angle: 90, position: 'insideRight', offset: 10, style: { textAnchor: 'middle', fill: 'hsl(var(--chart-1))' } }}
                />
                <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="Actual Check-ins" yAxisId="left" fill="var(--color-Actual Check-ins)" radius={4} />
                <Line type="monotone" dataKey="Pre-registered (Cumulative)" yAxisId="right" stroke="var(--color-Pre-registered (Cumulative))" strokeWidth={2} dot={false}/>
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
