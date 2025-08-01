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

interface QrCodeDialogProps {
  member: Member;
  children: React.ReactNode;
}

export default function QrCodeDialog({ member, children }: QrCodeDialogProps) {
  const [open, setOpen] = useState(false);

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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
