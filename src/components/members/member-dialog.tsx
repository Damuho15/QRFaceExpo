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
import { PlusCircle, Loader2, Download } from 'lucide-react';
import type { Member } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { addMember, updateMember, uploadMemberPicture } from '@/lib/supabaseClient';
import { ScrollArea } from '../ui/scroll-area';
import QRCode from 'qrcode';
import QrCodeDisplay from '../common/qr-code-display';

const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  nickname: z.string().optional(),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthday: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'A valid date of birth is required.',
  }),
  weddingAnniversary: z.string().optional().nullable(),
  picture: z.any().optional(),
  ministries: z.string().optional(),
  lg: z.string().optional(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberDialogProps {
  mode: 'add' | 'edit';
  memberToEdit?: Member;
  onSuccess?: () => void;
  children: React.ReactNode;
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: '',
      nickname: '',
      email: '',
      phone: '',
      birthday: '',
      weddingAnniversary: '',
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
        birthday: memberToEdit.birthday || '',
        weddingAnniversary: memberToEdit.weddingAnniversary || '',
        ministries: memberToEdit.ministries || '',
        lg: memberToEdit.lg || '',
        picture: null,
      });
      setPreviewImage(memberToEdit.pictureUrl || null);
    } else if (!open) {
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
            const uploadedUrl = await uploadMemberPicture(data.picture);
            if (!uploadedUrl) {
                throw new Error('Could not upload the member picture. Please try again.');
            }
            pictureUrlToSave = uploadedUrl;
        }

        if (isEditMode && memberToEdit) {
            const result = await updateMember(memberToEdit.id, data, pictureUrlToSave);
            toast({
                title: 'Member Updated',
                description: `${result.fullName} has been successfully updated.`,
            });
            onSuccess?.();
            setOpen(false);

        } else {
            const result = await addMember(data, pictureUrlToSave);
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

  const handleDownload = async () => {
    if (!newMember?.qrCodePayload) return;
    try {
      const dataUrl = await QRCode.toDataURL(newMember.qrCodePayload, {
        width: 300,
        margin: 2,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${newMember.fullName}-QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
        console.error("Failed to download QR code", error);
        toast({
            variant: "destructive",
            title: "Download failed",
            description: "Could not download the QR code image."
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
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
                            <FormItem>
                            <FormLabel>Date of birth</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="weddingAnniversary"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Wedding Anniversary (Optional)</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                            </FormControl>
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
                                <Input 
                                    placeholder="1234567890" 
                                    {...field}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        field.onChange(value.replace(/[^0-9]/g, ''));
                                    }}
                                    disabled={isSubmitting} 
                                />
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
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
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
              {newMember?.qrCodePayload && (
                <div className="rounded-lg border p-1">
                  <QrCodeDisplay payload={newMember.qrCodePayload} size={200} />
                </div>
              )}
              <p className="text-lg font-medium">{newMember?.fullName}</p>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
                <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
