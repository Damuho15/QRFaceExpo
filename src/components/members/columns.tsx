'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Member } from '@/lib/types';
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
import MemberDialog from './member-dialog';
import Image from 'next/image';

export const columns: ColumnDef<Member>[] = [
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
        const member = row.original;
        if (!member.qrCodePayload) return null;
        return (
            <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(member.qrCodePayload)}`}
                alt={`QR Code for ${member.fullName}`}
                width={50}
                height={50}
                data-ai-hint="qr code"
            />
        )
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
  },
  {
    accessorKey: 'nickname',
    header: 'Nickname',
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
    id: 'actions',
    cell: ({ row, table }) => {
      const member = row.original;

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <MemberDialog
                    mode="edit"
                    memberToEdit={member}
                    onSuccess={() => table.options.meta?.onAction()}
                >
                    <button className="w-full text-left">Edit</button>
                </MemberDialog>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View QR Code</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
