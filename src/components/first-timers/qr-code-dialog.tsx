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
import type { FirstTimer } from '@/lib/types';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';
import Image from 'next/image';

interface QrCodeDialogProps {
  firstTimer: FirstTimer;
  children: React.ReactNode;
}

export default function QrCodeDialog({ firstTimer, children }: QrCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (open && firstTimer.qrCodePayload) {
      const canvas = document.createElement("canvas");
      QRCode.toCanvas(canvas, firstTimer.qrCodePayload, { width: 256 }, (err) => {
        if (!err) {
          setQrDataUrl(canvas.toDataURL("image/png"));
        }
      });
    } else {
        setQrDataUrl('');
    }
  }, [open, firstTimer.qrCodePayload]);

  if (!firstTimer.qrCodePayload) {
    return <>{children}</>;
  }

  const handleDownload = () => {
    const img = document.getElementById("qrImageFirstTimer") as HTMLImageElement;
    if (!img) return;

    // Draw image to canvas so it's always a clean image
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    const url = canvas.toDataURL("image/png");

    // Open in a new tab and auto-click download
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`
        <html>
          <body style="background-color: #111; color: #fff; text-align: center; padding-top: 2rem; font-family: sans-serif;">
            <p>Starting download...</p>
            <a id="dl" href="${url}" download="qr_${firstTimer.fullName.replace(/\s+/g, '_')}_${Date.now()}.png"></a>
            <script>
              document.getElementById('dl').click();
              setTimeout(() => window.close(), 500);
            </script>
          </body>
        </html>
      `);
      newTab.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); setOpen(true); }}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {firstTimer.fullName}</DialogTitle>
          <DialogDescription>
            Scan this code for event check-ins.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          {qrDataUrl ? (
            <Image
              id="qrImageFirstTimer"
              src={qrDataUrl}
              alt="QR Code"
              width={256}
              height={256}
              className="w-64 h-64 rounded-lg border p-1"
              data-ai-hint="qr code"
            />
          ) : (
             <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Generating...</p>
             </div>
          )}
          <p className="text-lg font-medium">{firstTimer.fullName}</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleDownload} disabled={!qrDataUrl}>
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
