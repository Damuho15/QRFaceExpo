
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { getEventConfig, updateEventConfig, parseDateAsUTC } from '@/lib/supabaseClient';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';


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


export default function EventCreationPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useAuth();
    
    // Dates from DB
    const [eventDate, setEventDate] = useState<Date | null>(null);
    const [preRegStartDate, setPreRegStartDate] = useState<Date | null>(null);
    
    // Temp dates for inputs
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
                
                // If the event date has passed, automatically roll over to the next week's dates
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
                        title: 'Dates Automatically Updated',
                        description: 'The event date has been rolled over to the next week.',
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
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch event dates.' });
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
        
    const canEditDates = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Event Creation</h1>
        <p className="text-muted-foreground">
          Manage event dates and registration periods.
        </p>
      </div>
      
    <Card>
        <CardHeader>
            <CardTitle>Event Configuration</CardTitle>
            <CardDescription>
                Configure the event and pre-registration dates. If the event date has passed, it will be automatically rolled over to the next week upon loading this page. All changes require clicking 'Apply'.
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
                            disabled={isSaving || !canEditDates}
                            />
                    </div>
                    <div className="flex flex-col space-y-2">
                            <Label>Event Date (Sunday)</Label>
                            <Input
                            type="date"
                            value={tempEventDate ? format(tempEventDate, 'yyyy-MM-dd') : ''}
                            onChange={onEventDateChange}
                            className="w-full"
                            disabled={isSaving || !canEditDates}
                            />
                    </div>
                </CardContent>
                {areDatesChanged && canEditDates && (
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
    </div>
  );
}
