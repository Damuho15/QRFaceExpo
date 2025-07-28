'use client';

import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, UserCheck, UserX } from 'lucide-react';

const QRCheckinTab = () => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFileName(event.target.files[0].name);
        }
    }

    const handleCheckIn = () => {
        // In a real app, you would use a library like jsQR to decode the uploaded image.
        // Here we simulate the process.
        toast({
            title: 'Simulating QR Scan...',
            description: 'Decoding uploaded QR code.',
        });

        setTimeout(() => {
            const isSuccess = Math.random() > 0.3; // 70% success rate
            if (isSuccess) {
                toast({
                    title: 'Check-in Successful',
                    description: 'Member "Jane Doe" has been checked in.',
                    variant: 'default',
                });
            } else {
                toast({
                    title: 'Check-in Failed',
                    description: 'Could not decode QR code or member not found.',
                    variant: 'destructive',
                });
            }
            setFileName('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }, 1500);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>QR Code Check-in</CardTitle>
                <CardDescription>Upload a member's QR code to check them in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="qr-upload">Upload QR Code</Label>
                    <div className="flex items-center gap-2">
                        <Input id="qr-upload" type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Choose File
                        </Button>
                        {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Registration Type</Label>
                    <RadioGroup defaultValue="actual" className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pre-reg" id="pre-reg" />
                            <Label htmlFor="pre-reg">Pre-registration</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="actual" id="actual" />
                            <Label htmlFor="actual">Actual Registration</Label>
                        </div>
                    </RadioGroup>
                </div>
                <Button onClick={handleCheckIn} className="w-full">Perform Check-in</Button>
            </CardContent>
        </Card>
    );
};

const FaceCheckinTab = () => {
    const { toast } = useToast();
    const simulateCheckIn = (success: boolean) => {
        toast({
            title: 'Simulating Face Recognition...',
            description: 'Matching face with database.',
        });

        setTimeout(() => {
            if (success) {
                toast({
                    title: 'Check-in Successful',
                    description: 'Member "John Doe" recognized and checked in.',
                });
            } else {
                toast({
                    title: 'Check-in Failed',
                    description: 'Face not recognized or match not found.',
                    variant: 'destructive',
                });
            }
        }, 1500);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Face Recognition Check-in</CardTitle>
                <CardDescription>Use the camera to check in members via face recognition.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <Camera className="h-16 w-16 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => simulateCheckIn(true)}>
                        <UserCheck className="mr-2 h-4 w-4" /> Simulate Success
                    </Button>
                    <Button variant="destructive" onClick={() => simulateCheckIn(false)}>
                        <UserX className="mr-2 h-4 w-4" /> Simulate Fail
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default function CheckInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Event Check-in</h1>
        <p className="text-muted-foreground">
          Select a method to record member attendance.
        </p>
      </div>
      <Tabs defaultValue="qr" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr">QR Code</TabsTrigger>
          <TabsTrigger value="face">Face Recognition</TabsTrigger>
        </TabsList>
        <TabsContent value="qr">
            <QRCheckinTab />
        </TabsContent>
        <TabsContent value="face">
            <FaceCheckinTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
