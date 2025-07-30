'use client';

import React, { useState } from 'react';
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Member } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { addMember, updateMember } from '@/lib/supabaseClient';

const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  nickname: z.string().optional(),
  email: z.string().email('Invalid email address.'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits.'),
  birthday: z.date({
    required_error: 'A date of birth is required.',
  }),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberDialogProps {
  mode: 'add' | 'edit';
  memberToEdit?: Member;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export default function MemberDialog({
  mode,
  memberToEdit,
  onSuccess,
  children,
}: MemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [newMember, setNewMember] = useState<Member | null>(null);
  const { toast } = useToast();
  const isEditMode = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: isEditMode && memberToEdit
      ? {
          fullName: memberToEdit.fullName,
          nickname: memberToEdit.nickname,
          email: memberToEdit.email,
          phone: memberToEdit.phone,
          birthday: new Date(memberToEdit.birthday),
        }
      : {
          fullName: '',
          nickname: '',
          email: '',
          phone: '',
          birthday: undefined,
        },
  });

  React.useEffect(() => {
    if (open && isEditMode && memberToEdit) {
      form.reset({
        ...memberToEdit,
        birthday: new Date(memberToEdit.birthday),
      })
    }
    if (!open) {
      setTimeout(() => {
        form.reset();
        setShowQr(false);
        setNewMember(null);
        setIsSubmitting(false);
      }, 300);
    }
  }, [open, isEditMode, memberToEdit, form]);

  const onSubmit = async (data: MemberFormValues) => {
    setIsSubmitting(true);
    
    try {
        if (isEditMode && memberToEdit) {
            const memberData: Member = {
                id: memberToEdit.id,
                ...data,
                nickname: data.nickname || '',
                qrCodePayload: data.fullName,
            };
            const result = await updateMember(memberData);
            if (result) {
                toast({
                    title: 'Member Updated',
                    description: `${data.fullName} has been successfully updated.`,
                });
                onSuccess?.();
                setOpen(false);
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: 'Could not update the member. Please try again.',
                });
            }
        } else {
            const memberData = {
                ...data,
                nickname: data.nickname || '',
                qrCodePayload: data.fullName,
            };
            const result = await addMember(memberData);
            if (result) {
                toast({
                    title: 'Member Added',
                    description: `${data.fullName} has been successfully added.`,
                });
                setNewMember(result);
                setShowQr(true);
                onSuccess?.();
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Add Failed',
                    description: 'Could not add the member. Please try again.',
                });
            }
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'An Error Occurred',
            description: 'Something went wrong. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const TriggerComponent = isEditMode ? (
    <div onClick={() => setOpen(true)} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
        {children}
    </div>
  ) : (
    <DialogTrigger asChild>
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Member
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerComponent}
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
          if (showQr || isSubmitting) {
            e.preventDefault();
          }
      }}>
        {!showQr ? (
          <>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Member' : 'Add New Member'}</DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update the member's details below."
                  : 'Fill in the details for the new member.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="fullName"
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
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Johnny" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isSubmitting}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="member@example.com" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="123-456-7890" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Create Member'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Member Added & QR Code Generated</DialogTitle>
              <DialogDescription>
                Share this QR code with {newMember?.fullName} for event check-ins.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(newMember?.qrCodePayload || '')}`}
                alt={`QR Code for ${newMember?.fullName}`}
                width={200}
                height={200}
                className="rounded-lg border p-1"
                data-ai-hint="qr code"
              />
              <p className="text-lg font-medium">{newMember?.fullName}</p>
            </div>
            <DialogFooter>
                <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
