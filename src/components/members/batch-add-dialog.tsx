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
    if (!dateInput) return null;
    
    // Check if it's an Excel serial number
    if (typeof dateInput === 'number') {
        const date = XLSX.SSF.parse_date_code(dateInput);
        if (date) {
            // JS months are 0-indexed, so subtract 1 from month
            return new Date(date.y, date.m - 1, date.d);
        }
    }

    if (typeof dateInput === 'string') {
        // Handles MM-DD-YYYY, YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY
        const parts = dateInput.split(/[-/]/);
        if (parts.length === 3) {
            let year, month, day;
            if (parts[0].length === 4) { // YYYY-MM-DD
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10) - 1;
                day = parseInt(parts[2], 10);
            } else { // MM-DD-YYYY or MM/DD/YYYY
                month = parseInt(parts[0], 10) - 1;
                day = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
            }
            
            if (String(year).length === 2) {
                year = year >= 50 ? 1900 + year : 2000 + year;
            }

            const date = new Date(year, month, day);
            if (!isNaN(date.getTime()) && year > 1900) {
                return date;
            }
        }
    }
    
    // Try native Date parsing as a last resort
    const nativeDate = new Date(dateInput);
    if (isValidDate(nativeDate)) {
        return nativeDate;
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
          const workbook = XLSX.read(data, { type: 'array' });
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
          
          expectedHeaders.forEach(header => {
            const index = headerRow.findIndex(cell => cell === header);
            if (index !== -1) {
              headerIndexMap[header] = index;
            }
          });

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

            const weddingAnniversaryValue = row[headerIndexMap['WeddingAnniversary']];
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
              nickname: row[headerIndexMap['Nickname']] ? String(row[headerIndexMap['Nickname']]) : '',
              email: row[headerIndexMap['Email']] ? String(row[headerIndexMap['Email']]) : '',
              phone: row[headerIndexMap['Phone']] ? String(row[headerIndexMap['Phone']]) : '',
              birthday: birthday!,
              weddingAnniversary: weddingAnniversary,
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
            Upload an Excel file (.xlsx, .xls, .csv) with member data.
            Ensure your file has columns: `FullName`, `Birthday`, and optionally `Nickname`, `Email`, `Phone`, and `WeddingAnniversary`.
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
                                    <TableHead>Anniversary</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {parsedMembers.map((member, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{member.fullName}</TableCell>
                                        <TableCell>{member.email || 'N/A'}</TableCell>
                                        <TableCell>{isValidDate(member.birthday) ? member.birthday.toLocaleDateString() : 'Invalid Date'}</TableCell>
                                        <TableCell>{member.weddingAnniversary && isValidDate(member.weddingAnniversary) ? member.weddingAnniversary.toLocaleDateString() : 'N/A'}</TableCell>
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
