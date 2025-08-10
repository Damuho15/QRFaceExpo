
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
import type { FirstTimer } from '@/lib/types';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import QrCodeDisplay from '../common/qr-code-display';

interface QrCodeDialogProps {
  firstTimer: FirstTimer;
  children: React.ReactNode;
}

export default function QrCodeDialog({ firstTimer, children }: QrCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  if (!firstTimer.qrCodePayload) {
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
    if (!firstTimer.qrCodePayload) return;
    try {
      const dataUrl = await QRCode.toDataURL(firstTimer.qrCodePayload, {
        width: 300,
        margin: 2,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${firstTimer.fullName}-QR.png`;
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {firstTimer.fullName}</DialogTitle>
          <DialogDescription>
            Scan this code for event check-ins.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="rounded-lg border p-1">
            <QrCodeDisplay payload={firstTimer.qrCodePayload} size={250} />
          </div>
          <p className="text-lg font-medium">{firstTimer.fullName}</p>
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
