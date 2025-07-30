export type Member = {
  id: string;
  fullName: string;
  nickname: string;
  birthday: Date;
  weddingAnniversary?: Date | null;
  email?: string | null;
  phone?: string | null;
  qrCodePayload: string;
  pictureUrl?: string | null;
  ministries?: string | null;
  lg?: string | null;
};

export type AttendanceLog = {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: Date;
  type: 'Pre-registration' | 'Actual';
  method: 'QR' | 'Face';
};
