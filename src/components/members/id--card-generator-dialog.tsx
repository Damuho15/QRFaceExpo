
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Member } from '@/lib/types';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface IdCardGeneratorDialogProps {
  members: Member[];
  children: React.ReactNode;
}

// Helper to create a card canvas for a member
const createCardCanvas = (member: Member, logoImage: string | null): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const scale = 3; // Render at a higher resolution
    canvas.width = 300 * scale;
    canvas.height = 180 * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return reject(new Error('Could not get canvas context'));
    }
    
    ctx.scale(scale, scale);

    // Background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 300, 180);
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(1, '#50E3C2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 180);
    
    // Angled white overlay
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(300, 100);
    ctx.lineTo(300, 180);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();


    // Member's name
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(member.fullName, 20, 40);
    
    // Member's ID/Nickname
    ctx.font = '14px Arial';
    ctx.fillText(member.nickname || `ID: ${member.id.substring(0, 8)}`, 20, 65);

    // Generate QR Code
    QRCode.toDataURL(member.qrCodePayload, { width: 80, margin: 1, errorCorrectionLevel: 'M' })
      .then(qrUrl => {
        const qrImg = new Image();
        qrImg.crossOrigin = "anonymous";
        qrImg.onload = () => {
          // Draw white background for QR code
          ctx.fillStyle = 'white';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
          ctx.fillRect(195, 20, 85, 85);
          ctx.shadowColor = 'transparent'; // Reset shadow

          // Draw QR code image
          ctx.drawImage(qrImg, 200, 25, 75, 75);

          // Draw logo if it exists
          if (logoImage) {
            const logo = new Image();
            logo.crossOrigin = "anonymous";
            logo.onload = () => {
              ctx.drawImage(logo, 20, 120, 60, 50); // Adjust position and size as needed
              resolve(canvas.toDataURL('image/png'));
            };
            logo.onerror = () => reject(new Error('Logo image failed to load'));
            logo.src = logoImage;
          } else {
            resolve(canvas.toDataURL('image/png'));
          }
        };
        qrImg.onerror = () => reject(new Error('QR code image failed to load'));
        qrImg.src = qrUrl;
      })
      .catch(err => {
        console.error('QR code generation failed:', err);
        reject(err);
      });
  });
};


export default function IdCardGeneratorDialog({ members, children }: IdCardGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePdf = async () => {
    if (members.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Members Selected',
        description: 'Please select at least one member to generate ID cards.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const cardDataUrlPromises = members.map(member => createCardCanvas(member, logoImage));
      const cardDataUrls = await Promise.all(cardDataUrlPromises);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const cardWidth = 85.6; // Standard ID-1 card width in mm
      const cardHeight = 53.98; // Standard ID-1 card height in mm
      const margin = 10;
      const xMargin = (pdf.internal.pageSize.getWidth() - (2 * cardWidth) - (2 * margin)) / 1;
      
      let x = margin;
      let y = margin;

      cardDataUrls.forEach((cardDataUrl, index) => {
         const isNewPage = index > 0 && index % 10 === 0; // 10 cards per page (5 rows of 2)
         if (isNewPage) {
           pdf.addPage();
           x = margin;
           y = margin;
         }

        pdf.addImage(cardDataUrl, 'PNG', x, y, cardWidth, cardHeight);
        
        const isNewLine = (index + 1) % 2 === 0;
        if(isNewLine) {
            x = margin;
            y += cardHeight + margin;
        } else {
            x += cardWidth + xMargin;
        }
      });
      
      const pdfBlob = pdf.output('bloburl');
      window.open(pdfBlob, '_blank');
      
      toast({
          title: "PDF Generation Successful",
          description: `Generated ID cards for ${members.length} members.`
      })

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Failed',
        description: 'An unexpected error occurred. Please check the console.',
      });
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Member ID Cards</DialogTitle>
          <DialogDescription>
            This will generate a printable PDF for the {members.length} selected member(s). You can optionally add a logo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="logo-upload">Upload Logo (Optional)</Label>
                <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} />
            </div>
             {logoImage && (
                <div>
                    <Label>Logo Preview</Label>
                    <div className="mt-2 rounded-md border p-2 flex items-center justify-center">
                        <img src={logoImage} alt="Logo preview" className="max-h-24" />
                    </div>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGeneratePdf} disabled={isLoading || members.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              `Generate PDF for ${members.length} Members`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
