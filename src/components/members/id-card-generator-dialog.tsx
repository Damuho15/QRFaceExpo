
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Helper to wrap text and calculate its height, but not draw it
const measureAndWrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    let line = '';
    let lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());
    
    return lines;
}


// Helper to create a card canvas for a member
const createCardCanvas = (member: Member, logoImage: string | null): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const scale = 3; 
    const cardWidth = 250;
    const cardHeight = 400;
    
    canvas.width = cardWidth * scale;
    canvas.height = cardHeight * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return reject(new Error('Could not get canvas context'));
    }
    
    ctx.scale(scale, scale);

    // Red Background (Top-left triangle)
    ctx.fillStyle = '#DC2626'; // Red
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cardWidth, 0);
    ctx.lineTo(0, cardHeight);
    ctx.closePath();
    ctx.fill();
    
    // Black Background (Bottom-right triangle)
    ctx.fillStyle = '#000000'; // Black
    ctx.beginPath();
    ctx.moveTo(cardWidth, 0);
    ctx.lineTo(cardWidth, cardHeight);
    ctx.lineTo(0, cardHeight);
    ctx.closePath();
    ctx.fill();

    // -- Dynamic Name Box --
    const nameText = member.nickname || member.fullName;
    const nameLineHeight = 47; 
    ctx.font = 'bold 47px Arial';
    ctx.textAlign = 'center';
    
    const nameLines = measureAndWrapText(ctx, nameText, cardWidth - 50);
    const totalLines = nameLines.length;
    
    const nameBoxY = 60;
    
    // Draw the text lines
    ctx.fillStyle = 'white';
    
    nameLines.forEach((line, index) => {
       const yPos = nameBoxY + 30 + (index * nameLineHeight) - ((totalLines - 1) * (nameLineHeight / 2));
       ctx.fillText(line, cardWidth / 2, yPos + 5);
    });


    // Generate QR Code
    QRCode.toDataURL(member.qrCodePayload, { width: 150, margin: 1, errorCorrectionLevel: 'M' })
      .then(qrUrl => {
        const qrImg = new Image();
        qrImg.crossOrigin = "anonymous";
        qrImg.onload = () => {
          
          const qrX = cardWidth / 2;
          const qrY = cardHeight / 2 + 40;
          const qrRadius = 75; 

          ctx.save();
          // Create a circular clipping path
          ctx.beginPath();
          ctx.arc(qrX, qrY, qrRadius, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();

          // Draw a white background inside the circle
          ctx.fillStyle = 'white';
          ctx.fillRect(qrX - qrRadius, qrY - qrRadius, qrRadius * 2, qrRadius * 2);

          // Draw QR code image into the circle, leaving a small margin
          const qrImageSize = (qrRadius - 15) * 2; 
          ctx.drawImage(qrImg, qrX - (qrImageSize / 2), qrY - (qrImageSize / 2), qrImageSize, qrImageSize);
          ctx.restore(); 


          // Draw logo if it exists
          if (logoImage) {
            const logo = new Image();
            logo.crossOrigin = "anonymous";
            logo.onload = () => {
              // Draw logo background
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              const logoWidth = 72 * 0.8;
              const logoHeight = 44 * 0.8;
              const logoBgWidth = logoWidth + 5;
              const logoBgHeight = logoHeight + 5;

              ctx.fillRect(cardWidth - 98, cardHeight - 74, logoBgWidth, logoBgHeight);
              // Draw logo image
              ctx.drawImage(logo, cardWidth - 95, cardHeight - 70, logoWidth, logoHeight); 
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


export default function IdCardGeneratorDialog({ members, children, open, onOpenChange }: IdCardGeneratorDialogProps) {
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

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      const cardWidth = 55;
      const cardHeight = 88;
      
      const horizontalMargin = 10;
      const verticalMargin = 10;
      const horizontalSpacing = 5;
      const verticalSpacing = 5;
      const numColumns = 5;

      let x = horizontalMargin;
      let y = verticalMargin;


      cardDataUrls.forEach((cardDataUrl, index) => {
        const columnIndex = index % numColumns;

        // Reset for a new row
        if (index > 0 && columnIndex === 0) {
            y += cardHeight + verticalSpacing;
        }
        
        // Check if we need a new page
        if (y + cardHeight + verticalMargin > pageHeight) {
            pdf.addPage();
            y = verticalMargin;
        }

        x = horizontalMargin + columnIndex * (cardWidth + horizontalSpacing);
        
        pdf.addImage(cardDataUrl, 'PNG', x, y, cardWidth, cardHeight);
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
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={isLoading}>
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
