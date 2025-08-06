
'use client';

import React, { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '@/lib/types';
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
import { deleteUser } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import UserDialog from './user-dialog';
import { Badge } from '../ui/badge';

const TimestampCell = ({ timestamp }: { timestamp: string | Date }) => {
  const [localizedTimestamp, setLocalizedTimestamp] = useState('');

  useEffect(() => {
    setLocalizedTimestamp(new Date(timestamp).toLocaleString());
  }, [timestamp]);

  return <div>{localizedTimestamp}</div>;
};

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'full_name',
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
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
        const role = row.getValue('role') as string;
        const variant = role === 'admin' ? 'destructive' : role === 'check_in_only' ? 'secondary' : 'default';
        return <Badge variant={variant} className="capitalize">{role.replace('_', ' ')}</Badge>
    }
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
      const user = row.original;
      const { toast } = useToast();

      const handleDelete = async () => {
          try {
              await deleteUser(user.id);
              toast({
                  title: 'User Deleted',
                  description: `${user.full_name} has been successfully deleted.`,
              });
              table.options.meta?.onAction(); // This refreshes the table
          } catch (error: any) {
              toast({
                  variant: 'destructive',
                  title: 'Delete Failed',
                  description: error.message || 'Could not delete the user.',
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
              <UserDialog
                mode="edit"
                userToEdit={user}
                onSuccess={() => table.options.meta?.onAction()}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
              </UserDialog>
              <DropdownMenuSeparator />
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
                        user account for {user.full_name}.
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
