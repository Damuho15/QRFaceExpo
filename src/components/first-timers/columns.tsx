
'use client';

import React, { useState, useEffect } from 'react';
import type { ColumnDef, FilterFn } from '@tanstack/react-table';
import type { FirstTimer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import FirstTimerDialog from './first-timer-dialog';
import Image from 'next/image';
import QrCodeDialog from './qr-code-dialog';
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
import { deleteFirstTimer } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

const caseInsensitiveFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const rowValue = row.getValue(columnId) as string;
    if (!rowValue) {
        return false;
    }
    return rowValue.toLowerCase().includes(String(value).toLowerCase());
}

const TimestampCell = ({ timestamp }: { timestamp: string | Date }) => {
  const [localizedTimestamp, setLocalizedTimestamp] = useState('');

  useEffect(() => {
    setLocalizedTimestamp(new Date(timestamp).toLocaleString());
  }, [timestamp]);

  return <div>{localizedTimestamp}</div>;
};

export const columns: ColumnDef<FirstTimer>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'qrCodePayload',
    header: 'QR Code',
    cell: ({ row }) => {
      const firstTimer = row.original;
      if (!firstTimer.qrCodePayload) return null;
      return (
        <QrCodeDialog firstTimer={firstTimer}>
            <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                firstTimer.qrCodePayload
            )}`}
            alt={`QR Code for ${firstTimer.fullName}`}
            width={80}
            height={80}
            data-ai-hint="qr code"
            className="cursor-pointer"
            />
        </QrCodeDialog>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'fullName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Full Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: caseInsensitiveFilter,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone Number',
  },
   {
    accessorKey: 'created_at',
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date Added
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
    },
    cell: ({ row }) => {
        const timestamp = row.getValue('created_at') as string;
        return <TimestampCell timestamp={timestamp} />;
    }
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const firstTimer = row.original;
      const { toast } = useToast();

      const handleDelete = async () => {
          try {
              await deleteFirstTimer(firstTimer.id);
              toast({
                  title: 'New Comer Deleted',
                  description: `${firstTimer.fullName} has been successfully deleted.`,
              });
              table.options.meta?.onAction(); // This refreshes the table
          } catch (error: any) {
              toast({
                  variant: 'destructive',
                  title: 'Delete Failed',
                  description: error.message || 'Could not delete the new comer.',
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
              <FirstTimerDialog
                mode="edit"
                firstTimerToEdit={firstTimer}
                onSuccess={() => table.options.meta?.onAction()}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
              </FirstTimerDialog>
              <DropdownMenuSeparator />
              <QrCodeDialog firstTimer={firstTimer}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>View QR Code</DropdownMenuItem>
              </QrCodeDialog>

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
                        This action cannot be undone. This will permanently delete the
                        record for {firstTimer.fullName} and remove their data from our servers.
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
