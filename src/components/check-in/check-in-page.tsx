
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, UserCheck, Loader2, CheckCircle, UserX } from 'lucide-react';
import jsQR from 'jsqr';
import { recognizeFace, RecognizeFaceOutput } from '@/ai/flows/face-recognition-flow';
import { getEventConfig, updateEventConfig, parseDateAsUTC, getMembers, addAttendanceLog, getFirstTimers, addFirstTimerAttendanceLog } from '@/lib/supabaseClient';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { Member, FirstTimer } from '@/lib/types';
import { isValidUUID } from '@/lib/validation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const getRegistrationType = (scanDate: Date, eventDate: Date, preRegStartDate: Date): 'Pre-registration' | 'Actual' | null => {
    const preRegStart = new Date(preRegStartDate);
    preRegStart.setUTCHours(0, 0, 0, 0);

    const eventStartTime = new Date(eventDate);
    eventStartTime.setUTCHours(9, 0, 0, 0); // 9:00 AM UTC

    const eventEndTime = new Date(eventDate);
    eventEndTime.setUTCHours(23, 30, 0, 0); // 11:30 PM UTC
    
    const preRegEndTime = new Date(eventStartTime);
    preRegEndTime.setUTCMilliseconds(preRegEndTime.getUTCMilliseconds() - 1);

    if (scanDate >= preRegStart && scanDate <= preRegEndTime) {
        return 'Pre-registration';
    }
    
    // Check if it's within the event day window (9:00 AM to 11:30 PM UTC)
    if (scanDate >= eventStartTime && scanDate <= eventEndTime) {
        return 'Actual';
    }

    // Allow check-ins after the event day to be counted as 'Actual' for simplicity,
    // though the date rollover logic should typically handle this.
    if (scanDate > eventEndTime) {
        return 'Actual'
    }

    return null;
}

const getNextSunday = (from: Date): Date => {
    const date = new Date(from);
    date.setUTCDate(date.getUTCDate() + (7 - date.getUTCDay()) % 7);
    return date;
};

const getPreviousTuesday = (from: Date): Date => {
    const date = new Date(from); // from is a Sunday
    const day = date.getUTCDay(); // Sunday is 0
    const diff = (day + 5) % 7;
    date.setUTCDate(date.getUTCDate() - diff);
    return date;
};

