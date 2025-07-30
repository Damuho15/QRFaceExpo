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
import type { Member } from '@/lib/types';
import { addMembers, getMembers } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type NewMember = Omit<Member, 'id' | 'qrCodePayload'> & { qrCodePayload?: string };

const isValidDate = (date: any): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
}

const parseDate = (dateInput: string | number): Date | null => {
    if (dateInput === null || dateInput === undefined || dateInput === '') return null;
    
    // Check if it's an Excel serial number
    if (typeof dateInput === 'number') {
        const d = XLSX.SSF.parse_date_code(dateInput);
        if (d) {
            const date = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
            if(isValidDate(date)) return date;
        }
    }

    if (typeof dateInput === 'string') {
        const date = new Date(dateInput);
        if (isValidDate(date)) {
             if (!dateInput.match(/[:Z]/)) {
                return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            }
            return date;
        }
    }
    
    return null;
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
  const [parsedMembers, setParsedMembers] = useState<NewMember[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileName(file.name);
      setParsedMembers([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
          
          if (json.length < 2) {
             toast({
                variant: 'destructive',
                title: 'Empty File',
                description: 'The uploaded file has no data rows.',
            });
            resetState();
            return;
          }
          
          const headerRow: string[] = json[0].map((h: any) => String(h).trim());
          const headerIndexMap: { [key: string]: number } = {};
          
          headerRow.forEach((header, index) => {
            if (expectedHeaders.includes(header)) {
              headerIndexMap[header] = index;
            }
          });

          if (headerIndexMap['FullName'] === undefined || headerIndexMap['Birthday'] === undefined) {
             toast({
                variant: 'destructive',
                title: 'Missing Required Columns',
                description: 'The uploaded file must contain "FullName" and "Birthday" columns.',
            });
            resetState();
            return;
          }

          const validationErrors: string[] = [];
          const dataRows = json.slice(1);

          const members: NewMember[] = dataRows.map((row: any[], index) => {
            if (row.every(cell => cell === null || cell === '')) return null;

            const rowNumber = index + 2;
            const rowErrors: string[] = [];
            
            const fullName = row[headerIndexMap['FullName']];
            const birthdayValue = row[headerIndexMap['Birthday']];
            
            if (!fullName) {
                rowErrors.push('FullName is missing');
            }
            
            const birthday = parseDate(birthdayValue);
            if (!birthdayValue) {
                rowErrors.push('Birthday is missing');
            } else if (!birthday) {
                rowErrors.push(`Birthday ('${birthdayValue}') is not a valid date`);
            }

            const weddingAnniversaryValue = headerIndexMap['WeddingAnniversary'] !== undefined ? row[headerIndexMap['WeddingAnniversary']] : null;
            const weddingAnniversary = weddingAnniversaryValue ? parseDate(weddingAnniversaryValue) : null;
            if(weddingAnniversaryValue && !weddingAnniversary) {
                rowErrors.push(`WeddingAnniversary ('${weddingAnniversaryValue}') is not a valid date`);
            }

            if (rowErrors.length > 0) {
                validationErrors.push(`Row ${rowNumber}: ${rowErrors.join(', ')}`);
                 return null;
            }

            return {
              fullName: String(fullName || ''),
              nickname: headerIndexMap['Nickname'] !== undefined ? String(row[headerIndexMap['Nickname']] || '') : '',
              email: headerIndexMap['Email'] !== undefined ? String(row[headerIndexMap['Email']] || '') : '',
              phone: headerIndexMap['Phone'] !== undefined ? String(row[headerIndexMap['Phone']] || '') : '',
              birthday: birthday!,
              weddingAnniversary: weddingAnniversary,
              ministries: headerIndexMap['Ministries'] !== undefined ? String(row[headerIndexMap['Ministries']] || '') : '',
              lg: headerIndexMap['LG'] !== undefined ? String(row[headerIndexMap['LG']] || '') : '',
            };
          }).filter(member => member !== null) as NewMember[];


          if (validationErrors.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Data Found',
                description: (
                    <div className="flex flex-col">
                        <p>Please check the following errors in your file:</p>
                        <ScrollArea className="h-40 mt-2">
                            <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
                                <code className="text-white">{validationErrors.join('\n')}</code>
                            </pre>
                        </ScrollArea>
                    </div>
                ),
                duration: 9000,
            });
            resetState();
            return;
          }

          setParsedMembers(members);
        } catch (error) {
          console.error("Error parsing file:", error);
          toast({
            variant: 'destructive',
            title: 'File Parsing Failed',
            description: error instanceof Error ? error.message : 'Could not parse the Excel file. Please ensure it has the correct columns.',
          });
          resetState();
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSubmit = async () => {
    if (parsedMembers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Members to Add',
        description: 'Please select and parse a file with member data first.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const existingMembers = await getMembers();
      const existingFullNames = new Set(existingMembers.map(m => m.fullName.toLowerCase()));

      const newMembers = parsedMembers.filter(member => !existingFullNames.has(member.fullName.toLowerCase()));
      const skippedCount = parsedMembers.length - newMembers.length;

      if (skippedCount > 0) {
        toast({
            title: 'Duplicates Skipped',
            description: `${skippedCount} member(s) were skipped because their full name already exists in the database.`,
        });
      }

      if (newMembers.length === 0) {
        toast({
            title: 'No New Members',
            description: 'All members in the file already exist.',
        });
        setIsSubmitting(false);
        resetState();
        setOpen(false);
        return;
      }

      const result = await addMembers(newMembers);
      if (result) {
        toast({
          title: 'Batch Add Successful',
          description: `${result.length} new members have been added.`,
        });
        onSuccess?.();
        setOpen(false);
      } else {
        throw new Error('Supabase returned a null result.');
      }
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Batch Add Failed',
        description: 'Could not add the members to the database. Please check the data and try again.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setFileName('');
    setParsedMembers([]);
    setIsSubmitting(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  React.useEffect(() => {
    if(!open) {
        setTimeout(() => {
            resetState();
        }, 300);
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Batch Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Add Members</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx, .xls, .csv). It must contain `FullName` and `Birthday` columns.
            Optional columns: `Nickname`, `Email`, `Phone`, `WeddingAnniversary`, `Ministries`, and `LG`.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="excel-upload">Excel File</Label>
                <div className="flex items-center gap-2">
                    <Input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                    </Button>
                    {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
                </div>
            </div>
            {parsedMembers.length > 0 && (
                <div>
                    <Label>Preview Members ({parsedMembers.length})</Label>
                    <ScrollArea className="h-64 mt-2 w-full rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Birthday</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {parsedMembers.map((member, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{member.fullName}</TableCell>
                                        <TableCell>{member.email || 'N/A'}</TableCell>
                                        <TableCell>{isValidDate(member.birthday) ? member.birthday.toLocaleDateString() : 'Invalid Date'}</TableCell>
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
          <Button onClick={handleSubmit} disabled={isSubmitting || parsedMembers.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
                `Import ${parsedMembers.length} Members`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
