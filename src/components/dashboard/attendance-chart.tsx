
'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, Legend, CartesianGrid } from 'recharts';
import type { AttendanceLog, NewComerAttendanceLog } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

interface AttendanceChartProps {
  data: (AttendanceLog | NewComerAttendanceLog)[];
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

export default function AttendanceChart({ data }: AttendanceChartProps) {
    const processData = (logs: (AttendanceLog | NewComerAttendanceLog)[]) => {
        const preRegLogs = logs.filter(log => log.type === 'Pre-registration')
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const actualLogs = logs.filter(log => log.type === 'Actual');

        const hourlyCounts: { [key: string]: { "Actual Check-ins": number } } = {};
        actualLogs.forEach(log => {
            const hour = new Date(log.timestamp).getUTCHours();
            const hourKey = `${hour}:00`;
            if (!hourlyCounts[hourKey]) {
                hourlyCounts[hourKey] = { "Actual Check-ins": 0 };
            }
            hourlyCounts[hourKey]["Actual Check-ins"]++;
        });

        const cumulativePreReg: { [key: string]: { "Pre-registered (Cumulative)": number } } = {};
        let cumulativeCount = 0;
        
        // Find the earliest pre-registration hour
        const firstPreRegHour = preRegLogs.length > 0 ? new Date(preRegLogs[0].timestamp).getUTCHours() : 0;

        for (let i = 0; i < 24; i++) {
             const hourKey = `${i}:00`;
             const logsThisHour = preRegLogs.filter(log => new Date(log.timestamp).getUTCHours() === i);
             cumulativeCount += logsThisHour.length;

             // Only start showing cumulative data from the first hour someone actually pre-registered
             if (i >= firstPreRegHour) {
                cumulativePreReg[hourKey] = { "Pre-registered (Cumulative)": cumulativeCount };
             } else {
                 cumulativePreReg[hourKey] = { "Pre-registered (Cumulative)": 0 };
             }
        }
        
        const allHours = Array.from({length: 24}, (_, i) => `${i}:00`);
        const combinedData = allHours.map(hourKey => {
            return {
                name: hourKey,
                "Pre-registered (Cumulative)": cumulativePreReg[hourKey]?.["Pre-registered (Cumulative)"] || 0,
                "Actual Check-ins": hourlyCounts[hourKey]?.["Actual Check-ins"] || 0,
            }
        });

        return combinedData;
    }

    const chartData = processData(data);

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
                    tickFormatter={(value) => value.split(':')[0]}
                />
                <YAxis
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
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
