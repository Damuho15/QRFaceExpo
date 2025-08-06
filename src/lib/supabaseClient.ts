
import { createClient } from '@supabase/supabase-js';
import type { Member, EventConfig, AttendanceLog, FirstTimer, NewComerAttendanceLog, User } from '@/lib/types';
import type { MemberFormValues } from '@/components/members/member-dialog';
import type { FirstTimerFormValues } from '@/components/first-timers/first-timer-dialog';
import { v4 as uuidv4 } from 'uuid';
import type { UserFormValues } from '@/components/user-management/user-dialog';

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
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const jsDate = new Date(excelEpoch.getTime() + dateInput * 86400000);
        
        return !isNaN(jsDate.getTime()) ? jsDate : null;
    }

    // Handle string dates (e.g., 'YYYY-MM-DD' or from date picker)
    if (typeof dateInput === 'string') {
        // Attempt to parse a variety of string formats
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
             // To prevent timezone shifts from the parsed date string, re-create it in UTC
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            return utcDate;
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
    
    // Explicitly map and cast ALL relevant fields to ensure data integrity
    return (data || []).map(member => ({
        ...member,
        id: String(member.id),
        // Ensure other fields that should be strings are not null
        fullName: String(member.fullName || ''), 
        nickname: String(member.nickname || ''),
        email: String(member.email || ''),
        phone: String(member.phone || ''),
        birthday: String(member.birthday || ''),
        weddingAnniversary: member.weddingAnniversary ? String(member.weddingAnniversary) : null,
        qrCodePayload: String(member.qrCodePayload || ''),
        pictureUrl: member.pictureUrl ? String(member.pictureUrl) : null,
        ministries: String(member.ministries || ''),
        lg: String(member.lg || ''),
        promoted_at: member.promoted_at ? String(member.promoted_at) : null,
        created_at: String(member.created_at || ''),
    })) as Member[];
};

