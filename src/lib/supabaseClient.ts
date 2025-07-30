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

export const getMembers = async (): Promise<Member[]> => {
    const { data, error } = await supabase.from('members').select('*');

    if (error) {
        console.error('Error fetching members:', error);
        return [];
    }

    // Supabase returns dates as strings, so we need to convert them back to Date objects
    return data.map((member: any) => ({
        ...member,
        birthday: new Date(member.birthday),
    }));
};
