

import { createClient } from '@supabase/supabase-js';
import type { Member, EventConfig, AttendanceLog } from '@/lib/types';
import type { MemberFormValues } from '@/components/members/member-dialog';

// Notice the `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and/or Anon Key are not defined in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'member-pictures';

// This function now correctly handles Excel numeric dates and string dates,
// ensuring they are parsed into a valid Date object without timezone issues.
const parseDate = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined || String(dateInput).trim() === '') {
        return null;
    }
    
    // If it's already a valid Date object, return it.
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        return dateInput;
    }

    // Handle Excel's numeric date format
    if (typeof dateInput === 'number') {
        // Excel's epoch starts on 1899-12-30. JavaScript's is 1970-01-01.
        // The calculation converts the number of days from Excel's epoch to milliseconds for JS.
        const excelEpoch = new Date(1899, 11, 30);
        const jsDate = new Date(excelEpoch.getTime() + dateInput * 86400000);
        // We must also account for the timezone offset of the resulting date.
        const timezoneOffset = jsDate.getTimezoneOffset() * 60000;
        const correctedDate = new Date(jsDate.getTime() + timezoneOffset);

        return !isNaN(correctedDate.getTime()) ? correctedDate : null;
    }

    // Handle string dates (e.g., 'YYYY-MM-DD' or from date picker)
    if (typeof dateInput === 'string') {
        // Add 'T00:00:00Z' to treat the date as UTC, preventing timezone shifts.
        const date = new Date(dateInput.split('T')[0] + 'T00:00:00Z');
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    // Return null if no valid date could be parsed.
    console.warn('Could not parse a valid date from input:', dateInput);
    return null;
};

// Helper to parse date strings as UTC
export const parseDateAsUTC = (dateString: string) => {
    // The 'Z' suffix ensures the date is parsed in UTC, not the user's local timezone.
    const date = new Date(dateString + 'T00:00:00Z');
    return date;
}


export const uploadMemberPicture = async (file: File): Promise<string | null> => {
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '_');
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file);

    if (error) {
        console.error('Error uploading picture:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

    return publicUrl;
};

export const getMembers = async (): Promise<Member[]> => {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('fullName', { ascending: true });

    if (error) {
        console.error('Error fetching members:', error);
        throw error;
    }
    
    return data as Member[];
};

export const addMember = async (formData: MemberFormValues, pictureUrl: string | null): Promise<Member> => {
    const safePayload = {
        fullName: formData.fullName,
        nickname: formData.nickname || null,
        email: formData.email || null,
        phone: formData.phone || null,
        birthday: formData.birthday,
        weddingAnniversary: formData.weddingAnniversary || null,
        pictureUrl: pictureUrl,
        qrCodePayload: formData.fullName,
        ministries: formData.ministries || null,
        lg: formData.lg || null,
    };
    
    const { data, error } = await supabase
        .from('members')
        .insert(safePayload)
        .select()
        .single();
    
    if (error) {
        console.error('Error adding member:', error);
        throw error;
    }
    
    return data;
}

export const updateMember = async (id: string, formData: MemberFormValues, pictureUrl: string | null): Promise<Member> => {
    const updatePayload = {
        fullName: formData.fullName,
        nickname: formData.nickname || null,
        email: formData.email || null,
        phone: formData.phone || null,
        birthday: formData.birthday,
        weddingAnniversary: formData.weddingAnniversary || null,
        pictureUrl: pictureUrl,
        ministries: formData.ministries || null,
        lg: formData.lg || null,
        qrCodePayload: formData.fullName,
    };

    const { data, error } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating member:', error);
        throw error;
    }

    return data;
};

export const deleteMember = async (id: string, pictureUrl?: string | null) => {
    // 1. Delete picture from storage if it exists
    if (pictureUrl) {
        try {
            const urlParts = pictureUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const { error: storageError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([fileName]);
            
            if (storageError) {
                console.error('Error deleting picture from storage:', storageError.message);
                // Non-fatal, we can still proceed to delete the DB record
            }
        } catch (e) {
             console.error('Could not parse picture URL to delete from storage:', e);
        }
    }

    // 2. Delete member record from the database
    const { error } = await supabase.from('members').delete().eq('id', id);

    if (error) {
        console.error('Error deleting member:', error);
        throw error;
    }

    return true;
};

export const addMembers = async (rawMembers: { [key: string]: any }[]): Promise<Member[] | null> => {
    if (!rawMembers || rawMembers.length === 0) {
        return [];
    }

    const validMembersToInsert = rawMembers.map(rawMember => {
        const fullName = String(rawMember.FullName || '').trim();
        if (!fullName) {
            console.warn('Skipping row due to missing FullName:', rawMember);
            return null;
        }

        const birthday = parseDate(rawMember.Birthday);
        if (!birthday) {
            console.warn('Skipping row due to invalid or missing Birthday for', fullName);
            return null;
        }

        const weddingAnniversary = parseDate(rawMember.WeddingAnniversary);
        
        return {
            fullName: fullName,
            nickname: rawMember.Nickname ? String(rawMember.Nickname).trim() : null,
            email: rawMember.Email ? String(rawMember.Email).trim() : null,
            phone: rawMember.Phone ? String(rawMember.Phone).trim() : null,
            birthday: birthday.toISOString().split('T')[0],
            weddingAnniversary: weddingAnniversary ? weddingAnniversary.toISOString().split('T')[0] : null,
            qrCodePayload: fullName,
            ministries: rawMember.Ministries ? String(rawMember.Ministries).trim() : null,
            lg: rawMember.LG ? String(rawMember.LG).trim() : null,
        };
    }).filter((m): m is Exclude<typeof m, null> => m !== null);

    if (validMembersToInsert.length === 0) {
        console.log("No valid members to insert after cleaning and validation.");
        return [];
    }

    const { data, error } = await supabase
        .from('members')
        .insert(validMembersToInsert)
        .select();

    if (error) {
        console.error('Error batch adding members:', error);
        throw error;
    }
    
    return data ? data : [];
};


export const getEventConfig = async (): Promise<EventConfig | null> => {
    const { data, error } = await supabase
        .from('event_config')
        .select('*')
        .eq('id', 1)
        .single();
    
    if (error) {
        console.error('Error fetching event config:', error);
        return null;
    }
    
    return data;
};

export const updateEventConfig = async (dates: { pre_reg_start_date: string, event_date: string }): Promise<EventConfig> => {
    const { data, error } = await supabase
        .from('event_config')
        .update({
            pre_reg_start_date: dates.pre_reg_start_date,
            event_date: dates.event_date,
            updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single();

    if (error) {
        console.error('Error updating event config:', error);
        throw error;
    }
    return data;
};


export const addAttendanceLog = async (log: {
    member_id: string;
    member_name: string;
    type: 'Pre-registration' | 'Actual';
    method: 'QR' | 'Face';
    timestamp: Date;
}) => {
    const { data, error } = await supabase
        .from('attendance_logs')
        .insert({
            member_id: log.member_id,
            member_name: log.member_name,
            type: log.type,
            method: log.method,
            timestamp: log.timestamp.toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding attendance log:', error);
        throw error;
    }

    return data;
};

export const getAttendanceLogs = async (): Promise<AttendanceLog[]> => {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching attendance logs:', error);
        throw error;
    }

    return (data || []).map(log => ({ ...log, id: String(log.id) }));
};
