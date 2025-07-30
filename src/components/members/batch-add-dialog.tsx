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
import { addMembers } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type NewMember = Omit<Member, 'id' | 'qrCodePayload'> & { qrCodePayload?: string };

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
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

          const invalidRows: number[] = [];
          const members: NewMember[] = json.map((row, index) => {
            const birthday = new Date(row.birthday);

            if (!row.fullName || !row.email || !row.birthday || isNaN(birthday.getTime())) {
                invalidRows.push(index + 2); // Excel rows are 1-based, and we have a header
            }

            return {
              fullName: String(row.fullName),
              nickname: row.nickname ? String(row.nickname) : '',
              email: String(row.email),
              phone: row.phone ? String(row.phone) : '',
              birthday: birthday,
              weddingAnniversary: row.weddingAnniversary ? new Date(row.weddingAnniversary) : null,
            };
          });

          if (invalidRows.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Data Found',
                description: `Please check rows: ${invalidRows.join(', ')}. Ensure fullName, email, and a valid birthday are provided.`,
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
            description: error instanceof Error ? error.message : 'Could not parse the Excel file. Please ensure it has columns: fullName, email, birthday, and optionally weddingAnniversary, nickname and phone.',
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
      const result = await addMembers(parsedMembers);
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
            Ensure your file has columns: `fullName`, `email`, `birthday`, and optionally `nickname`, `phone`, and `weddingAnniversary`.
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
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.birthday.toLocaleDateString()}</TableCell>
                                        <TableCell>{member.weddingAnniversary ? member.weddingAnniversary.toLocaleDateString() : 'N/A'}</TableCell>
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
