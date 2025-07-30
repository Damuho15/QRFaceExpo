
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
import { format } from 'date-fns';
import { getEventConfig, updateEventConfig, parseDateAsUTC } from '@/lib/supabaseClient';
import { Skeleton } from '../ui/skeleton';

// Exported for use in other check-in components
export const getRegistrationType = (scanDate: Date, eventDate: Date, preRegStartDate: Date): 'Pre-registration' | 'Actual' | null => {
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

const getNextSunday = (from: Date): Date => {
    const date = new Date(from);
    const day = date.getUTCDay();
    const diff = 7 - day;
    date.setUTCDate(date.getUTCDate() + diff);
    return date;
};

const getPreviousTuesday = (from: Date): Date => {
    const date = new Date(from); // from is a Sunday
    const day = date.getUTCDay(); // Sunday is 0
    // If it's Sunday (0), we subtract 5 days to get to Tuesday. (0 - 2 + 7)%7 is not correct.
    // Sunday (0) -> Saturday (6) ... Tuesday (2).
    // Days to subtract from Sunday: 5
    date.setUTCDate(date.getUTCDate() - 5);
    return date;
};


interface DateConfigCardProps {
    onDatesChange: (preRegStartDate: Date, eventDate: Date) => void;
}

export default function DateConfigCard({ onDatesChange }: DateConfigCardProps) {
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
                    onDatesChange(newPreRegDate, newEventDate);

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
                    onDatesChange(storedPreRegDate, storedEventDate);
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
    }, [toast, onDatesChange]);
    
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
            onDatesChange(newPreRegDate, newEventDate);
            
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
    );
  }

  return (
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
  );
}
