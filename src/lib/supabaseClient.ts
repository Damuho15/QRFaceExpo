
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

const parseDate = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined || String(dateInput).trim() === '') {
        return null;
    }
    
    if (dateInput instanceof Date) {
        return !isNaN(dateInput.getTime()) ? dateInput : null;
    }

    if (typeof dateInput === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const msPerDay = 86400000;
        const excelDate = new Date(excelEpoch.getTime() + dateInput * msPerDay);
        
        const timezoneOffset = excelDate.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(excelDate.getTime() + timezoneOffset);
        
        return !isNaN(adjustedDate.getTime()) ? adjustedDate : null;
    }

    if (typeof dateInput === 'string') {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
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
