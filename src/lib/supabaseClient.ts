
import { createClient } from '@supabase/supabase-js';
import type { Member, EventConfig, AttendanceLog, FirstTimer, NewComerAttendanceLog, User } from '@/lib/types';
import type { MemberFormValues } from '@/components/members/member-dialog';
import type { FirstTimerFormValues } from '@/components/first-timers/first-timer-dialog';
import { v4 as uuidv4 } from 'uuid';
import type { UserFormValues } from '@/components/user-management/user-dialog';

// This function creates a new Supabase client instance.
// It's the recommended approach for Next.js to avoid sharing a client
// across different server-side requests, which can lead to issues.
const createSupabaseClient = () => {
    const supabaseUrl = "https://qisldnceqvfcqvkzsvrd.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpc2xkbmNlcXZmY3F2a3pzdnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4NzA2ODEsImV4cCI6MjAzMjQ0NjY4MX0.0qD4L3CFS-S_S82j2nNMMQBC0xT5CBs4V7v3S5y_9uE";

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false
        },
        db: {
            schema: 'public',
        },
    });
};


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
    const supabase = createSupabaseClient();
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

export const getMembers = async (pageIndex: number = 0, pageSize: number = 10, fullNameFilter: string = '', nicknameFilter: string = ''): Promise<{ members: Member[], count: number }> => {
    const supabase = createSupabaseClient();
    let query = supabase
        .from('members')
        .select('*', { count: 'exact' });

    if (fullNameFilter) {
        query = query.ilike('fullName', `%${fullNameFilter}%`);
    }
    if (nicknameFilter) {
        query = query.ilike('nickname', `%${nicknameFilter}%`);
    }
    
    // Only apply pagination if pageSize is greater than 0
    if (pageSize > 0) {
        const rangeFrom = pageIndex * pageSize;
        const rangeTo = rangeFrom + pageSize - 1;
        query = query.range(rangeFrom, rangeTo);
    }

    const { data, error, count } = await query.order('fullName', { ascending: true });

    if (error) {
        console.error('Error fetching members:', error);
        throw error;
    }
    
    const members = (data || []).map(member => ({
        ...member,
        id: String(member.id),
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

    return { members, count: count || 0 };
};

export const getMemberCount = async (): Promise<number> => {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error getting member count:', error);
        throw error;
    }
    return count || 0;
};

export const getMemberAttendanceForPeriod = async (startDate: Date, endDate: Date): Promise<Member[]> => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('attendance_logs')
        .select('members (*)')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .eq('type', 'Actual');

    if (error) {
        console.error('Error fetching member attendance for period:', error);
        throw error;
    }

    // Deduplicate members, as one member might have multiple logs in the period
    const memberMap = new Map<string, Member>();
    data.forEach(log => {
        const member = log.members as Member;
        if (member && member.id) {
            memberMap.set(member.id, member);
        }
    });

    return Array.from(memberMap.values());
}


export const getMembersByIds = async (ids: string[]): Promise<Member[]> => {
    const supabase = createSupabaseClient();
    if (!ids || ids.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('members')
        .select('*')
        .in('id', ids);

    if (error) {
        console.error('Error fetching members by IDs:', error);
        throw error;
    }

    return (data || []) as Member[];
};

export const addMember = async (formData: MemberFormValues, pictureUrl: string | null): Promise<Member> => {
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
    if (!rawMembers || rawMembers.length === 0) {
        return [];
    }
    
    const { members: existingMembers, count } = await getMembers(0, 0, '', '');
    
    const existingFullNames = new Set(existingMembers.map(m => m.fullName.toLowerCase()));
    
    const validMembersToInsert = rawMembers.map(rawMember => {
        const fullName = String(rawMember.FullName || '').trim();
        if (!fullName) {
            console.warn('Skipping row due to missing FullName:', rawMember);
            return null;
        }
        
        if (existingFullNames.has(fullName.toLowerCase())) {
            console.log(`Skipping duplicate member: ${fullName}`);
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
        console.log("No valid new members to insert after cleaning and validation.");
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
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
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

type GetAttendanceLogsOptions = {
    pageIndex?: number;
    pageSize?: number;
    memberNameFilter?: string;
    startDate?: Date;
    endDate?: Date;
}

export const getAttendanceLogs = async (options: GetAttendanceLogsOptions = {}): Promise<{ logs: AttendanceLog[], count: number }> => {
    const supabase = createSupabaseClient();
    const { pageIndex = 0, pageSize = 0, memberNameFilter, startDate, endDate } = options;

    let query = supabase
        .from('attendance_logs')
        .select('*', { count: 'exact' });

    if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
    }
    if (memberNameFilter) {
        query = query.ilike('member_name', `%${memberNameFilter}%`);
    }

    if (pageSize > 0) {
        const rangeFrom = pageIndex * pageSize;
        const rangeTo = rangeFrom + pageSize - 1;
        query = query.range(rangeFrom, rangeTo);
    }
    
    const { data, error, count } = await query.order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching attendance logs:', error);
        throw error;
    }

    const logs = (data || []).map(log => ({ ...log, id: String(log.id) }));
    return { logs, count: count || 0 };
};

export const deleteAttendanceLog = async (id: string): Promise<boolean> => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('attendance_logs').delete().eq('id', id);
    if (error) {
        console.error('Error deleting attendance log:', error);
        throw error;
    }
    return true;
};

// New Comer Functions
export const getFirstTimers = async (pageIndex: number = 0, pageSize: number = 10, fullNameFilter: string = ''): Promise<{ firstTimers: FirstTimer[], count: number }> => {
    const supabase = createSupabaseClient();
    let query = supabase
        .from('first_timers')
        .select('*', { count: 'exact' });
        
    if (fullNameFilter) {
        query = query.ilike('fullName', `%${fullNameFilter}%`);
    }
    
    // Only apply pagination if pageSize is greater than 0
    if (pageSize > 0) {
        const rangeFrom = pageIndex * pageSize;
        const rangeTo = rangeFrom + pageSize - 1;
        query = query.range(rangeFrom, rangeTo);
    }

    const { data, error, count } = await query.order('fullName', { ascending: true });

    if (error) {
        console.error('Error fetching new comers:', error);
        throw error;
    }
    return { firstTimers: data || [], count: count || 0 };
};

export const addFirstTimer = async (formData: FirstTimerFormValues): Promise<FirstTimer> => {
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
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
    const supabase = createSupabaseClient();
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

type GetFirstTimerAttendanceLogsOptions = {
    pageIndex?: number;
    pageSize?: number;
    nameFilter?: string;
    startDate?: Date;
    endDate?: Date;
    firstTimerIds?: string[];
}

export const getFirstTimerAttendanceLogs = async (options: GetFirstTimerAttendanceLogsOptions = {}): Promise<{ logs: NewComerAttendanceLog[], count: number }> => {
    const supabase = createSupabaseClient();
    const { pageIndex = 0, pageSize = 0, nameFilter, startDate, endDate, firstTimerIds } = options;

    if (firstTimerIds && firstTimerIds.length === 0) {
        return { logs: [], count: 0 };
    }

    let query = supabase
        .from('attendance_log_1sttimer')
        .select('*', { count: 'exact' });

    if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
    }
    if (nameFilter) {
        query = query.ilike('first_timer_name', `%${nameFilter}%`);
    }
    if (firstTimerIds) {
        query = query.in('first_timer_id', firstTimerIds);
    }

    if (pageSize > 0) {
        const rangeFrom = pageIndex * pageSize;
        const rangeTo = rangeFrom + pageSize - 1;
        query = query.range(rangeFrom, rangeTo);
    }

    const { data, error, count } = await query.order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching new comer attendance logs:', error);
        throw error;
    }

    const logs = (data || []).map(log => ({ ...log, id: String(log.id) }));
    return { logs, count: count || 0 };
};

export const deleteFirstTimerAttendanceLog = async (id: string): Promise<boolean> => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('attendance_log_1sttimer').delete().eq('id', id);
    if (error) {
        console.error('Error deleting new comer attendance log:', error);
        throw error;
    }
    return true;
};


export const promoteFirstTimerToMember = async (firstTimer: FirstTimer): Promise<Member> => {
    const supabase = createSupabaseClient();
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
type GetUsersOptions = {
    pageIndex?: number;
    pageSize?: number;
    usernameFilter?: string;
}

export const getUsers = async (options: GetUsersOptions = {}): Promise<{ users: User[], count: number }> => {
    const supabase = createSupabaseClient();
    const { pageIndex = 0, pageSize = 0, usernameFilter } = options;
    
    let query = supabase
        .from('user_qrface')
        .select('id, full_name, username, role, created_at', { count: 'exact' });

    if (usernameFilter) {
        query = query.ilike('username', `%${usernameFilter}%`);
    }

    if (pageSize > 0) {
        const rangeFrom = pageIndex * pageSize;
        const rangeTo = rangeFrom + pageSize - 1;
        query = query.range(rangeFrom, rangeTo);
    }

    const { data, error, count } = await query.order('full_name', { ascending: true });

    if (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
    return { users: data || [], count: count || 0 };
};

export const loginUser = async (username: string, password?: string): Promise<User | null> => {
    const supabase = createSupabaseClient();
    if (!password) return null;
    
    const { data, error } = await supabase
        .from('user_qrface')
        .select('*')
        .eq('username', username)
        .single();
    
    if (error) {
        // "PGRST116" is the code for "No rows found," which is an expected outcome for a wrong username.
        // In this case, we don't want to throw an error, we just want to return null.
        if (error.code === 'PGRST116') {
            return null;
        }
        // For any other unexpected database errors, we should still log and throw them.
        console.error('Error fetching user during login:', error);
        throw error;
    }

    if (data && data.password === password) {
        return data;
    }

    return null;
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('user_qrface')
        .select('*')
        .eq('username', username)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') {
            return null; // This is an expected case, not an error.
        }
        console.error('Error fetching user by username:', error);
        throw error;
    }
    return data;
};

export const addUser = async (formData: UserFormValues): Promise<User> => {
    const supabase = createSupabaseClient();
    const newUserId = uuidv4();

    const { data, error } = await supabase
        .from('user_qrface')
        .insert({
            id: newUserId,
            full_name: formData.full_name,
            username: formData.username,
            password: formData.password, // Storing plain text, NOT FOR PRODUCTION
            role: formData.role,
        })
        .select('id, full_name, username, role, created_at')
        .single();

    if (error) {
        console.error('Error adding user:', error);
        if (error.code === '23505') {
            throw new Error('A user with this username already exists.');
        }
        throw error;
    }
    return data;
};

export const updateUser = async (id: string, formData: UserFormValues): Promise<User> => {
    const supabase = createSupabaseClient();
    const updateData: Partial<UserFormValues> = {
        full_name: formData.full_name,
        username: formData.username,
        role: formData.role,
    };

    // Only include the password in the update if a new one was provided
    if (formData.password) {
        updateData.password = formData.password;
    }

    const { data, error } = await supabase
        .from('user_qrface')
        .update(updateData)
        .eq('id', id)
        .select('id, full_name, username, role, created_at')
        .single();

    if (error) {
        console.error('Error updating user:', error);
        if (error.code === '23505') {
            throw new Error('A user with this username already exists.');
        }
        throw error;
    }
    return data;
};

export const deleteUser = async (id: string): Promise<boolean> => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('user_qrface').delete().eq('id', id);

    if (error) {
        console.error('Error deleting user:', error);
        throw error;
    }

    return true;
};

    