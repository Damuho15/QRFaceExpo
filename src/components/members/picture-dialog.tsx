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
import type { Member } from '@/lib/types';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PictureDialogProps {
  member: Member;
  children: React.ReactNode;
}

export default function PictureDialog({ member, children }: PictureDialogProps) {
  const [open, setOpen] = useState(false);

  if (!member.pictureUrl) {
    return <>{children}</>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member.fullName}</DialogTitle>
           <DialogDescription>
            Member picture
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <Avatar className="h-64 w-64 rounded-md">
            <AvatarImage
                src={member.pictureUrl || ''}
                alt={member.fullName}
                data-ai-hint="member picture"
                className="object-cover"
            />
            <AvatarFallback className="rounded-md text-4xl">
                {member.fullName ? member.fullName.charAt(0) : ''}
            </AvatarFallback>
          </Avatar>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
