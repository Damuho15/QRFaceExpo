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
import { format, parseISO, formatInTimeZone } from 'date-fns-tz';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import QrCodeDialog from './qr-code-dialog';
import PictureDialog from './picture-dialog';

const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        // Supabase stores date strings in UTC 'YYYY-MM-DD'.
        // To avoid timezone shifts, we treat it as a UTC date and format it.
        const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
        return formatInTimeZone(date, 'UTC', 'MM-dd-yyyy');
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'Invalid Date';
    }
};


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
        <PictureDialog member={member}>
          <Avatar className="h-16 w-16 rounded-md cursor-pointer">
            <AvatarImage
              src={member.pictureUrl || ''}
              alt={member.fullName}
              data-ai-hint="member picture"
              className="object-cover"
            />
            <AvatarFallback className="rounded-md">{fallback}</AvatarFallback>
          </Avatar>
        </PictureDialog>
      );
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
        <QrCodeDialog member={member}>
            <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                member.qrCodePayload
            )}`}
            alt={`QR Code for ${member.fullName}`}
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
  },
  {
    accessorKey: 'nickname',
    header: 'Nickname',
  },
  {
    accessorKey: 'birthday',
    header: 'Birthday',
    cell: ({ row }) => formatDate(row.original.birthday),
  },
  {
    accessorKey: 'weddingAnniversary',
    header: 'Wedding Anniversary',
    cell: ({ row }) => formatDate(row.original.weddingAnniversary),
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
    accessorKey: 'ministries',
    header: 'Ministries',
  },
  {
    accessorKey: 'lg',
    header: 'LG',
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
              <DropdownMenuItem
                className="w-full"
                onSelect={(e) => e.preventDefault()}
              >
                <QrCodeDialog member={member}>
                  <div className="w-full">View QR Code</div>
                </QrCodeDialog>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