export const addMember = async (formData: MemberFormValues, pictureUrl: string | null): Promise<Member> => {
    const safePayload = {
        id: uuidv4(),
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
            id: uuidv4(),
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
        if (error.code === 'PGRST116') { // Resource not found
            console.warn('Event config not found. This might be expected if it has not been set yet.');
            return null;
        }
        console.error('Error fetching event config:', error);
        throw error;
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

export const getAttendanceLogs = async (startDate?: Date, endDate?: Date): Promise<AttendanceLog[]> => {
    let query = supabase
        .from('attendance_logs')
        .select('*')
        .order('timestamp', { ascending: false });

    if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching attendance logs:', error);
        throw error;
    }

    return (data || []).map(log => ({ ...log, id: String(log.id) }));
};

// New Comer Functions
export const getFirstTimers = async (): Promise<FirstTimer[]> => {
    const { data, error } = await supabase
        .from('first_timers')
        .select('*')
        .order('fullName', { ascending: true });

    if (error) {
        console.error('Error fetching new comers:', error);
        throw error;
    }
    return data || [];
};

export const addFirstTimer = async (formData: FirstTimerFormValues): Promise<FirstTimer> => {
    const { data, error } = await supabase
        .from('first_timers')
        .insert({
            fullName: formData.fullName,
            email: formData.email || null,
            phone: formData.phone || null,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding new comer:', error);
        throw error;
    }
    return data;
};

export const updateFirstTimer = async (id: string, formData: FirstTimerFormValues): Promise<FirstTimer> => {
    const { data, error } = await supabase
        .from('first_timers')
        .update({
            fullName: formData.fullName,
            email: formData.email || null,
            phone: formData.phone || null,
            qrCodePayload: formData.fullName, // Also update QR payload on name change
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating new comer:', error);
        throw error;
    }
    return data;
};

export const deleteFirstTimer = async (id: string) => {
    const { error } = await supabase.from('first_timers').delete().eq('id', id);

    if (error) {
        console.error('Error deleting new comer:', error);
        throw error;
    }

    return true;
};

export const addFirstTimerAttendanceLog = async (log: {
    first_timer_id: string;
    first_timer_name: string;
    type: 'Pre-registration' | 'Actual';
    method: 'QR';
    timestamp: Date;
}) => {
    const { data, error } = await supabase
        .from('attendance_log_1sttimer')
        .insert({
            first_timer_id: log.first_timer_id,
            first_timer_name: log.first_timer_name,
            type: log.type,
            method: log.method,
            timestamp: log.timestamp.toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding new comer attendance log:', error);
        throw error;
    }

    return data;
};

export const getFirstTimerAttendanceLogs = async (startDate?: Date, endDate?: Date): Promise<NewComerAttendanceLog[]> => {
    let query = supabase
        .from('attendance_log_1sttimer')
        .select('*')
        .order('timestamp', { ascending: false });

    if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching new comer attendance logs:', error);
        throw error;
    }

    return (data || []).map(log => ({ ...log, id: String(log.id) }));
};

export const promoteFirstTimerToMember = async (firstTimer: FirstTimer): Promise<Member> => {
    // 1. Check if a member with the same fullName already exists to prevent duplicates.
    const { data: existingMembers, error: fetchError } = await supabase
        .from('members')
        .select('id')
        .eq('fullName', firstTimer.fullName);

    if (fetchError) {
        console.error('Error checking for existing members:', fetchError);
        throw new Error('Could not verify existing members before promotion.');
    }

    if (existingMembers && existingMembers.length > 0) {
        throw new Error(`A member with the name "${firstTimer.fullName}" already exists.`);
    }

    // 2. Delete the new comer's attendance logs.
    const { error: logDeleteError } = await supabase
        .from('attendance_log_1sttimer')
        .delete()
        .eq('first_timer_id', firstTimer.id);
    
    if (logDeleteError) {
        console.error(`Failed to delete attendance logs for ${firstTimer.fullName} (ID: ${firstTimer.id}).`, logDeleteError);
        throw new Error('Could not delete new comer attendance logs.');
    }

    // 3. Delete the original record from the first_timers table.
    const { error: deleteError } = await supabase
        .from('first_timers')
        .delete()
        .eq('id', firstTimer.id);
    
    if (deleteError) {
        console.error(`Failed to delete first_timer record for ${firstTimer.fullName} (ID: ${firstTimer.id}).`, deleteError);
        throw new Error('Could not delete the new comer record.');
    }

    // 4. Add the new comer's data to the members table.
    const newMemberPayload = {
        fullName: firstTimer.fullName,
        email: firstTimer.email,
        phone: firstTimer.phone,
        birthday: new Date().toISOString().split('T')[0], // Placeholder for required field
        qrCodePayload: firstTimer.fullName,
        promoted_at: new Date().toISOString(),
    };
    
    const { data: newMember, error: addError } = await supabase
        .from('members')
        .insert(newMemberPayload)
        .select()
        .single();

    if (addError) {
        console.error('Error adding new member during promotion:', addError);
        // Note: At this point, the first_timer record is already deleted.
        // This is an inconsistent state that may need manual correction.
        // For the user, we throw an error indicating the final step failed.
        throw new Error('Failed to create a new member record after deleting the new comer data.');
    }
    
    return newMember;
}


// User Management Functions
export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('user_QRface')
        .select('*')
        .order('full_name', { ascending: true });

    if (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
    return data || [];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('user_QRface')
        .select('*')
        .eq('email', email)
        .single();
    
    if (error) {
        // Specifically ignore the 'PGRST116' error which means "Not Found"
        if (error.code === 'PGRST116') {
            return null;
        }
        // For all other errors, log and re-throw
        console.error('Error fetching user by email:', error);
        throw error;
    }
    return data;
};

export const addUser = async (formData: UserFormValues): Promise<User> => {
     // This is a placeholder. In a real app, you would use Supabase Auth to create a user,
     // which returns an ID that you would use here.
    const newUserId = uuidv4();

    const { data, error } = await supabase
        .from('user_QRface')
        .insert({
            id: newUserId,
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding user:', error);
        // Handle specific errors, e.g., unique constraint violation for email
        if (error.code === '23505') {
            throw new Error('A user with this email address already exists.');
        }
        throw error;
    }
    return data;
};

export const updateUser = async (id: string, formData: UserFormValues): Promise<User> => {
    const { data, error } = await supabase
        .from('user_QRface')
        .update({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating user:', error);
        if (error.code === '23505') {
            throw new Error('A user with this email address already exists.');
        }
        throw error;
    }
    return data;
};

export const deleteUser = async (id: string): Promise<boolean> => {
    // In a real app with Supabase Auth, you would also need to delete the user from auth.users.
    // This requires elevated 'service_role' privileges and should be handled in a server-side function.
    // e.g., await supabase.auth.admin.deleteUser(id);

    const { error } = await supabase.from('user_QRface').delete().eq('id', id);

    if (error) {
        console.error('Error deleting user:', error);
        throw error;
    }

    return true;
};
