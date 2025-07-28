export type Member = {
  id: string;
  fullName: string;
  nickname: string;
  birthday: Date;
  email: string;
  phone: string;
  qrCodePayload: string;
};

export type AttendanceLog = {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: Date;
  type: 'Pre-registration' | 'Actual';
  method: 'QR' | 'Face';
};
