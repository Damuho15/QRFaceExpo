
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Camera, Upload, UserCheck, UserX, Loader2, CheckCircle } from 'lucide-react';
import jsQR from 'jsqr';
import { recognizeFace } from '@/ai/flows/face-recognition-flow';
import { format } from 'date-fns';
import { getEventConfig, updateEventConfig } from '@/lib/supabaseClient';
import { Skeleton } from '../ui/skeleton';

const getNextSunday = (from: Date): Date => {
    const date = new Date(from.getTime());
    const day = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = (7 - day) % 7;
    date.setUTCDate(date.getUTCDate() + diff);
    // If today is Sunday, it should find the *next* Sunday
    if (diff === 0) {
        date.setUTCDate(date.getUTCDate() + 7);
    }
    return date;
};

const getPreviousTuesday = (from: Date): Date => {
    const date = new Date(from.getTime());
    const day = date.getUTCDay(); // 0 = Sunday, ..., 2 = Tuesday
    // Days to subtract to get to the previous Tuesday
    const daysToSubtract = (day + 7 - 2) % 7;
    date.setUTCDate(date.getUTCDate() - daysToSubtract);
    // If today is Tuesday, get the one from the week before
    if (daysToSubtract === 0) {
       date.setUTCDate(date.getUTCDate() - 7);
    }
    return date;
};


const getRegistrationType = (scanDate: Date, eventDate: Date, preRegStartDate: Date): 'Pre-registration' | 'Actual' | null => {
    const preRegStart = new Date(preRegStartDate);
    preRegStart.setUTCHours(0, 0, 0, 0);

    const eventStartTime = new Date(eventDate);
    eventStartTime.setUTCHours(9, 0, 0, 0);
    
    const preRegEndTime = new Date(eventStartTime);
    preRegEndTime.setUTCMilliseconds(preRegEndTime.getUTCMilliseconds() - 1);


    if (scanDate >= preRegStart && scanDate < preRegEndTime) {
        return 'Pre-registration';
    }
    
    if (scanDate >= eventStartTime) {
        return 'Actual';
    }

    return null;
}

// Helper to parse date strings as UTC
const parseDateAsUTC = (dateString: string) => {
    // The 'Z' suffix ensures the date is parsed in UTC, not the user's local timezone.
    const date = new Date(dateString + 'T00:00:00Z');
    return date;
}

