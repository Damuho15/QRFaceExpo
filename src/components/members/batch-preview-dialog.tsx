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
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

type NewMemberPreview = {
    [key: string]: any;
}

interface BatchPreviewDialogProps {
  data: NewMemberPreview[];
  children: React.ReactNode;
}

const formatDateForDisplay = (date: any) => {
    if (date instanceof Date) {
        const offset = date.getTimezoneOffset();
        const correctedDate = new Date(date.getTime() + offset * 60 * 1000);
        return format(correctedDate, 'yyyy-MM-dd');
    }
    if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            const offset = parsed.getTimezoneOffset();
            const correctedDate = new Date(parsed.getTime() + offset * 60 * 1000);
            return format(correctedDate, 'yyyy-MM-dd');
        }
    }
    return String(date ?? '');
};

export default function BatchPreviewDialog({ data, children }: BatchPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  
  if (data.length === 0) {
      return <>{children}</>;
  }

  const displayedHeaders = Object.keys(data[0]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-auto sm:h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Member Import Preview</DialogTitle>
          <DialogDescription>
            Review the {data.length} members to be imported. This is a preview; duplicates will be skipped upon import.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full w-full border rounded-md">
            <div className="min-w-[1200px]">
              <div className="grid grid-cols-8 sticky top-0 bg-muted z-10 font-semibold">
                  {displayedHeaders.map(header => (
                      <div key={header} className="p-4 border-b whitespace-nowrap">{header}</div>
                  ))}
              </div>
              <div className="divide-y divide-border">
                  {data.map((row, index) => (
                      <div key={index} className="grid grid-cols-8 items-center">
                          {displayedHeaders.map(header => (
                              <div key={`${index}-${header}`} className="p-4 whitespace-nowrap truncate">
                                  {(header === 'Birthday' || header === 'WeddingAnniversary') 
                                      ? formatDateForDisplay(row[header]) 
                                      : String(row[header] ?? '')}
                              </div>
                          ))}
                      </div>
                  ))}
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="pt-4 flex-shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
