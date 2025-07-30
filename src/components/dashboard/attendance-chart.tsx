
'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { AttendanceLog } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

interface AttendanceChartProps {
  data: AttendanceLog[];
}

const chartConfig = {
  "Pre-registration": {
    label: "Pre-registration",
    color: "hsl(var(--primary))",
  },
  "Actual": {
    label: "Actual",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export default function AttendanceChart({ data }: AttendanceChartProps) {
    const processData = (logs: AttendanceLog[]) => {
        const hourlyCounts: { [key: string]: { "Pre-registration": number, Actual: number } } = {};

        logs.forEach(log => {
            const hour = new Date(log.timestamp).getUTCHours(); // Use UTC hours
            const hourKey = `${hour}:00`;
            if (!hourlyCounts[hourKey]) {
                hourlyCounts[hourKey] = { "Pre-registration": 0, Actual: 0 };
            }
            if (log.type === "Pre-registration" || log.type === "Actual") {
                hourlyCounts[hourKey][log.type]++;
            }
        });

        const allHours = Array.from({length: 24}, (_, i) => `${i}:00`);
        const fullHourlyCounts = allHours.map(hourKey => {
            return {
                name: hourKey,
                "Pre-registration": hourlyCounts[hourKey]?.["Pre-registration"] || 0,
                "Actual": hourlyCounts[hourKey]?.["Actual"] || 0,
            }
        });

        return fullHourlyCounts;
    }

    const chartData = processData(data);

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart accessibilityLayer data={chartData}>
            <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.split(':')[0]}
            />
            <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            allowDecimals={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="Pre-registration" fill="var(--color-Pre-registration)" radius={4} />
            <Bar dataKey="Actual" fill="var(--color-Actual)" radius={4} />
        </BarChart>
    </ChartContainer>
  );
}
