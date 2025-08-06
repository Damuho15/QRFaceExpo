
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
import type { FirstTimer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { addFirstTimer, updateFirstTimer } from '@/lib/supabaseClient';
import { ScrollArea } from '../ui/scroll-area';

const firstTimerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export type FirstTimerFormValues = z.infer<typeof firstTimerSchema>;

interface FirstTimerDialogProps {
  mode: 'add' | 'edit';
  firstTimerToEdit?: FirstTimer;
  onSuccess?: () => void;
  children: React.ReactNode;
}

export default function FirstTimerDialog({
  mode,
  firstTimerToEdit,
  onSuccess,
  children,
}: FirstTimerDialogProps) {
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [newFirstTimer, setNewFirstTimer] = useState<FirstTimer | null>(null);
  const { toast } = useToast();
  const isEditMode = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FirstTimerFormValues>({
    resolver: zodResolver(firstTimerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (open && isEditMode && firstTimerToEdit) {
      form.reset({
        fullName: firstTimerToEdit.fullName || '',
        email: firstTimerToEdit.email || '',
        phone: firstTimerToEdit.phone || '',
      });
    } else if (!open) {
      form.reset();
      setShowQr(false);
      setNewFirstTimer(null);
    }
  }, [open, isEditMode, firstTimerToEdit, form]);

  const onSubmit = async (data: FirstTimerFormValues) => {
    setIsSubmitting(true);
    
    try {
        if (isEditMode && firstTimerToEdit) {
            const result = await updateFirstTimer(firstTimerToEdit.id, data);
            toast({
                title: 'New Comer Updated',
                description: `${result.fullName} has been successfully updated.`,
            });
            onSuccess?.();
            setOpen(false);

        } else {
            const result = await addFirstTimer(data);
            toast({
                title: 'New Comer Added',
                description: `${result.fullName} has been successfully added.`,
            });
            setNewFirstTimer(result);
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
    if (!newFirstTimer?.qrCodePayload) return;
    try {
        const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newFirstTimer.qrCodePayload)}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${newFirstTimer.fullName}-QR.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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
              <DialogTitle>{isEditMode ? 'Edit New Comer' : 'Add New Comer'}</DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update the new comer's details below."
                  : 'Fill in the details for the new comer.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                 <ScrollArea className="h-96 w-full">
                    <div className="space-y-4 py-4 pr-6">
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
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Create New Comer'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New Comer Added &amp; QR Code Generated</DialogTitle>
              <DialogDescription>
                Share this QR code with {newFirstTimer?.fullName} for event check-ins.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(newFirstTimer?.qrCodePayload || '')}`}
                alt={`QR Code for ${newFirstTimer?.fullName}`}
                width={200}
                height={200}
                className="rounded-lg border p-1"
                data-ai-hint="qr code"
              />
              <p className="text-lg font-medium">{newFirstTimer?.fullName}</p>
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
