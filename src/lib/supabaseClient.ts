
'use client';

import { createClient } from '@supabase/supabase-js';
import type { Member } from '@/lib/types';
import type { MemberFormValues } from '@/components/members/member-dialog';

// Notice the `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and/or Anon Key are not defined in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'member-pictures';

/**
 * Robustly parses a date from various formats, including Excel's serial number format.
 * @param dateInput - The value to parse (string, number, Date, or null).
 * @returns A Date object or null if parsing fails.
 */
const parseDate = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined || String(dateInput).trim() === '') {
        return null;
    }
    
    if (dateInput instanceof Date) {
        return !isNaN(dateInput.getTime()) ? dateInput : null;
    }

    if (typeof dateInput === 'number') {
        // This handles Excel's date serial number format.
        // It's the number of days since 1900-01-01, but Excel has a leap year bug for 1900.
        // The common workaround is to use 1899-12-30 as the epoch.
        const excelEpoch = new Date(1899, 11, 30);
        const msPerDay = 86400000;
        const excelDate = new Date(excelEpoch.getTime() + dateInput * msPerDay);
        
        // Adjust for timezone offset if the date was parsed as local time.
        const timezoneOffset = excelDate.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(excelDate.getTime() + timezoneOffset);
        
        return !isNaN(adjustedDate.getTime()) ? adjustedDate : null;
    }

    if (typeof dateInput === 'string') {
        // Attempt to parse a standard date string
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
            // Fix for strings without timezone info being treated as UTC
            if (!/T|Z/i.test(dateInput)) {
                 return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            }
            return date;
        }
    }
    
    return null;
};


export const uploadMemberPicture = async (file: File): Promise<string | null> => {
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '_');
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file);

    if (error) {
        console.error('Error uploading picture:', error);
        return null;
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
        return [];
    }

    return data.map((member: any) => ({
        ...member,
        birthday: member.birthday ? new Date(member.birthday) : new Date(),
        weddingAnniversary: member.weddingAnniversary ? new Date(member.weddingAnniversary) : null,
    }));
};

/**
 * Creates a new member in the database.
 * This function is now the single source of truth for creating the payload.
 * @param formData The raw data from the react-hook-form.
 * @param pictureUrl The URL of the uploaded picture, or null.
 * @returns The newly created Member object or null on failure.
 */
export const addMember = async (formData: MemberFormValues, pictureUrl: string | null): Promise<Member | null> => {
    // Build a safe payload, ensuring data types are correct for Supabase
    const safePayload = {
        fullName: formData.fullName,
        nickname: formData.nickname || null,
        email: formData.email || null,
        phone: formData.phone || null,
        birthday: new Date(formData.birthday).toISOString(),
        weddingAnniversary: formData.weddingAnniversary ? new Date(formData.weddingAnniversary).toISOString() : null,
        pictureUrl: pictureUrl,
        qrCodePayload: formData.fullName, // QR Code is based on the full name for new members
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
        return null;
    }
    
    // Convert date strings from DB back to Date objects for the UI
    return data ? { ...data, birthday: new Date(data.birthday), weddingAnniversary: data.weddingAnniversary ? new Date(data.weddingAnniversary) : null } : null;
}

/**
 * Updates an existing member in the database.
 * This function is now the single source of truth for creating the payload.
 * @param id The ID of the member to update.
 * @param formData The raw data from the react-hook-form.
 * @param pictureUrl The new URL of the uploaded picture, or the existing one.
 * @returns The updated Member object or null on failure.
 */
export const updateMember = async (id: string, formData: MemberFormValues, pictureUrl: string | null): Promise<Member | null> => {
     // Build a safe payload, ensuring data types are correct for Supabase
    const safePayload = {
        fullName: formData.fullName,
        nickname: formData.nickname || null,
        email: formData.email || null,
        phone: formData.phone || null,
        birthday: new Date(formData.birthday).toISOString(),
        weddingAnniversary: formData.weddingAnniversary ? new Date(formData.weddingAnniversary).toISOString() : null,
        pictureUrl: pictureUrl,
        ministries: formData.ministries || null,
        lg: formData.lg || null,
    };

    const { data, error } = await supabase
        .from('members')
        .update(safePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating member:', error);
        return null;
    }

    // Convert date strings from DB back to Date objects for the UI
    return data ? { ...data, birthday: new Date(data.birthday), weddingAnniversary: data.weddingAnniversary ? new Date(data.weddingAnniversary) : null } : null;
};


/**
 * Handles batch insertion of members. This function is the single source of truth for validation and data formatting.
 * @param rawMembers - An array of raw objects from the file parser.
 * @returns An array of successfully inserted members, or null on a major failure.
 */
export const addMembers = async (rawMembers: { [key: string]: any }[]): Promise<Member[] | null> => {
    if (!rawMembers || rawMembers.length === 0) {
        return [];
    }

    // 1. Filter out invalid rows and create a clean payload for each valid member.
    const validMembersToInsert = rawMembers.map(rawMember => {
        // REQUIRED: FullName must exist.
        const fullName = String(rawMember.FullName || '').trim();
        if (!fullName) {
            console.warn('Skipping row due to missing FullName:', rawMember);
            return null;
        }

        // REQUIRED: Birthday must be a valid date.
        const birthday = parseDate(rawMember.Birthday);
        if (!birthday) {
            console.warn('Skipping row due to invalid or missing Birthday for', fullName);
            return null;
        }

        // OPTIONAL: WeddingAnniversary can be null.
        const weddingAnniversary = parseDate(rawMember.WeddingAnniversary);
        
        // Build the final, safe object for insertion.
        return {
            fullName: fullName,
            nickname: rawMember.Nickname ? String(rawMember.Nickname).trim() : null,
            email: rawMember.Email ? String(rawMember.Email).trim() : null,
            phone: rawMember.Phone ? String(rawMember.Phone).trim() : null,
            birthday: birthday.toISOString(),
            weddingAnniversary: weddingAnniversary ? weddingAnniversary.toISOString() : null,
            qrCodePayload: fullName, // QR Code payload is based on full name.
            ministries: rawMember.Ministries ? String(rawMember.Ministries).trim() : null,
            lg: rawMember.LG ? String(rawMember.LG).trim() : null,
        };
    }).filter((m): m is Exclude<typeof m, null> => m !== null); // Filter out the nulls from invalid rows.

    // 2. If no valid members are left after cleaning, don't hit the database.
    if (validMembersToInsert.length === 0) {
        console.log("No valid members to insert after cleaning and validation.");
        return [];
    }

    // 3. Perform the batch insert with the clean data.
    const { data, error } = await supabase
        .from('members')
        .insert(validMembersToInsert)
        .select();

    if (error) {
        console.error('Error batch adding members:', error);
        // On failure, return null to indicate to the UI that the operation failed.
        return null;
    }
    
    // 4. On success, return the data, ensuring dates are converted back for consistency.
    return data ? data.map((member: any) => ({ ...member, birthday: new Date(member.birthday), weddingAnniversary: member.weddingAnniversary ? new Date(member.weddingAnniversary) : null })) : [];
};

    