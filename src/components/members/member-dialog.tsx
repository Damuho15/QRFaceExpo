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
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Member } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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
  children: React.ReactNode;
  memberToEdit?: Member;
}

export default function MemberDialog({
  children,
  memberToEdit,
}: MemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [newMember, setNewMember] = useState<Member | null>(null);
  const { toast } = useToast();
  const isEditMode = !!memberToEdit;

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: isEditMode
      ? {
          fullName: memberToEdit.fullName,
          nickname: memberToEdit.nickname,
          email: memberToEdit.email,
          phone: memberToEdit.phone,
          birthday: memberToEdit.birthday,
        }
      : {
          fullName: '',
          nickname: '',
          email: '',
          phone: '',
          birthday: undefined,
        },
  });

  const onSubmit = (data: MemberFormValues) => {
    // In a real app, you would send this to your backend API.
    const memberData: Member = {
      id: isEditMode ? memberToEdit.id : `mem_${Date.now()}`,
      ...data,
      nickname: data.nickname || '',
      qrCodePayload: data.fullName,
    };
    
    // Simulate API call
    console.log('Submitting member data:', memberData);

    toast({
      title: isEditMode ? 'Member Updated' : 'Member Added',
      description: `${data.fullName} has been successfully ${
        isEditMode ? 'updated' : 'added'
      }.`,
    });

    if (isEditMode) {
      setOpen(false);
    } else {
      setNewMember(memberData);
      setShowQr(true);
    }
  };
  
  const handleCloseDialog = () => {
    setOpen(false);
    // Reset form and QR state after a delay to allow animation to finish
    setTimeout(() => {
      form.reset();
      setShowQr(false);
      setNewMember(null);
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={handleCloseDialog}>
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
                        <Input placeholder="John Doe" {...field} />
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
                        <Input placeholder="Johnny" {...field} />
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
                        <Input placeholder="member@example.com" {...field} />
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
                        <Input placeholder="123-456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Member'}</Button>
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
                <Button onClick={handleCloseDialog}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