const ScanTab = ({ eventDate, preRegStartDate }: { eventDate: Date; preRegStartDate: Date }) => {
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
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [eventDate, setEventDate] = useState<Date | null>(null);
    const [preRegStartDate, setPreRegStartDate] = useState<Date | null>(null);
    
    const [tempEventDate, setTempEventDate] = useState<Date | null>(null);
    const [tempPreRegStartDate, setTempPreRegStartDate] = useState<Date | null>(null);


    const fetchAndSetDates = useCallback(async () => {
        setIsLoading(true);
        try {
            const config = await getEventConfig();
            if (config) {
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);

                const dbEventDate = parseDateAsUTC(config.event_date);
                
                if (today > dbEventDate) {
                    const newEventDate = getNextSunday(today);
                    const newPreRegDate = getPreviousTuesday(newEventDate);
                    
                    await updateEventConfig({
                        pre_reg_start_date: newPreRegDate.toISOString().split('T')[0],
                        event_date: newEventDate.toISOString().split('T')[0],
                    });
                    
                    setEventDate(newEventDate);
                    setPreRegStartDate(newPreRegDate);
                    setTempEventDate(newEventDate);
                    setTempPreRegStartDate(newPreRegDate);

                     toast({
                        title: 'Event Dates Updated',
                        description: 'The event has been automatically rolled over to the next week.',
                    });

                } else {
                    const storedEventDate = parseDateAsUTC(config.event_date);
                    const storedPreRegDate = parseDateAsUTC(config.pre_reg_start_date);

                    setEventDate(storedEventDate);
                    setPreRegStartDate(storedPreRegDate);
                    setTempEventDate(storedEventDate);
                    setTempPreRegStartDate(storedPreRegDate);
                }
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not load event configuration.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch or update event dates.' });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchAndSetDates();
    }, [fetchAndSetDates]);

    const handleManualDateUpdate = async (newPreRegDate: Date, newEventDate: Date) => {
        setIsLoading(true);
        try {
            await updateEventConfig({
                pre_reg_start_date: newPreRegDate.toISOString().split('T')[0],
                event_date: newEventDate.toISOString().split('T')[0],
            });
            setPreRegStartDate(newPreRegDate);
            setEventDate(newEventDate);

            setTempPreRegStartDate(newPreRegDate);
            setTempEventDate(newEventDate);
            toast({
                title: 'Dates Updated',
                description: 'The event dates have been successfully saved.',
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save updated dates.' });
            if(preRegStartDate && eventDate) {
                setTempPreRegStartDate(preRegStartDate);
                setTempEventDate(eventDate);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onApplyChanges = () => {
         if (!tempPreRegStartDate || !tempEventDate) {
            toast({ variant: 'destructive', title: 'Error', description: 'Dates cannot be empty.' });
            return;
         }

         if (tempPreRegStartDate >= tempEventDate) {
            toast({
                variant: 'destructive',
                title: 'Invalid Dates',
                description: 'The pre-registration date must be before the event date.',
            });
            return;
        }
        handleManualDateUpdate(tempPreRegStartDate, tempEventDate);
    };
    
    const onPreRegDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const newDate = parseDateAsUTC(e.target.value);
            setTempPreRegStartDate(newDate);
        }
    };

    const onEventDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.value) {
            const newDate = parseDateAsUTC(e.target.value);
            setTempEventDate(newDate);
        }
    };

    const areDatesChanged =
    (tempPreRegStartDate?.getTime() !== preRegStartDate?.getTime()) ||
    (tempEventDate?.getTime() !== eventDate?.getTime());

  if (isLoading || !eventDate || !preRegStartDate || !tempEventDate || !tempPreRegStartDate) {
    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-2xl font-bold font-headline">Event Check-in</h1>
                <p className="text-muted-foreground">
                Select a method to record member attendance.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Event Configuration</CardTitle>
                    <CardDescription>
                         Loading event configuration...
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                     <div className="flex flex-col space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Event Check-in</h1>
        <p className="text-muted-foreground">
          Select a method to record member attendance.
        </p>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Event Configuration</CardTitle>
                <CardDescription>
                    Configure the event and pre-registration dates. Pre-registration ends on event day at 8:59 AM. Automated changes are saved immediately. Manual changes require clicking 'Apply'.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col space-y-2">
                     <Label>Pre-registration Start Date</Label>
                      <Input
                        type="date"
                        value={format(tempPreRegStartDate, 'yyyy-MM-dd')}
                        onChange={onPreRegDateChange}
                        className="w-full"
                        disabled={isLoading}
                      />
                </div>
                <div className="flex flex-col space-y-2">
                     <Label>Event Date (Sunday @ 9:00 AM)</Label>
                     <Input
                        type="date"
                        value={format(tempEventDate, 'yyyy-MM-dd')}
                        onChange={onEventDateChange}
                        className="w-full"
                        disabled={isLoading}
                      />
                </div>
            </CardContent>
             <CardFooter>
                {areDatesChanged && (
                    <Button onClick={onApplyChanges} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Apply Changes
                    </Button>
                )}
            </CardFooter>
        </Card>

      <Tabs defaultValue="qr" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr">QR Code</TabsTrigger>
          <TabsTrigger value="face">Face Recognition</TabsTrigger>
        </TabsList>
        <TabsContent value="qr">
            <QRCheckinTab eventDate={eventDate} preRegStartDate={preRegStartDate} />
        </TabsContent>
        <TabsContent value="face">
            <FaceCheckinTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
