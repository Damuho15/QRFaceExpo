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
import QRCode from 'qrcode';
import Image from 'next/image';

interface QrCodeDialogProps {
  firstTimer: FirstTimer;
  children: React.ReactNode;
}

export default function QrCodeDialog({ firstTimer, children }: QrCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const openQR = () => {
    if (firstTimer.qrCodePayload) {
      QRCode.toDataURL(firstTimer.qrCodePayload, { width: 256, margin: 1 }, (err, url) => {
        if (!err) {
          setQrDataUrl(url);
        }
      });
    }
  };

  const downloadQR = () => {
    const img = document.getElementById("qrImageFirstTimer") as HTMLImageElement;
    if (!img) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const originalSize = 256;
    const padding = 20;
    const textHeight = 30;
    
    canvas.width = originalSize + padding * 2;
    canvas.height = originalSize + padding * 2 + textHeight;
    
    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw QR Code
    ctx.drawImage(img, padding, padding, originalSize, originalSize);

    // Draw Name
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(firstTimer.fullName, canvas.width / 2, originalSize + padding + textHeight - 5);

    const url = canvas.toDataURL("image/png");

    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`
        <html>
          <body style="background-color: #111; color: #fff; text-align: center; padding-top: 2rem; font-family: sans-serif;">
            <p>Download started. You can now close this tab.</p>
            <a id="dl" href="${url}" download="qr_${firstTimer.fullName.replace(/\s+/g, '_')}.png"></a>
            <script>
              document.getElementById('dl').click();
            </script>
          </body>
        </html>
      `);
      newTab.document.close();
    }
  };


  if (!firstTimer.qrCodePayload) {
    return <>{children}</>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); openQR(); setOpen(true); }}>{children}</DialogTrigger>
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
              crossOrigin="anonymous" 
            />
          ) : (
             <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Generating...</p>
             </div>
          )}
          <p className="text-lg font-medium">{firstTimer.fullName}</p>
        </div>
        <DialogFooter className="flex-col sm:flex-col sm:space-y-2">
          <Button variant="secondary" onClick={downloadQR} disabled={!qrDataUrl}>
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
