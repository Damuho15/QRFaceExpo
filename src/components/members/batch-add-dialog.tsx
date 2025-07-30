
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
import { Upload, Users, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addMembers, getMembers } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Member } from '@/lib/types';

// Raw representation of data parsed from the Excel file
type RawMemberData = {
  [key: string]: string | number | null;
};

// Simplified member type for this component's state
type NewMemberPreview = {
    fullName: string;
    email: string;
    birthday: string;
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

export default function BatchAddDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<RawMemberData[]>([]);
  const [previewData, setPreviewData] = useState<NewMemberPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileName(file.name);
      setParsedData([]);
      setPreviewData([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: false });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
          
          if (json.length < 2) {
             toast({ variant: 'destructive', title: 'Empty File', description: 'The uploaded file has no data rows.' });
             resetState();
             return;
          }
          
          const headerRow: string[] = json[0].map((h: any) => String(h || '').trim());
          const headerMap = new Map<string, number>();
          headerRow.forEach((h, i) => headerMap.set(h, i));

          if (!headerMap.has('FullName') || !headerMap.has('Birthday')) {
             toast({ variant: 'destructive', title: 'Missing Required Columns', description: 'File must contain "FullName" and "Birthday" columns.'});
             resetState();
             return;
          }

          const dataRows = json.slice(1);
          const rawMembers: RawMemberData[] = dataRows.map((row: any[], index) => {
              // Skip empty rows
              if (!row || row.length === 0 || row.every(cell => cell === null || cell === '')) return null;

              const member: RawMemberData = {};
              for (const header of expectedHeaders) {
                  if (headerMap.has(header)) {
                      const value = row[headerMap.get(header)!];
                      member[header] = value;
                  }
              }
              return member;
          }).filter((m): m is RawMemberData => m !== null && m.FullName != null && m.Birthday != null);

          setParsedData(rawMembers);
          setPreviewData(rawMembers.map(m => ({
              fullName: String(m.FullName || ''),
              email: String(m.Email || 'N/A'),
              birthday: String(m.Birthday || 'Invalid')
          })));

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
      
      const newMembersPayload: RawMemberData[] = [];
      const skippedMembers: string[] = [];

      parsedData.forEach(member => {
        const fullName = String(member.FullName || '').trim();
        if (existingFullNames.has(fullName.toLowerCase())) {
          skippedMembers.push(fullName);
        } else {
          newMembersPayload.push(member);
        }
      });
      
      if (skippedMembers.length > 0) {
        toast({ title: 'Duplicates Skipped', description: `${skippedMembers.length} member(s) already exist.` });
      }

      if (newMembersPayload.length === 0) {
        if (skippedMembers.length > 0) {
           toast({ title: 'No New Members to Add', description: 'All members in the file already exist.' });
        }
        setIsSubmitting(false);
        resetState();
        setOpen(false);
        return;
      }

      // The supabaseClient function will now handle all validation and formatting.
      const result = await addMembers(newMembersPayload);
      if (result) {
        const successCount = result.length;
        const failureCount = newMembersPayload.length - successCount;
        let description = `${successCount} new members have been added.`;
        if (failureCount > 0) {
            description += ` ${failureCount} rows could not be imported due to invalid data (e.g., bad dates).`
        }

        toast({ title: 'Batch Add Complete', description });
        onSuccess?.();
        setOpen(false);
      } else {
        throw new Error('The batch add operation failed entirely. Check console for details.');
      }
    } catch (error) {
       console.error("Error during submit:", error);
       toast({ variant: 'destructive', title: 'Batch Add Failed', description: 'Could not add the members to the database. Please check the data and try again.'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setFileName('');
    setParsedData([]);
    setPreviewData([]);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Users className="mr-2 h-4 w-4" />Batch Add</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Add Members</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx, .xls, .csv). Must contain `FullName` and `Birthday` columns. All other columns are optional.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="excel-upload">Excel File</Label>
                <div className="flex items-center gap-2">
                    <Input id="excel-upload" type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isSubmitting}/>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}><Upload className="mr-2 h-4 w-4" />Choose File</Button>
                    {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
                </div>
            </div>
            {previewData.length > 0 && (
                <div>
                    <Label>Preview Members ({previewData.length})</Label>
                    <ScrollArea className="h-64 mt-2 w-full rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Birthday (as read)</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {previewData.map((member, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{member.fullName}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.birthday}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || previewData.length === 0}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : `Import ${previewData.length > 0 ? previewData.length : ''} Members`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
