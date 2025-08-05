
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
import type { Member } from '@/lib/types';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QrCodeDialogProps {
  member: Member;
  children: React.ReactNode;
}

export default function QrCodeDialog({ member, children }: QrCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  if (!member.qrCodePayload) {
    return <>{children}</>;
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    // This allows clicking the item in the dropdown to trigger it.
    if (!isOpen) {
      setTimeout(() => {
        const event = new Event("mousedown", { bubbles: true, cancelable: true });
        document.dispatchEvent(event);
      }, 150);
    }
     setOpen(isOpen);
  }

  const handleDownload = async () => {
    if (!member.qrCodePayload) return;
    try {
        const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(member.qrCodePayload)}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${member.fullName}-QR.png`;
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {member.fullName}</DialogTitle>
          <DialogDescription>
            Scan this code for event check-ins.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
              member.qrCodePayload
            )}`}
            alt={`QR Code for ${member.fullName}`}
            width={250}
            height={250}
            className="rounded-lg border p-1"
            data-ai-hint="qr code"
          />
          <p className="text-lg font-medium">{member.fullName}</p>
        </div>
        <DialogFooter>
           <Button variant="secondary" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
