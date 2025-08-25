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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

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
        <div className="flex-grow min-h-0 border rounded-md">
          <ScrollArea className="h-full w-full">
              <Table className="min-w-[1200px]">
                <TableHeader>
                    <TableRow>
                        {displayedHeaders.map(header => (
                            <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index}>
                            {displayedHeaders.map(header => (
                                <TableCell key={`${index}-${header}`} className="whitespace-nowrap">
                                    {(header === 'Birthday' || header === 'WeddingAnniversary') 
                                        ? formatDateForDisplay(row[header]) 
                                        : String(row[header] ?? '')}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
              </Table>
          </ScrollArea>
        </div>
        <DialogFooter className="pt-4 flex-shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
