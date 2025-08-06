

export type Member = {
  id: string; 
  fullName: string;
  nickname: string;
  birthday: string;
  weddingAnniversary?: string | null;
  email?: string | null;
  phone?: string | null;
  qrCodePayload: string;
  pictureUrl?: string | null;
  ministries?: string | null;
  lg?: string | null;
  created_at: string;
  promoted_at?: string | null;
};

export type FirstTimer = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  qrCodePayload: string;
  created_at: string;
}

export type AttendanceLog = {
  id: string;
  member_id: string; 
  member_name: string;
  timestamp: string;
  type: 'Pre-registration' | 'Actual';
  method: 'QR' | 'Face';
  created_at: string;
};

export type NewComerAttendanceLog = {
  id: string;
  first_timer_id: string;
  first_timer_name: string;
  timestamp: string;
  type: 'Pre-registration' | 'Actual';
  method: 'QR';
  created_at: string;
}

export type EventConfig = {
  id: number;
  pre_reg_start_date: string;
  event_date: string;
  updated_at: string;
};

export type UserRole = 'admin' | 'viewer' | 'check_in_only';

export type User = {
    id: string;
    full_name: string;
    username: string;
    password?: string; // This is only used for checking during login, not stored in client state
    role: UserRole;
    created_at: string;
};
