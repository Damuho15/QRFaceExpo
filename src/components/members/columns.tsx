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
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    accessorKey: 'pictureUrl',
    header: 'Picture',
    cell: ({ row }) => {
        const member = row.original;
        const fallback = member.fullName ? member.fullName.charAt(0) : '';
        return (
            <Avatar className="h-16 w-16">
                <AvatarImage src={member.pictureUrl || ''} alt={member.fullName} data-ai-hint="member picture" className="object-cover" />
                <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
        )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'qrCodePayload',
    header: 'QR Code',
    cell: ({ row }) => {
        const member = row.original;
        if (!member.qrCodePayload) return null;
        return (
            <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(member.qrCodePayload)}`}
                alt={`QR Code for ${member.fullName}`}
                width={80}
                height={80}
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
    accessorKey: 'birthday',
    header: 'Birthday',
    cell: ({ row }) => {
      const birthday = row.original.birthday;
      return birthday ? format(new Date(birthday), 'MM-dd-yyyy') : 'N/A';
    }
  },
  {
    accessorKey: 'weddingAnniversary',
    header: 'Wedding Anniversary',
     cell: ({ row }) => {
      const anniversary = row.original.weddingAnniversary;
      return anniversary ? format(new Date(anniversary), 'MM-dd-yyyy') : 'N/A';
    }
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
                <MemberDialog
                    mode="edit"
                    memberToEdit={member}
                    onSuccess={() => table.options.meta?.onAction()}
                >
                    <button className="w-full text-left">Edit</button>
                </MemberDialog>
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
