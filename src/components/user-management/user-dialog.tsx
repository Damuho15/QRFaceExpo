
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import type { User, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addUser, updateUser } from '@/lib/supabaseClient';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const userSchema = z.object({
  id: z.string().uuid().optional(), // Only for edit mode
  full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  role: z.enum(['admin', 'viewer', 'check_in_only']),
});

export type UserFormValues = z.infer<typeof userSchema>;

interface UserDialogProps {
  mode: 'add' | 'edit';
  userToEdit?: User;
  onSuccess?: () => void;
  children: React.ReactNode;
}

export default function UserDialog({
  mode,
  userToEdit,
  onSuccess,
  children,
}: UserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isEditMode = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      username: '',
      role: 'viewer',
    },
  });

  useEffect(() => {
    if (open && isEditMode && userToEdit) {
      form.reset({
        id: userToEdit.id,
        full_name: userToEdit.full_name || '',
        username: userToEdit.username || '',
        role: userToEdit.role || 'viewer',
      });
    } else if (!open) {
      form.reset();
    }
  }, [open, isEditMode, userToEdit, form]);

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    
    try {
        if (isEditMode && userToEdit) {
            const result = await updateUser(userToEdit.id, data);
            toast({
                title: 'User Updated',
                description: `${result.full_name} has been successfully updated.`,
            });
            onSuccess?.();
            setOpen(false);

        } else {
            const result = await addUser(data);
            toast({
                title: 'User Added',
                description: `${result.full_name} has been successfully created.`,
            });
            onSuccess?.();
             setOpen(false);
        }
    } catch (error: any) {
        console.error("Error submitting form", error)
        toast({
            variant: 'destructive',
            title: isEditMode ? 'Update Failed' : 'Add Failed',
            description: error.message || 'Something went wrong. Please check the console and try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
      }}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update the user's details and role below."
                  : 'Fill in the details for the new user.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                 <ScrollArea className="h-96 w-full">
                    <div className="space-y-4 py-4 pr-6">
                        <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input placeholder="johndoe" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                  <SelectItem value="check_in_only">Check-in Only</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
      </DialogContent>
    </Dialog>
  );
}
