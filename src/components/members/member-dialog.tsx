
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
import { addMember, updateMember, uploadMemberPicture } from '@/lib/supabaseClient';
import { ScrollArea } from '../ui/scroll-area';

const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  nickname: z.string().optional(),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthday: z.date({
    required_error: 'A date of birth is required.',
  }),
  weddingAnniversary: z.date().optional().nullable(),
  picture: z.any().optional(),
  ministries: z.string().optional(),
lg: z.string().optional(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberDialogProps {
  mode: 'add' | 'edit';
  memberToEdit?: Member;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

/**
 * Safely parses a 'YYYY-MM-DD' string into a local Date object.
 * This prevents timezone from shifting the date upon object creation.
 * @param dateString The date string to parse.
 * @returns A Date object or null if the string is invalid.
 */
const parseDateString = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
  
    // The 'T00:00:00' part is crucial. It tells the constructor to parse the date in the local timezone
    // rather than UTC, which is the default for 'YYYY-MM-DD' strings.
    const date = new Date(`${dateString}T00:00:00`);
  
    // Check if the resulting date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
  
    return date;
};


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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: '',
      nickname: '',
      email: '',
      phone: '',
      birthday: undefined,
      weddingAnniversary: null,
      ministries: '',
      lg: '',
      picture: null,
    },
  });

  useEffect(() => {
    if (open && isEditMode && memberToEdit) {
      form.reset({
        fullName: memberToEdit.fullName || '',
        nickname: memberToEdit.nickname || '',
        email: memberToEdit.email || '',
        phone: memberToEdit.phone || '',
        birthday: parseDateString(memberToEdit.birthday) || undefined,
        weddingAnniversary: parseDateString(memberToEdit.weddingAnniversary),
        ministries: memberToEdit.ministries || '',
        lg: memberToEdit.lg || '',
        picture: null,
      });
      setPreviewImage(memberToEdit.pictureUrl || null);
    } else if (!open) {
      // Reset form and preview when dialog closes
      form.reset();
      setPreviewImage(null);
      setShowQr(false);
      setNewMember(null);
    }
  }, [open, isEditMode, memberToEdit, form]);


  const handlePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      form.setValue('picture', file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: MemberFormValues) => {
    setIsSubmitting(true);
    
    try {
        let pictureUrlToSave = isEditMode ? memberToEdit?.pictureUrl : null;
        if (data.picture && data.picture instanceof File) {
            pictureUrlToSave = await uploadMemberPicture(data.picture);
            if (!pictureUrlToSave) {
                throw new Error('Could not upload the member picture. Please try again.');
            }
        }
        
        const payload = {
            ...data,
            pictureUrl: pictureUrlToSave,
        };

        if (isEditMode && memberToEdit) {
            const result = await updateMember(memberToEdit.id, payload);
            toast({
                title: 'Member Updated',
                description: `${result.fullName} has been successfully updated.`,
            });
            onSuccess?.();
            setOpen(false);

        } else {
            const result = await addMember(payload);
            toast({
                title: 'Member Added',
                description: `${result.fullName} has been successfully added.`,
            });
            setNewMember(result);
            setShowQr(true);
            onSuccess?.();
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
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
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
              <form onSubmit={form.handleSubmit(onSubmit)}>
                 <ScrollArea className="h-96 w-full">
                    <div className="space-y-4 py-4 pr-6">
                        <FormField
                        control={form.control}
                        name="picture"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Member Picture</FormLabel>
                            <FormControl>
                                <Input 
                                type="file" 
                                accept="image/*"
                                onChange={handlePictureChange} 
                                disabled={isSubmitting} 
                                />
                            </FormControl>
                            {previewImage && (
                                <Image 
                                    src={previewImage} 
                                    alt="Member preview" 
                                    width={100} 
                                    height={100} 
                                    className="mt-2 rounded-md object-cover"
                                    data-ai-hint="member picture"
                                />
                            )}
                            <FormMessage />
                            </FormItem>
                        )}
                        />
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
                        name="weddingAnniversary"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Wedding Anniversary (Optional)</FormLabel>
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
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                    date > new Date()
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
                            <FormLabel>Email Address (Optional)</FormLabel>
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
                            <FormLabel>Telephone Number (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="123-456-7890" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="ministries"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Ministries (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Music, Youth" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="lg"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>LG (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., North, South" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4">
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
              <DialogTitle>Member Added &amp; QR Code Generated</DialogTitle>
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
