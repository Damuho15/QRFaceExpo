'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AttendanceLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


export const columns: ColumnDef<AttendanceLog>[] = [
  {
    accessorKey: 'memberName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Member Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('memberName')}</div>
  },
  {
    accessorKey: 'timestamp',
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
    },
    cell: ({ row }) => {
        const date = new Date(row.getValue('timestamp'));
        return <div>{date.toLocaleString()}</div>
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
        const type: string = row.getValue('type');
        return <Badge variant={type === 'Actual' ? "default" : "secondary"}>{type}</Badge>
    }
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => {
        const method: string = row.getValue('method');
        return <Badge variant="outline">{method}</Badge>
    }
  },
];
