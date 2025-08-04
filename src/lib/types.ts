

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
};

export type AttendanceLog = {
  id: number;
  member_id: string; 
  member_name: string;
  timestamp: string;
  type: 'Pre-registration' | 'Actual';
  method: 'QR' | 'Face';
  created_at: string;
};

export type EventConfig = {
  id: number;
  pre_reg_start_date: string;
  event_date: string;
  updated_at: string;
};
