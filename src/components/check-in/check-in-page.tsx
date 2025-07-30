
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Camera, Upload, UserCheck, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';
import { recognizeFace } from '@/ai/flows/face-recognition-flow';
import { getEventConfig, parseDateAsUTC } from '@/lib/supabaseClient';
import DateConfigCard, { getRegistrationType } from './date-config-card';

const ScanTab = ({ eventDate, preRegStartDate }: { eventDate: Date; preRegStartDate: Date }) => {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    const handleCheckIn = useCallback((qrData: string) => {
        const registrationType = getRegistrationType(new Date(), eventDate, preRegStartDate);

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
    }, [eventDate, preRegStartDate, toast]);

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
    }, [hasCameraPermission, isScanning, handleCheckIn]);


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
                        <p className="mt-4 text-lg font-semibold">Scan Successful!</p>
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


const UploadTab = ({ eventDate, preRegStartDate }: { eventDate: Date; preRegStartDate: Date }) => {
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
                        const code = jsQR(imageData.data, imageData.width, canvas.width, canvas.height);
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
        const registrationType = getRegistrationType(new Date(), eventDate, preRegStartDate);

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


const QRCheckinTab = ({ eventDate, preRegStartDate }: { eventDate: Date, preRegStartDate: Date }) => {
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
                        <ScanTab eventDate={eventDate} preRegStartDate={preRegStartDate} />
                    </TabsContent>
                    <TabsContent value="upload" className="pt-6">
                        <UploadTab eventDate={eventDate} preRegStartDate={preRegStartDate}/>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

const FaceCheckinTab = () => {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const getCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings to use this app.',
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

    const handleCheckIn = async () => {
        if (!videoRef.current || !hasCameraPermission) {
            toast({
                variant: 'destructive',
                title: 'Cannot Check-in',
                description: 'Camera access is required for face recognition.',
            });
            return;
        }

        setIsProcessing(true);
        toast({
            title: 'Processing Image...',
            description: 'Capturing frame and analyzing face.',
        });

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsProcessing(false);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not process video frame.' });
            return;
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageDataUri = canvas.toDataURL('image/jpeg');

        try {
            const result = await recognizeFace({ imageDataUri });
            if (result.matchFound && result.member) {
                toast({
                    title: 'Check-in Successful',
                    description: `Welcome, ${result.member.fullName}!`,
                });
            } else {
                toast({
                    title: 'Check-in Failed',
                    description: 'Face not recognized. Please try again or use QR code.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Face recognition error:', error);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'An error occurred during face recognition analysis.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
    <Card>
      <CardHeader>
        <CardTitle>Face Recognition Check-in</CardTitle>
        <CardDescription>Use the camera to check in members via face recognition.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative w-full aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                    <Camera className="h-16 w-16 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Camera not available</p>
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
        <Button onClick={handleCheckIn} disabled={isProcessing || !hasCameraPermission} className="w-full">
            {isProcessing ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recognizing...
                </>
            ) : (
                <>
                    <UserCheck className="mr-2 h-4 w-4" /> Check In
                </>
            )}
        </Button>
      </CardContent>
    </Card>
    );
};


export default function CheckInPage() {
    const [eventDate, setEventDate] = useState<Date | null>(null);
    const [preRegStartDate, setPreRegStartDate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
        const fetchInitialDates = async () => {
            setIsLoading(true);
            try {
                const config = await getEventConfig();
                 if (config) {
                    const eventDate = parseDateAsUTC(config.event_date);
                    const preRegStartDate = parseDateAsUTC(config.pre_reg_start_date);
                    setEventDate(eventDate);
                    setPreRegStartDate(preRegStartDate);
                }
            } catch (error) {
                 console.error('Failed to fetch initial dates', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialDates();
    }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Event Check-in</h1>
        <p className="text-muted-foreground">
          Select a method to record member attendance.
        </p>
      </div>

       <DateConfigCard 
         onDatesChange={(newPreRegDate, newEventDate) => {
            setPreRegStartDate(newPreRegDate);
            setEventDate(newEventDate);
         }}
       />

      <Tabs defaultValue="qr" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr">QR Code</TabsTrigger>
          <TabsTrigger value="face">Face Recognition</TabsTrigger>
        </TabsList>
        <TabsContent value="qr">
            {eventDate && preRegStartDate && !isLoading ? (
                <QRCheckinTab eventDate={eventDate} preRegStartDate={preRegStartDate} />
            ) : (
                <Card><CardHeader><CardTitle>Loading Check-in...</CardTitle></CardHeader></Card>
            )}
        </TabsContent>
        <TabsContent value="face">
            <FaceCheckinTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
