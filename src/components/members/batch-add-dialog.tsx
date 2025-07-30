
'use client';

import React, { useState, useRef } from 'react';
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
import { Upload, Users, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addMembers, getMembers } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Member } from '@/lib/types';

type RawMemberData = {
  [key: string]: string | number | null;
};

type NewMemberPreview = {
    [key: string]: any;
}

const expectedHeaders = [
  'FullName',
  'Nickname',
  'Email',
  'Phone',
  'Birthday',
  'WeddingAnniversary',
  'Ministries',
  'LG',
];

const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([expectedHeaders]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members Template');
    XLSX.writeFile(wb, 'members_template.xlsx');
};


export default function BatchAddDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<NewMemberPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileName(file.name);
      setParsedData([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true }); // Use cellDates for better parsing
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: NewMemberPreview[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });
          
          if (json.length === 0) {
             toast({ variant: 'destructive', title: 'Empty File', description: 'The uploaded file has no data rows.' });
             resetState();
             return;
          }
          
          setParsedData(json);

        } catch (error) {
          console.error("Error parsing file:", error);
          toast({ variant: 'destructive', title: 'File Parsing Failed', description: error instanceof Error ? error.message : 'Could not parse the Excel file.' });
          resetState();
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSubmit = async () => {
    if (parsedData.length === 0) {
      toast({ variant: 'destructive', title: 'No Members to Add', description: 'Please select and parse a file with member data first.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const existingMembers = await getMembers();
      const existingFullNames = new Set(existingMembers.map(m => m.fullName.toLowerCase()));
      
      const newMembersPayload: any[] = [];
      const skippedMembers: string[] = [];

       parsedData.forEach(member => {
        const fullName = String(member.FullName || '').trim();
        if (!fullName) return; // Skip rows without a full name

        if (existingFullNames.has(fullName.toLowerCase())) {
          skippedMembers.push(fullName);
        } else {
          newMembersPayload.push(member);
        }
      });
      
      if (skippedMembers.length > 0) {
        toast({ title: 'Duplicates Skipped', description: `${skippedMembers.length} member(s) already exist and will be skipped.` });
      }

      if (newMembersPayload.length === 0) {
        if (skippedMembers.length > 0) {
           toast({ title: 'No New Members to Add', description: 'All members in the file already exist.' });
        } else {
            toast({ variant: 'destructive', title: 'No Valid Members', description: 'No valid new members found in the file.' });
        }
        setIsSubmitting(false);
        // Do not close the dialog, allow user to upload another file
        return;
      }

      const result = await addMembers(newMembersPayload);
      if (result) {
        const successCount = result.length;
        const failureCount = newMembersPayload.length - successCount;
        let description = `${successCount} new members have been added.`;
        if (failureCount > 0) {
            description += ` ${failureCount} rows could not be imported due to invalid data (e.g., bad dates, missing name).`
        }

        toast({ title: 'Batch Add Complete', description });
        onSuccess?.();
        setOpen(false); // Close on success
      } else {
        throw new Error('The batch add operation failed. This may be due to a database connection issue or invalid data that passed initial checks.');
      }
    } catch (error) {
       console.error("Error during submit:", error);
       toast({ variant: 'destructive', title: 'Batch Add Failed', description: error instanceof Error ? error.message : 'Could not add the members to the database.'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setFileName('');
    setParsedData([]);
    setIsSubmitting(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  React.useEffect(() => {
    if(!open) {
        setTimeout(() => { resetState(); }, 300);
    }
  }, [open]);

  const displayedHeaders = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Users className="mr-2 h-4 w-4" />Batch Add</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Batch Add Members</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx, .xls, .csv). Use the template for the correct format. `FullName` and `Birthday` are required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <Label htmlFor="excel-upload" className="sr-only">Excel File</Label>
                <div className="flex items-center gap-2">
                    <Input id="excel-upload" type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isSubmitting}/>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}><Upload className="mr-2 h-4 w-4" />Choose File</Button>
                    {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
                </div>
                 <div className="flex-grow"></div>
                <Button variant="secondary" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download Template</Button>
            </div>
            {parsedData.length > 0 && (
                <div>
                    <Label>Preview Members ({parsedData.length})</Label>
                    <ScrollArea className="h-64 mt-2 w-full rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {displayedHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {parsedData.map((row, index) => (
                                    <TableRow key={index}>
                                        {displayedHeaders.map(header => (
                                            <TableCell key={`${index}-${header}`}>
                                                {row[header] instanceof Date ? row[header].toLocaleDateString() : String(row[header] ?? '')}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground pt-2">
                        Data is shown as parsed. Final validation happens upon import. Duplicates will be skipped.
                    </p>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || parsedData.length === 0}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : `Import ${parsedData.length > 0 ? parsedData.length : ''} Members`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
