'use client';

import { createClient } from '@supabase/supabase-js';
import type { Member } from '@/lib/types';

// Notice the `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and/or Anon Key are not defined in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'member-pictures';

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

    // Supabase returns dates as strings, so we need to convert them back to Date objects
    return data.map((member: any) => ({
        ...member,
        birthday: member.birthday ? new Date(member.birthday) : new Date(),
        weddingAnniversary: member.weddingAnniversary ? new Date(member.weddingAnniversary) : null,
    }));
};

export const addMember = async (member: Omit<Member, 'id'>): Promise<Member | null> => {
    const memberToInsert = {
        fullName: member.fullName,
        nickname: member.nickname || null,
        email: member.email || null,
        phone: member.phone || null,
        birthday: member.birthday instanceof Date ? member.birthday.toISOString() : member.birthday,
        weddingAnniversary: member.weddingAnniversary instanceof Date ? member.weddingAnniversary.toISOString() : member.weddingAnniversary,
        pictureUrl: member.pictureUrl || null,
        qrCodePayload: member.qrCodePayload,
        ministries: member.ministries || null,
        lg: member.lg || null,
    };
    
    const { data, error } = await supabase
        .from('members')
        .insert([memberToInsert])
        .select()
        .single();
    
    if (error) {
        console.error('Error adding member:', error);
        return null;
    }
    
    return data ? { ...data, birthday: new Date(data.birthday), weddingAnniversary: data.weddingAnniversary ? new Date(data.weddingAnniversary) : null } : null;
}

export const addMembers = async (members: (Omit<Member, 'id' | 'qrCodePayload' | 'pictureUrl'>)[]): Promise<Member[] | null> => {
    const membersToInsert = members.map(member => {
        const birthday = member.birthday instanceof Date && !isNaN(member.birthday.getTime()) 
            ? member.birthday.toISOString() 
            : null;

        if (!birthday) {
            console.error('Skipping member with invalid birthday:', member.fullName);
            return null;
        }

        return {
            fullName: member.fullName,
            nickname: member.nickname || null,
            email: member.email || null,
            phone: member.phone || null,
            birthday: birthday,
            weddingAnniversary: member.weddingAnniversary instanceof Date && !isNaN(member.weddingAnniversary.getTime()) 
                ? member.weddingAnniversary.toISOString() 
                : null,
            qrCodePayload: member.fullName,
            ministries: member.ministries || null,
            lg: member.lg || null,
        }
    }).filter(Boolean); // Remove null entries for members with invalid dates

    if (membersToInsert.length === 0) {
        console.log("No valid members to insert.");
        return [];
    }

    const { data, error } = await supabase
        .from('members')
        .insert(membersToInsert as any)
        .select();

    if (error) {
        console.error('Error batch adding members:', error);
        return null;
    }

    return data ? data.map((member: any) => ({ ...member, birthday: new Date(member.birthday), weddingAnniversary: member.weddingAnniversary ? new Date(member.weddingAnniversary) : null })) : null;
};


export const updateMember = async (member: Member): Promise<Member | null> => {
    const { id, birthday, weddingAnniversary, ...memberData } = member;
     const memberToUpdate = {
        ...memberData,
        birthday: birthday.toISOString(),
        weddingAnniversary: weddingAnniversary ? weddingAnniversary.toISOString() : null,
        ministries: member.ministries || null,
        lg: member.lg || null,
    };
    const { data, error } = await supabase
        .from('members')
        .update(memberToUpdate)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating member:', error);
        return null;
    }

    return data ? { ...data, birthday: new Date(data.birthday), weddingAnniversary: data.weddingAnniversary ? new Date(data.weddingAnniversary) : null } : null;
};