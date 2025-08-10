
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
import { Camera, Upload, UserCheck, Loader2, CheckCircle, UserX, AlertTriangle, ShieldQuestion } from 'lucide-react';
import jsQR from 'jsqr';
import { recognizeFace, RecognizeFaceOutput } from '@/ai/flows/face-recognition-flow';
import { getEventConfig, updateEventConfig, parseDateAsUTC, getMembers, addAttendanceLog, getFirstTimers, addFirstTimerAttendanceLog } from '@/lib/supabaseClient';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { Member, FirstTimer } from '@/lib/types';
import { isValidUUID } from '@/lib/validation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useAuth } from '@/context/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';

const getRegistrationType = (scanDate: Date, eventDate: Date, preRegStartDate: Date): 'Pre-registration' | 'Actual' | null => {
    const scanDateTime = scanDate.getTime();

    // --- Pre-registration Window ---
    const preRegStart = new Date(preRegStartDate);
    preRegStart.setUTCHours(0, 0, 0, 0);

    // --- Event Day Window ---
    const actualRegStartTime = new Date(eventDate);
    actualRegStartTime.setUTCHours(9, 0, 0, 0);

    // Pre-registration ends 1 millisecond before "Actual" registration begins.
    const preRegEndTime = new Date(actualRegStartTime.getTime() - 1);
    
    // Check for Pre-registration
    if (scanDateTime >= preRegStart.getTime() && scanDateTime <= preRegEndTime.getTime()) {
        return 'Pre-registration';
    }

    // Check for Actual-day Registration (anytime from 9am on event day)
    const eventDayStartTime = new Date(eventDate);
    eventDayStartTime.setUTCHours(0,0,0,0);
    
    if (scanDateTime >= actualRegStartTime.getTime()) {
        const scanDay = new Date(scanDate);
        scanDay.setUTCHours(0,0,0,0);
        // Ensure it's on the same day as the event
        if (scanDay.getTime() === eventDayStartTime.getTime()){
             return 'Actual';
        }
    }

    // If it falls outside of both windows, it's not a valid time for check-in.
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
        
        // IMPORTANT: Use the current UTC time for comparison
        const now = new Date(); // This is the only place we use the local time
        const currentScanTime = new Date(now.toISOString()); // Immediately convert to a proper UTC date object

        const currentRegistrationType = getRegistrationType(currentScanTime, eventDate, preRegStartDate);
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
        const now = new Date();
        const currentScanTime = new Date(now.toISOString());
        const registrationType = getRegistrationType(currentScanTime, eventDate, preRegStartDate);

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
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            if (!ctx) {
                toast({ title: 'Error', description: 'Could not get canvas context.', variant: 'destructive' });
                resetInput();
                return;
            }
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            try {
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
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
            } catch (e) {
                console.error("jsQR error on upload", e);
                toast({
                    title: 'QR Decode Error',
                    description: 'An error occurred while trying to decode the QR code.',
                    variant: 'destructive',
                });
                resetInput();
            }
            URL.revokeObjectURL(img.src);
        };
        
        img.onerror = () => {
            toast({ title: 'Image Load Error', description: 'Could not load the selected image file.', variant: 'destructive' });
            resetInput();
            URL.revokeObjectURL(img.src);
        };
        
        img.src = URL.createObjectURL(file);
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
    const [hasConsented, setHasConsented] = useState(false);
    
    // Dialog and state management
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    // State to hold the full result from the AI
    const [aiResult, setAiResult] = useState<RecognizeFaceOutput | null>(null);

    // State to hold the registration type determined at the time of verification.
    const [registrationType, setRegistrationType] = useState<'Pre-registration' | 'Actual' | null>(null);

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
        
        const now = new Date();
        const currentScanTime = new Date(now.toISOString());

        const currentRegistrationType = getRegistrationType(currentScanTime, eventDate, preRegStartDate);
        if (!currentRegistrationType) {
            toast({
                title: 'Check-in Not Allowed',
                description: 'Check-in is not open at this time.',
                variant: 'destructive',
            });
            return;
        }
        
        setIsProcessing(true);
        setAiResult(null); // Reset previous result
        setRegistrationType(currentRegistrationType);
        
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
            setAiResult(result);
        } catch (error) {
            console.error('Face recognition error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred during face recognition analysis.';
            setAiResult({ matchFound: false, confidence: 0, reason: errorMessage });
        } finally {
            setIsProcessing(false);
            setShowDialog(true);
        }
    };
    
    const confirmAndSaveChanges = async () => {
        if (!aiResult || !aiResult.matchFound || !aiResult.fullName || !registrationType) {
             toast({
                title: 'Save Failed',
                description: 'Cannot save attendance due to missing member data.',
                variant: 'destructive',
            });
            closeDialog();
            return;
        }
        
        const member = members.find(m => m.fullName === aiResult.fullName);
        if (!member) {
             toast({
                title: 'Save Failed',
                description: `Could not find member details for ${aiResult.fullName} in the local list.`,
                variant: 'destructive',
            });
            closeDialog();
            return;
        }

        setIsSaving(true);

        try {
            await addAttendanceLog({
                member_id: member.id,
                member_name: member.fullName,
                type: registrationType,
                method: 'Face',
                timestamp: new Date()
            });

            toast({
                title: 'Thank you for registering',
                description: `${member.fullName} has been successfully checked in.`,
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
        setAiResult(null);
        setRegistrationType(null);
        setShowDialog(false);
    }
    
    const renderDialogContent = () => {
        if (!aiResult) return null;

        const confidence = aiResult.confidence;
        const isMatch = aiResult.matchFound;

        let title = '';
        let description = '';
        let showConfirmButton = false;

        // Tiered Logic for Dialog Content
        if (isMatch && confidence >= 0.9) {
            title = `Welcome, ${aiResult.fullName}!`;
            description = 'Your identity has been confirmed with high confidence. Click confirm to complete check-in.';
            showConfirmButton = true;
        } else if (isMatch && confidence >= 0.8 && confidence < 0.9) {
            title = `Please Confirm: Is this you, ${aiResult.fullName}?`;
            description = 'Your identity was recognized with medium confidence. Please confirm to complete your check-in.';
            showConfirmButton = true;
        } else { // confidence < 0.8 or no match
            title = 'Could Not Recognize Face';
            description = aiResult.reason 
                ? `Reason: ${aiResult.reason}. Please try again in better lighting or use the QR code.`
                : "We couldn't find a matching member in our records. Please try again or use the QR code check-in.";
            showConfirmButton = false;
        }

        return (
            <AlertDialogContent>
                <AlertDialogHeader className="text-center">
                     <div className="flex justify-center">
                        {showConfirmButton ? <CheckCircle className="h-12 w-12 text-green-500" /> : <AlertTriangle className="h-12 w-12 text-amber-500" />}
                    </div>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog} disabled={isSaving}>
                        {showConfirmButton ? 'Cancel' : 'OK'}
                    </AlertDialogCancel>
                    {showConfirmButton && (
                        <AlertDialogAction onClick={confirmAndSaveChanges} disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Yes, it's me"}
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        );
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
        <div className="items-top flex space-x-3 rounded-md border p-4">
            <Checkbox id="privacy-consent" onCheckedChange={(checked) => setHasConsented(checked as boolean)} />
            <div className="grid gap-1.5 leading-none">
                <label
                htmlFor="privacy-consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                Data Privacy Consent
                </label>
                <p className="text-sm text-muted-foreground">
                    I consent to the use of my camera for face recognition for check-in purposes. The captured image will be used for a one-time verification and will not be stored.
                </p>
            </div>
        </div>
        <Button onClick={handleVerification} disabled={isProcessing || hasCameraPermission !== true || !hasConsented} className="w-full">
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
      {renderDialogContent()}
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
        
        const now = new Date();
        const currentScanTime = new Date(now.toISOString());

        const currentRegistrationType = getRegistrationType(currentScanTime, eventDate, preRegStartDate);
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
        
        setConfirmedFirstTimer(matchedFirstTimer || null);
        if (matchedFirstTimer) {
            setRegistrationType(currentRegistrationType);
        } else {
            setRegistrationType(null);
        }

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
        const now = new Date();
        const currentScanTime = new Date(now.toISOString());
        const registrationType = getRegistrationType(currentScanTime, eventDate, preRegStartDate);

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
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            if (!ctx) {
                toast({ title: 'Error', description: 'Could not get canvas context.', variant: 'destructive' });
                resetInput();
                return;
            }
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            try {
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'attemptBoth',
                });

                if (code && code.data) {
                    handleCheckIn(code.data);
                } else {
                    toast({ title: 'Check-in Failed', description: 'Could not decode QR code from the image.', variant: 'destructive' });
                    resetInput();
                }
            } catch (e) {
                console.error("jsQR error on upload", e);
                toast({ title: 'QR Decode Error', description: 'An error occurred while trying to decode the QR code.', variant: 'destructive' });
                resetInput();
            }
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            toast({ title: 'Image Load Error', description: 'Could not load the selected image file.', variant: 'destructive' });
            resetInput();
            URL.revokeObjectURL(img.src);
        };

        img.src = URL.createObjectURL(file);
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
    
    // Dates from DB
    const [eventDate, setEventDate] = useState<Date | null>(null);
    const [preRegStartDate, setPreRegStartDate] = useState<Date | null>(null);

    const [members, setMembers] = useState<Member[]>([]);
    const [firstTimers, setFirstTimers] = useState<FirstTimer[]>([]);
    
    // This is a simple counter to trigger a re-fetch on the dashboard
    const [checkInCounter, setCheckInCounter] = useState(0);
    const handleCheckInSuccess = () => {
        setCheckInCounter(prev => prev + 1);
    }

     const fetchAndSetData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch all members for check-in purposes
            const [config, { members: allMembers }, { firstTimers: allFirstTimers }] = await Promise.all([
                getEventConfig(), 
                getMembers(0, 10000), // Fetch all for now
                getFirstTimers(0, 10000) // Fetch all for now
            ]);
            
            setMembers(allMembers);
            setFirstTimers(allFirstTimers);

            if (config) {
                const storedEventDate = parseDateAsUTC(config.event_date);
                const storedPreRegDate = parseDateAsUTC(config.pre_reg_start_date);
                setEventDate(storedEventDate);
                setPreRegStartDate(storedPreRegDate);
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not load event configuration. Please set it in Event Creation.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch event data.' });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Event Check-in</h1>
        <p className="text-muted-foreground">
          Select a method to record member attendance.
        </p>
      </div>

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
