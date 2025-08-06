
'use client';

import React from 'react';
import type { ColumnDef, FilterFn } from '@tanstack/react-table';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import QrCodeDialog from './qr-code-dialog';
import PictureDialog from './picture-dialog';
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
import { deleteMember } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const caseInsensitiveFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const rowValue = row.getValue(columnId) as string;
    
    // Ensure that the row value is a non-empty string before comparing.
    // This prevents rows with null, undefined, or empty string nicknames from matching.
    if (!rowValue) {
        return false;
    }

    return rowValue.toLowerCase().includes(String(value).toLowerCase());
}

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
    filterFn: caseInsensitiveFilter,
  },
  {
    accessorKey: 'nickname',
    header: 'Nickname',
    filterFn: caseInsensitiveFilter,
  },
  {
    accessorKey: 'birthday',
    header: 'Birthday',
    cell: ({ row }) => <Input type="date" value={row.original.birthday || ''} readOnly className="border-none"/>,
  },
  {
    accessorKey: 'weddingAnniversary',
    header: 'Wedding Anniversary',
    cell: ({ row }) => <Input type="date" value={row.original.weddingAnniversary || ''} readOnly className="border-none"/>,
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
      const { toast } = useToast();

      const handleDelete = async () => {
          try {
              await deleteMember(member.id, member.pictureUrl);
              toast({
                  title: 'Member Deleted',
                  description: `${member.fullName} has been successfully deleted.`,
              });
              table.options.meta?.onAction(); // This refreshes the table
          } catch (error: any) {
              toast({
                  variant: 'destructive',
                  title: 'Delete Failed',
                  description: error.message || 'Could not delete the member.',
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
                <MemberDialog
                  mode="edit"
                  memberToEdit={member}
                  onSuccess={() => table.options.meta?.onAction()}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
                </MemberDialog>
                <DropdownMenuSeparator />
                <QrCodeDialog member={member}>
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
                        member record for {member.fullName} and remove their data from our servers.
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
