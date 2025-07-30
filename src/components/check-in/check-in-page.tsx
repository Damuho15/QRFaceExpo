'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { Camera, Upload, UserCheck, UserX, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { recognizeFace } from '@/ai/flows/face-recognition-flow';


const getNextSunday = (from = new Date()) => {
    const date = new Date(from);
    const day = date.getDay();
    const nextSunday = new Date(date);
    nextSunday.setDate(date.getDate() + (7 - day) % 7);
    if(day === 0 && from.getTime() > date.getTime()){ // if today is sunday but time has passed
         nextSunday.setDate(date.getDate() + 7);
    }
    nextSunday.setHours(9, 0, 0, 0);
    return nextSunday;
};


const getPreviousTuesday = (fromDate: Date) => {
    const date = new Date(fromDate);
    const day = date.getDay(); // Sunday is 0, Tuesday is 2
    const prevTuesday = new Date(date);
    // Go back to the previous Tuesday. If today is Sunday (0), go back 5 days. If Monday (1), 6 days. If Tuesday (2), 0 days.
    prevTuesday.setDate(date.getDate() - (day < 2 ? day + 5 : day - 2));
    prevTuesday.setHours(0, 0, 0, 0);
    return prevTuesday;
};


const getRegistrationType = (scanDate: Date, eventDate: Date, preRegStartDate: Date): 'Pre-registration' | 'Actual' | null => {
    const preRegStart = new Date(preRegStartDate);
    preRegStart.setHours(0, 0, 0, 0);

    const eventStartTime = new Date(eventDate);
    eventStartTime.setHours(9, 0, 0, 0);
    
    const preRegEndTime = new Date(eventStartTime);
    preRegEndTime.setMilliseconds(preRegEndTime.getMilliseconds() - 1);


    if (scanDate >= preRegStart && scanDate < preRegEndTime) {
        return 'Pre-registration';
    }
    
    if (scanDate >= eventStartTime) {
        return 'Actual';
    }

    return null;
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
    const [isMounted, setIsMounted] = useState(false);
    
    // State for dates
    const [eventDate, setEventDate] = useState<Date>(new Date());
    const [preRegStartDate, setPreRegStartDate] = useState<Date>(new Date());

    // State for manual overrides
    const [isPreRegDateManuallySet, setIsPreRegDateManuallySet] = useState(false);
    
    // State for popovers and temporary date selections
    const [preRegPopoverOpen, setPreRegPopoverOpen] = useState(false);
    const [tempPreRegDate, setTempPreRegDate] = useState<Date | undefined>(preRegStartDate);
    const [eventPopoverOpen, setEventPopoverOpen] = useState(false);
    const [tempEventDate, setTempEventDate] = useState<Date | undefined>(eventDate);

    // Effect for initializing and managing dates from localStorage
    useEffect(() => {
        setIsMounted(true);
        //const today = new Date();
        const today = new Date('2024-08-01')
        today.setHours(0,0,0,0);

        const storedEventDateStr = localStorage.getItem('eventDate');
        const storedPreRegDateStr = localStorage.getItem('preRegStartDate');
        const storedManualSetStr = localStorage.getItem('isPreRegDateManuallySet');
        
        let currentEventDate = storedEventDateStr ? new Date(storedEventDateStr) : getNextSunday();
        
        // Automatic Weekly Cycle Logic
        if (today > currentEventDate) {
            // If the stored event date is in the past, reset to the next cycle
            currentEventDate = getNextSunday();
            localStorage.setItem('eventDate', currentEventDate.toISOString());
            localStorage.removeItem('preRegStartDate'); // Clear old override
            localStorage.removeItem('isPreRegDateManuallySet'); // Clear override flag
            setEventDate(currentEventDate);
            setPreRegStartDate(getPreviousTuesday(currentEventDate));
            setIsPreRegDateManuallySet(false);
        } else {
            // Event date is still valid, use stored values
            const manualSet = storedManualSetStr ? JSON.parse(storedManualSetStr) : false;
            setIsPreRegDateManuallySet(manualSet);
            setEventDate(currentEventDate);

            if (manualSet && storedPreRegDateStr) {
                setPreRegStartDate(new Date(storedPreRegDateStr));
            } else {
                setPreRegStartDate(getPreviousTuesday(currentEventDate));
            }
        }
    }, []);

    // Save changes to localStorage whenever dates are updated
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem('eventDate', eventDate.toISOString());
            localStorage.setItem('preRegStartDate', preRegStartDate.toISOString());
            localStorage.setItem('isPreRegDateManuallySet', JSON.stringify(isPreRegDateManuallySet));
        }
    }, [eventDate, preRegStartDate, isPreRegDateManuallySet, isMounted]);

    // Handlers for applying date changes from popovers
    const handlePreRegApply = () => {
        if (tempPreRegDate) {
            setPreRegStartDate(tempPreRegDate);
            setIsPreRegDateManuallySet(true); // Mark as manual override
        }
        setPreRegPopoverOpen(false);
    };

    const handleEventDateApply = () => {
        if (tempEventDate) {
            setEventDate(tempEventDate);
            // If event date changes, recalculate pre-reg date only if it wasn't manually set
            if (!isPreRegDateManuallySet) {
                setPreRegStartDate(getPreviousTuesday(tempEventDate));
            }
        }
        setEventPopoverOpen(false);
    };

    // Sync temporary dates in popovers with main state when opened
    useEffect(() => {
        setTempPreRegDate(preRegStartDate);
    }, [preRegStartDate, preRegPopoverOpen]);

    useEffect(() => {
        setTempEventDate(eventDate);
    }, [eventDate, eventPopoverOpen]);


    if (!isMounted) {
        return null; // Render nothing until client-side hydration is complete
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
                    Configure the event and pre-registration dates. Pre-registration ends on event day at 8:59 AM.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col space-y-2">
                     <Label>Pre-registration Start Date</Label>
                    <Popover open={preRegPopoverOpen} onOpenChange={setPreRegPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !preRegStartDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {preRegStartDate ? format(preRegStartDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={tempPreRegDate}
                                onSelect={(date) => {
                                    if (date) {
                                        const newDate = new Date(date);
                                        newDate.setHours(0,0,0,0);
                                        setTempPreRegDate(newDate);
                                    }
                                }}
                                disabled={(date) => date > eventDate}
                                initialFocus
                            />
                            <CardFooter className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setPreRegPopoverOpen(false)}>Cancel</Button>
                                <Button onClick={handlePreRegApply}>Apply</Button>
                            </CardFooter>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-col space-y-2">
                     <Label>Event Date (Sunday @ 9:00 AM)</Label>
                    <Popover open={eventPopoverOpen} onOpenChange={setEventPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !eventDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={tempEventDate}
                                onSelect={(date) => {
                                    if (date) {
                                        const newDate = new Date(date);
                                        newDate.setHours(9,0,0,0);
                                        setTempEventDate(newDate);
                                    }
                                }}
                                initialFocus
                            />
                             <CardFooter className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setEventPopoverOpen(false)}>Cancel</Button>

                                <Button onClick={handleEventDateApply}>Apply</Button>
                            </CardFooter>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
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