const MemberScanTab = ({ members, onCheckInSuccess, eventDate, preRegStartDate }: { members: Member[], onCheckInSuccess: () => void, eventDate: Date, preRegStartDate: Date }) => {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const animationFrameId = useRef<number>();

    // State for the confirmation dialog
    const [showDialog, setShowDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmedMember, setConfirmedMember] = useState<Member | null>(null);
    const [registrationType, setRegistrationType] = useState<'Pre-registration' | 'Actual' | null>(null);

    const handleScan = useCallback((qrData: string) => {
        if (!isScanning) return;
        setIsScanning(false);
        
        toast({
            title: 'QR Code Detected',
            description: 'Processing...',
        });

        const currentRegistrationType = getRegistrationType(new Date(), eventDate, preRegStartDate);
        if (!currentRegistrationType) {
            toast({
                title: 'Check-in Not Allowed',
                description: 'Check-in is not open at this time.',
                variant: 'destructive',
            });
            setTimeout(() => setIsScanning(true), 2000);
            return;
        }

        const matchedMember = members.find(m => m.qrCodePayload === qrData);
        
        setConfirmedMember(matchedMember || null);
        if(matchedMember) {
            setRegistrationType(currentRegistrationType);
        } else {
            setRegistrationType(null);
        }
        setShowDialog(true);

    }, [isScanning, members, eventDate, preRegStartDate, toast]);
    
     const closeDialog = () => {
        setShowDialog(false);
        setIsSaving(false);
        setConfirmedMember(null);
        setRegistrationType(null);
        // Resume scanning immediately after the dialog is closed
        setIsScanning(true);
    }

    const confirmAndSaveChanges = async () => {
        if (!confirmedMember || !registrationType) {
             toast({
                title: 'Save Failed',
                description: 'Cannot save attendance due to missing member data.',
                variant: 'destructive',
            });
            closeDialog();
            return;
        }

        setIsSaving(true);
        try {
            await addAttendanceLog({
                member_id: confirmedMember.id,
                member_name: confirmedMember.fullName,
                type: registrationType,
                method: 'QR',
                timestamp: new Date()
            });
            toast({
                title: 'Check-in Successful',
                description: `${confirmedMember.fullName} has been checked in.`,
            });
            onCheckInSuccess();
        } catch (error) {
            console.error("Error adding attendance log:", error);
            const errorMessage = error instanceof Error ? error.message : 'Could not save attendance. Please check your connection or contact support.';
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: errorMessage,
            });
        } finally {
            closeDialog();
        }
    };


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
            if(animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [toast]);

    useEffect(() => {
        let lastScanTime = 0;
        const scanInterval = 200; // Scan every 200ms for performance

        const tick = (time: number) => {
            if (isScanning && hasCameraPermission && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                if (time - lastScanTime > scanInterval) {
                    lastScanTime = time;
                    const canvas = canvasRef.current;
                    const video = videoRef.current;
                    if(canvas && video) {
                        canvas.height = video.videoHeight;
                        canvas.width = video.videoWidth;
                        const context = canvas.getContext('2d', { willReadFrequently: true });
                        if (context) {
                            context.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                            try {
                                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                    inversionAttempts: 'attemptBoth',
                                });
                                if (code && code.data) {
                                    handleScan(code.data);
                                }
                            } catch (e) {
                                console.error("jsQR error", e)
                            }
                        }
                    }
                }
            }
            animationFrameId.current = requestAnimationFrame(tick);
        };

        animationFrameId.current = requestAnimationFrame(tick);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isScanning, hasCameraPermission, handleScan]);

    return (
        <>
        <div className="space-y-4">
            <div className="relative w-full aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {!isScanning && !showDialog && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                        <Loader2 className="h-16 w-16 text-muted-foreground animate-spin" />
                        <p className="mt-2 text-muted-foreground">Processing...</p>
                    </div>
                )}
                {hasCameraPermission === null && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                         <Loader2 className="h-16 w-16 text-muted-foreground animate-spin" />
                         <p className="mt-2 text-muted-foreground">Initializing camera...</p>
                    </div>
                )}
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
        </div>
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {confirmedMember 
                            ? `Welcome, ${confirmedMember.fullName}! Is this you?` 
                            : "Invalid QR Code"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {confirmedMember 
                            ? "Please confirm your identity to complete the check-in." 
                            : "We couldn't find a member associated with this QR code. Please try again."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog} disabled={isSaving}>Cancel</AlertDialogCancel>
                    {confirmedMember ? (
                        <AlertDialogAction onClick={confirmAndSaveChanges} disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Yes, it's me"}
                        </AlertDialogAction>
                    ) : (
                        <AlertDialogAction onClick={closeDialog}>OK</AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
};

const MemberUploadTab = ({ members, onCheckInSuccess, eventDate, preRegStartDate }: { members: Member[], onCheckInSuccess: () => void, eventDate: Date, preRegStartDate: Date }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    const resetInput = () => {
        setFileName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
    
    const handleCheckIn = async (qrData: string) => {
        const registrationType = getRegistrationType(new Date(), eventDate, preRegStartDate);

        if (!registrationType) {
            toast({
                title: 'Check-in Not Allowed',
                description: 'Check-in is not open at this time.',
                variant: 'destructive',
            });
            resetInput();
            return;
        }

        const matchedMember = members.find(m => m.qrCodePayload === qrData);

        if (matchedMember) {
            try {
                await addAttendanceLog({
                    member_id: matchedMember.id,
                    member_name: matchedMember.fullName,
                    type: registrationType,
                    method: 'QR',
                    timestamp: new Date()
                });
                 toast({
                    title: 'Check-in Successful',
                    description: `${matchedMember.fullName} has been checked in.`,
                });
                onCheckInSuccess();
            } catch (error) {
                 toast({
                    title: 'Check-in Failed',
                    description: 'Could not save attendance. Please check the logs.',
                    variant: 'destructive',
                });
            }
        } else {
             toast({
                title: 'Check-in Failed',
                description: 'Invalid QR Code. Member not found.',
                variant: 'destructive',
            });
        }
        resetInput();
    };

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
                        const code = jsQR(imageData.data, imageData.width, canvas.height, {
                            inversionAttempts: 'attemptBoth',
                        });
                        if (code && code.data) {
                            handleCheckIn(code.data);
                        } else {
                             toast({
                                title: 'Check-in Failed',
                                description: 'Could not decode QR code from the uploaded image.',
                                variant: 'destructive',
                            });
                            resetInput();
                        }
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="qr-upload-member">Upload Member QR Code Image</Label>
                <div className="flex items-center gap-2">
                    <Input id="qr-upload-member" type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
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

const QRCheckinTab = ({ members, onCheckInSuccess, eventDate, preRegStartDate }: { members: Member[], onCheckInSuccess: () => void, eventDate: Date, preRegStartDate: Date }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Member QR Code Check-in</CardTitle>
                <CardDescription>Scan or upload a member's QR code to check them in.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="scan">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="scan">Scan with Camera</TabsTrigger>
                        <TabsTrigger value="upload">Upload File</TabsTrigger>
                    </TabsList>
                    <TabsContent value="scan" className="pt-6">
                        <MemberScanTab members={members} onCheckInSuccess={onCheckInSuccess} eventDate={eventDate} preRegStartDate={preRegStartDate}/>
                    </TabsContent>
                    <TabsContent value="upload" className="pt-6">
                        <MemberUploadTab members={members} onCheckInSuccess={onCheckInSuccess} eventDate={eventDate} preRegStartDate={preRegStartDate}/>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

const FaceCheckinTab = ({ members, eventDate, preRegStartDate, onCheckInSuccess }: { members: Member[], eventDate: Date, preRegStartDate: Date, onCheckInSuccess: () => void }) => {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    
    // Simplified state for confirmed member details
    const [confirmedMemberId, setConfirmedMemberId] = useState<string | null>(null);
    const [confirmedMemberName, setConfirmedMemberName] = useState<string | null>(null);

    // State to hold the registration type determined at the time of verification.
    const [registrationType, setRegistrationType] = useState<'Pre-registration' | 'Actual' | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


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

    const handleVerification = async () => {
        if (!videoRef.current || !hasCameraPermission) {
            toast({
                variant: 'destructive',
                title: 'Cannot Check-in',
                description: 'Camera access is required for face recognition.',
            });
            return;
        }

        const currentRegistrationType = getRegistrationType(new Date(), eventDate, preRegStartDate);
        if (!currentRegistrationType) {
            toast({
                title: 'Check-in Not Allowed',
                description: 'Check-in is not open at this time.',
                variant: 'destructive',
            });
            return;
        }

        setIsProcessing(true);
        // Reset previous verification data
        setConfirmedMemberId(null);
        setConfirmedMemberName(null);
        
        toast({
            title: 'Verifying Member...',
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
            const result: RecognizeFaceOutput = await recognizeFace({ imageDataUri });
            setIsProcessing(false);
            
            if (result.matchFound && result.fullName) {
                const foundMember = members.find(m => m.fullName === result.fullName);
                if (foundMember) {
                    setConfirmedMemberId(foundMember.id);
                    setConfirmedMemberName(foundMember.fullName);
                    setRegistrationType(currentRegistrationType);
                } else {
                     setConfirmedMemberName(result.fullName); // Name found, but not in DB
                }
            }
            setShowDialog(true);
        } catch (error) {
            console.error('Face recognition error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred during face recognition analysis.';
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: errorMessage,
            });
            setIsProcessing(false);
        }
    };
    
    const confirmAndSaveChanges = async () => {
        if (!confirmedMemberId || !confirmedMemberName || !registrationType) {
             toast({
                title: 'Save Failed',
                description: 'Cannot save attendance due to missing member data.',
                variant: 'destructive',
            });
            closeDialog();
            return;
        }

        if (!isValidUUID(confirmedMemberId)) {
            toast({
                title: 'Save Failed',
                description: 'Cannot save attendance due to invalid member ID.',
                variant: 'destructive',
            });
            closeDialog();
            return;
        }
        
        setIsSaving(true);

        try {
            await addAttendanceLog({
                member_id: confirmedMemberId,
                member_name: confirmedMemberName,
                type: registrationType,
                method: 'Face',
                timestamp: new Date()
            });

            toast({
                title: 'Thank you for registering',
                description: `${confirmedMemberName} has been successfully checked in.`,
            });
            onCheckInSuccess();
        } catch(error: any) {
            console.error("Error adding attendance log:", error);
            const errorMessage = error instanceof Error ? error.message : 'Could not save attendance log. Please try again.';
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: errorMessage,
            });
        } finally {
            closeDialog();
        }
    }
    
    const closeDialog = () => {
        setIsSaving(false);
        setConfirmedMemberId(null);
        setConfirmedMemberName(null);
        setRegistrationType(null);
        setShowDialog(false);
    }

    return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Member Face Recognition Check-in</CardTitle>
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
             {hasCameraPermission === null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                         <Loader2 className="h-16 w-16 text-muted-foreground animate-spin" />
                         <p className="mt-2 text-muted-foreground">Initializing camera...</p>
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
        <Button onClick={handleVerification} disabled={isProcessing || hasCameraPermission !== true} className="w-full">
            {isProcessing ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                </>
            ) : (
                <>
                    <UserCheck className="mr-2 h-4 w-4" /> Verify Member
                </>
            )}
        </Button>
      </CardContent>
    </Card>

    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                     {confirmedMemberId 
                        ? `Welcome, ${confirmedMemberName}! Is this you?` 
                        : "Face Not Recognized"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {confirmedMemberId 
                        ? "Please confirm your identity to complete the check-in." 
                        : "We couldn't find a matching member in our records. Please try again or use the QR code check-in."}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                 <AlertDialogCancel onClick={closeDialog} disabled={isSaving}>Cancel</AlertDialogCancel>
                {confirmedMemberId ? (
                    <AlertDialogAction onClick={confirmAndSaveChanges} disabled={isSaving}>
                         {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Yes, it's me"}
                    </AlertDialogAction>
                ) : (
                     <AlertDialogAction onClick={closeDialog}>OK</AlertDialogAction>
                )}
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
    );
};


// ----- NEW COMER CHECK-IN COMPONENTS -----

const NewComerScanTab = ({ firstTimers, onCheckInSuccess, eventDate, preRegStartDate }: { firstTimers: FirstTimer[], onCheckInSuccess: () => void, eventDate: Date, preRegStartDate: Date }) => {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const animationFrameId = useRef<number>();

    // State for the confirmation dialog
    const [showDialog, setShowDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmedFirstTimer, setConfirmedFirstTimer] = useState<FirstTimer | null>(null);
    const [registrationType, setRegistrationType] = useState<'Pre-registration' | 'Actual' | null>(null);

    const handleScan = useCallback((qrData: string) => {
        if (!isScanning) return;
        setIsScanning(false);
        
        toast({
            title: 'QR Code Detected',
            description: 'Processing new comer...',
        });

        const currentRegistrationType = getRegistrationType(new Date(), eventDate, preRegStartDate);
        if (!currentRegistrationType) {
            toast({
                title: 'Check-in Not Allowed',
                description: 'Check-in is not open at this time.',
                variant: 'destructive',
            });
            setTimeout(() => setIsScanning(true), 2000);
            return;
        }

        const matchedFirstTimer = firstTimers.find(ft => ft.qrCodePayload === qrData);
        
        if (matchedFirstTimer) {
            toast({
                title: 'New Comer Found (Debug)',
                description: (
                    <div className="text-sm">
                        <p><b>ID:</b> {matchedFirstTimer.id}</p>
                        <p><b>Name:</b> {matchedFirstTimer.fullName}</p>
                        <p><b>QR Payload:</b> {matchedFirstTimer.qrCodePayload}</p>
                    </div>
                ),
                duration: 9000
            });
            setRegistrationType(currentRegistrationType);
        } else {
            setRegistrationType(null);
        }

        setConfirmedFirstTimer(matchedFirstTimer || null);
        setShowDialog(true);

    }, [isScanning, firstTimers, eventDate, preRegStartDate, toast]);
    
    const closeDialog = () => {
        setShowDialog(false);
        setIsSaving(false);
        setConfirmedFirstTimer(null);
        setRegistrationType(null);
        setIsScanning(true);
    }

    const confirmAndSaveChanges = async () => {
        if (!confirmedFirstTimer || !registrationType) {
             toast({
                title: 'Save Failed',
                description: 'Cannot save attendance due to missing new comer data.',
                variant: 'destructive',
            });
            closeDialog();
            return;
        }

        if (!isValidUUID(confirmedFirstTimer.id)) {
            toast({
                title: 'Save Failed',
                description: `Cannot save attendance due to invalid new comer ID: ${confirmedFirstTimer.id}`,
                variant: 'destructive',
            });
            closeDialog();
            return;
        }

        setIsSaving(true);
        try {
            await addFirstTimerAttendanceLog({
                first_timer_id: confirmedFirstTimer.id,
                first_timer_name: confirmedFirstTimer.fullName,
                type: registrationType,
                method: 'QR',
                timestamp: new Date()
            });
            toast({
                title: 'Check-in Successful',
                description: `${confirmedFirstTimer.fullName} has been checked in.`,
            });
            onCheckInSuccess();
        } catch (error) {
            console.error("Error adding new comer attendance log:", error);
            const errorMessage = error instanceof Error ? error.message : 'Could not save attendance.';
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: errorMessage,
            });
        } finally {
            closeDialog();
        }
    };

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
                    description: 'Please enable camera permissions.',
                });
            }
        };
        getCameraPermission();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [toast]);

    useEffect(() => {
        let lastScanTime = 0;
        const scanInterval = 200;

        const tick = (time: number) => {
            if (isScanning && hasCameraPermission && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                if (time - lastScanTime > scanInterval) {
                    lastScanTime = time;
                    const canvas = canvasRef.current;
                    const video = videoRef.current;
                    if(canvas && video) {
                        canvas.height = video.videoHeight;
                        canvas.width = video.videoWidth;
                        const context = canvas.getContext('2d', { willReadFrequently: true });
                        if (context) {
                            context.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
                            if (code && code.data) handleScan(code.data);
                        }
                    }
                }
            }
            animationFrameId.current = requestAnimationFrame(tick);
        };

        animationFrameId.current = requestAnimationFrame(tick);
        return () => {
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [isScanning, hasCameraPermission, handleScan]);

    return (
        <>
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
            </div>
             {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>Please allow camera access to use this feature.</AlertDescription>
                </Alert>
            )}
        </div>
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {confirmedFirstTimer 
                            ? `Welcome, ${confirmedFirstTimer.fullName}! Is this you?` 
                            : "Invalid New Comer QR Code"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {confirmedFirstTimer 
                            ? "Please confirm your identity to complete the check-in." 
                            : "We couldn't find a new comer associated with this QR code."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog} disabled={isSaving}>Cancel</AlertDialogCancel>
                    {confirmedFirstTimer ? (
                        <AlertDialogAction onClick={confirmAndSaveChanges} disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Yes, it's me"}
                        </AlertDialogAction>
                    ) : (
                        <AlertDialogAction onClick={closeDialog}>OK</AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
};

const NewComerUploadTab = ({ firstTimers, onCheckInSuccess, eventDate, preRegStartDate }: { firstTimers: FirstTimer[], onCheckInSuccess: () => void, eventDate: Date, preRegStartDate: Date }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    const resetInput = () => {
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
    
    const handleCheckIn = async (qrData: string) => {
        const registrationType = getRegistrationType(new Date(), eventDate, preRegStartDate);

        if (!registrationType) {
            toast({ title: 'Check-in Not Allowed', description: 'Check-in is not open at this time.', variant: 'destructive' });
            resetInput();
            return;
        }

        const matchedFirstTimer = firstTimers.find(ft => ft.qrCodePayload === qrData);

        if (matchedFirstTimer) {
            try {
                await addFirstTimerAttendanceLog({
                    first_timer_id: matchedFirstTimer.id,
                    first_timer_name: matchedFirstTimer.fullName,
                    type: registrationType,
                    method: 'QR',
                    timestamp: new Date()
                });
                 toast({ title: 'Check-in Successful', description: `${matchedFirstTimer.fullName} has been checked in.` });
                onCheckInSuccess();
            } catch (error) {
                 toast({ title: 'Check-in Failed', description: 'Could not save attendance.', variant: 'destructive' });
            }
        } else {
             toast({ title: 'Check-in Failed', description: 'Invalid QR Code. New comer not found.', variant: 'destructive' });
        }
        resetInput();
    };

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
                        const code = jsQR(imageData.data, imageData.width, canvas.height, { inversionAttempts: 'attemptBoth' });
                        if (code && code.data) {
                            handleCheckIn(code.data);
                        } else {
                             toast({ title: 'Check-in Failed', description: 'Could not decode QR code from the image.', variant: 'destructive' });
                             resetInput();
                        }
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="qr-upload-newcomer">Upload New Comer QR Code</Label>
                <div className="flex items-center gap-2">
                    <Input id="qr-upload-newcomer" type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Choose File
                    </Button>
                    {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
                </div>
            </div>
        </div>
    );
};

const NewComerCheckinTab = ({ firstTimers, onCheckInSuccess, eventDate, preRegStartDate }: { firstTimers: FirstTimer[], onCheckInSuccess: () => void, eventDate: Date, preRegStartDate: Date }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>New Comer QR Code Check-in</CardTitle>
                <CardDescription>Scan or upload a new comer's QR code to check them in.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="scan">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="scan">Scan with Camera</TabsTrigger>
                        <TabsTrigger value="upload">Upload File</TabsTrigger>
                    </TabsList>
                    <TabsContent value="scan" className="pt-6">
                        <NewComerScanTab firstTimers={firstTimers} onCheckInSuccess={onCheckInSuccess} eventDate={eventDate} preRegStartDate={preRegStartDate}/>
                    </TabsContent>
                    <TabsContent value="upload" className="pt-6">
                        <NewComerUploadTab firstTimers={firstTimers} onCheckInSuccess={onCheckInSuccess} eventDate={eventDate} preRegStartDate={preRegStartDate}/>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

// ----- END NEW COMER CHECK-IN COMPONENTS -----


export default function CheckInPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Dates from DB
    const [eventDate, setEventDate] = useState<Date | null>(null);
    const [preRegStartDate, setPreRegStartDate] = useState<Date | null>(null);
    
    // Temp dates for inputs
    const [tempEventDate, setTempEventDate] = useState<Date | null>(null);
    const [tempPreRegStartDate, setTempPreRegStartDate] = useState<Date | null>(null);

    const [members, setMembers] = useState<Member[]>([]);
    const [firstTimers, setFirstTimers] = useState<FirstTimer[]>([]);
    
    // This is a simple counter to trigger a re-fetch on the dashboard
    const [checkInCounter, setCheckInCounter] = useState(0);
    const handleCheckInSuccess = () => {
        setCheckInCounter(prev => prev + 1);
    }

     const fetchAndSetDates = useCallback(async () => {
        setIsLoading(true);
        try {
            const [config, allMembers, allFirstTimers] = await Promise.all([
                getEventConfig(), 
                getMembers(),
                getFirstTimers()
            ]);
            
            setMembers(allMembers);
            setFirstTimers(allFirstTimers);

            if (config) {
                // This is a test block to simulate a past date for rollover testing
                // In a real scenario, you'd use the actual current date.
                // const today = new Date('2026-01-01T12:00:00Z');
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
        setIsSaving(true);
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
            setIsSaving(false);
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
                Configure the event and pre-registration dates. Pre-registration is open until 8:59 AM on the event day. Actual day check-in is from 9:00 AM to 11:30 PM. Automated changes are saved immediately. Manual changes require clicking 'Apply'.
            </CardDescription>
        </CardHeader>
        {isLoading ? (
             <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex flex-col space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </CardContent>
        ) : (
            <>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="flex flex-col space-y-2">
                            <Label>Pre-registration Start Date</Label>
                            <Input
                            type="date"
                            value={tempPreRegStartDate ? format(tempPreRegStartDate, 'yyyy-MM-dd') : ''}
                            onChange={onPreRegDateChange}
                            className="w-full"
                            disabled={isSaving}
                            />
                    </div>
                    <div className="flex flex-col space-y-2">
                            <Label>Event Date (Sunday)</Label>
                            <Input
                            type="date"
                            value={tempEventDate ? format(tempEventDate, 'yyyy-MM-dd') : ''}
                            onChange={onEventDateChange}
                            className="w-full"
                            disabled={isSaving}
                            />
                    </div>
                </CardContent>
                {areDatesChanged && (
                    <CardFooter>
                        <Button onClick={onApplyChanges} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Apply Changes
                        </Button>
                    </CardFooter>
                )}
            </>
        )}
    </Card>

      <Tabs defaultValue="member-qr" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="member-qr">Member QR</TabsTrigger>
          <TabsTrigger value="new-comer-qr">New Comer QR</TabsTrigger>
          <TabsTrigger value="member-face">Member Face</TabsTrigger>
        </TabsList>
        <TabsContent value="member-qr">
            {isLoading || !eventDate || !preRegStartDate ? (
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex border-b">
                            <Skeleton className="h-10 flex-1 rounded-none" />
                            <Skeleton className="h-10 flex-1 rounded-none" />
                        </div>
                        <div className="pt-6">
                            <Skeleton className="w-full aspect-video rounded-lg" />
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <QRCheckinTab members={members} onCheckInSuccess={handleCheckInSuccess} eventDate={eventDate} preRegStartDate={preRegStartDate}/>
            )}
        </TabsContent>
        <TabsContent value="new-comer-qr">
             {isLoading || !eventDate || !preRegStartDate ? (
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                     <CardContent>
                        <Skeleton className="w-full aspect-video rounded-lg mt-4" />
                    </CardContent>
                </Card>
             ) : (
                <NewComerCheckinTab firstTimers={firstTimers} onCheckInSuccess={handleCheckInSuccess} eventDate={eventDate} preRegStartDate={preRegStartDate}/>
             )}
        </TabsContent>
        <TabsContent value="member-face">
             {isLoading || !eventDate || !preRegStartDate ? (
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-64" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="w-full aspect-video rounded-lg" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
             ) : (
                <FaceCheckinTab members={members} eventDate={eventDate} preRegStartDate={preRegStartDate} onCheckInSuccess={handleCheckInSuccess} />
             )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
