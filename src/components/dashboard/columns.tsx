
'use client';

import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { AttendanceLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteAttendanceLog, deleteFirstTimerAttendanceLog } from '@/lib/supabaseClient';

const TimestampCell = ({ timestamp }: { timestamp: string | Date }) => {
  const [localizedTimestamp, setLocalizedTimestamp] = useState('');

  useEffect(() => {
    // toLocaleString() shows both date and time, which helps debug timezone issues.
    setLocalizedTimestamp(new Date(timestamp).toLocaleString());
  }, [timestamp]);

  return <span>{localizedTimestamp}</span>;
};

export const columns: ColumnDef<AttendanceLog & { attendeeType: 'Member' | 'New Comer' }>[] = [
  {
    accessorKey: 'member_name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Attendee Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('member_name')}</div>
  },
  {
    accessorKey: 'attendeeType',
    header: 'Attendee Type',
    cell: ({ row }) => {
        const type: string = row.getValue('attendeeType');
        return <Badge variant={type === 'Member' ? 'secondary' : 'default'}>{type}</Badge>
    }
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
        const timestamp = row.getValue('timestamp') as string;
        return <TimestampCell timestamp={timestamp} />;
    }
  },
  {
    accessorKey: 'type',
    header: 'Check-in Type',
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
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const log = row.original;
      const { toast } = useToast();

      const handleDelete = async () => {
          try {
              if (log.attendeeType === 'Member') {
                  await deleteAttendanceLog(log.id);
              } else {
                  await deleteFirstTimerAttendanceLog(log.id);
              }
              toast({
                  title: 'Log Deleted',
                  description: `Attendance log for ${log.member_name} has been deleted.`,
              });
              table.options.meta?.onAction(); // This refreshes the table
          } catch (error: any) {
              toast({
                  variant: 'destructive',
                  title: 'Delete Failed',
                  description: error.message || 'Could not delete the log.',
              });
          }
      };

      return (
        <div className="text-right">
          <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                className="text-red-600"
                onSelect={(e) => e.preventDefault()}
                >
                Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the attendance record for {log.member_name} at <TimestampCell timestamp={log.timestamp} />.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </div>
      );
    },
  },
];
