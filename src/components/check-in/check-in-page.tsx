'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, UserCheck, UserX } from 'lucide-react';
import jsQR from 'jsqr';

const EVENT_DATE = new Date();
EVENT_DATE.setHours(9, 0, 0, 0); // Event starts at 9:00 AM

const getRegistrationType = (scanDate: Date): 'Pre-registration' | 'Actual' | null => {
    const eventDay = new Date(EVENT_DATE);
    eventDay.setHours(0, 0, 0, 0);

    const fiveDaysBefore = new Date(eventDay);
    fiveDaysBefore.setDate(fiveDaysBefore.getDate() - 5);

    const scanDay = new Date(scanDate);
    scanDay.setHours(0, 0, 0, 0);

    if (scanDay.getTime() >= fiveDaysBefore.getTime() && scanDay.getTime() < eventDay.getTime()) {
        return 'Pre-registration';
    }
    
    if (scanDay.getTime() === eventDay.getTime() && scanDate.getTime() >= EVENT_DATE.getTime()) {
        return 'Actual';
    }

    return null;
}

const ScanTab = () => {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const getCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setHasCameraPermission(true);
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        };
        getCameraPermission();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [toast]);

    useEffect(() => {
        let animationFrameId: number;

        const tick = () => {
            if (isScanning && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'dontInvert',
                    });

                    if (code) {
                        setScanResult(code.data);
                        handleCheckIn(code.data);
                        setIsScanning(false);
                        return;
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        if (hasCameraPermission) {
            animationFrameId = requestAnimationFrame(tick);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [hasCameraPermission, isScanning]);

    const handleCheckIn = (qrData: string) => {
        const registrationType = getRegistrationType(new Date());

        if (!registrationType) {
            toast({
                title: 'Check-in Not Allowed',
                description: 'Check-in is not open at this time.',
                variant: 'destructive',
            });
            setTimeout(() => setIsScanning(true), 2000);
            return;
        }

        toast({
            title: `QR Code Scanned for ${registrationType}!`,
            description: `Data: ${qrData}. Simulating check-in...`,
        });

        setTimeout(() => {
            toast({
                title: 'Check-in Successful',
                description: `Member with QR data "${qrData}" has been checked in for ${registrationType}.`,
                variant: 'default',
            });
            setTimeout(() => setIsScanning(true), 2000); // Allow scanning again
        }, 1500);
    };

    return (
        <div className="space-y-4">
            <div className="relative w-full aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                         <Camera className="h-16 w-16 text-muted-foreground" />
                         <p className="mt-2 text-muted-foreground">Camera not available</p>
                    </div>
                )}
                 {!isScanning && scanResult && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90">
                        <UserCheck className="h-16 w-16 text-green-500" />
                        <p className="mt-4 text-lg font-semibold">Check-in Complete</p>
                        <p className="text-sm text-muted-foreground">Ready for next scan...</p>
                    </div>
                )}
            </div>
             {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                        Please allow camera access in your browser settings to use this feature.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};


const UploadTab = () => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        if (code) {
                            handleCheckIn(code.data);
                        } else {
                             toast({
                                title: 'Check-in Failed',
                                description: 'Could not decode QR code from the uploaded image.',
                                variant: 'destructive',
                            });
                        }
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleCheckIn = (qrData: string) => {
        const registrationType = getRegistrationType(new Date());

        if (!registrationType) {
            toast({
                title: 'Check-in Not Allowed',
                description: 'Check-in is not open at this time.',
                variant: 'destructive',
            });
            return;
        }

        toast({
            title: `QR Code Decoded for ${registrationType}!`,
            description: `Data: ${qrData}. Simulating check-in...`,
        });

        setTimeout(() => {
            toast({
                title: 'Check-in Successful',
                description: `Member with QR data "${qrData}" has been checked in for ${registrationType}.`,
                variant: 'default',
            });
             setFileName('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="qr-upload">Upload QR Code Image</Label>
                <div className="flex items-center gap-2">
                    <Input id="qr-upload" type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                    </Button>
                    {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
                </div>
                 <p className="text-xs text-muted-foreground pt-2">
                    Registration type will be automatically determined based on the upload time.
                </p>
            </div>
        </div>
    );
};


const QRCheckinTab = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>QR Code Check-in</CardTitle>
                <CardDescription>Scan or upload a member's QR code to check them in.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="scan">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="scan">Scan with Camera</TabsTrigger>
                        <TabsTrigger value="upload">Upload File</TabsTrigger>
                    </TabsList>
                    <TabsContent value="scan" className="pt-6">
                        <ScanTab />
                    </TabsContent>
                    <TabsContent value="upload" className="pt-6">
                        <UploadTab />
                    </TabsContent>
                </Tabs>
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
