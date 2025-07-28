'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { AttendanceLog } from '@/lib/types';
import { ChartTooltipContent } from '@/components/ui/chart';

interface AttendanceChartProps {
  data: AttendanceLog[];
}

export default function AttendanceChart({ data }: AttendanceChartProps) {
    const processData = (logs: AttendanceLog[]) => {
        const hourlyCounts: { [key: string]: { "Pre-registration": number, Actual: number } } = {};

        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            const hourKey = `${hour}:00`;
            if (!hourlyCounts[hourKey]) {
                hourlyCounts[hourKey] = { "Pre-registration": 0, Actual: 0 };
            }
            hourlyCounts[hourKey][log.type]++;
        });

        return Object.entries(hourlyCounts).map(([name, values]) => ({ name, ...values })).sort((a,b) => parseInt(a.name) - parseInt(b.name));
    }

    const chartData = processData(data);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
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
        />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
        <Bar dataKey="Pre-registration" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Actual" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
