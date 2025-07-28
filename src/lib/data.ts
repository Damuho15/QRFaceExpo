import type { Member, AttendanceLog } from './types';

export const mockMembers: Member[] = [
  {
    id: 'mem_1',
    fullName: 'John Doe',
    nickname: 'Johnny',
    birthday: new Date('1990-05-15'),
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    qrCodePayload: 'John Doe',
  },
  {
    id: 'mem_2',
    fullName: 'Jane Smith',
    nickname: 'Janey',
    birthday: new Date('1992-08-21'),
    email: 'jane.smith@example.com',
    phone: '234-567-8901',
    qrCodePayload: 'Jane Smith',
  },
  {
    id: 'mem_3',
    fullName: 'Peter Jones',
    nickname: 'Pete',
    birthday: new Date('1985-11-30'),
    email: 'peter.jones@example.com',
    phone: '345-678-9012',
    qrCodePayload: 'Peter Jones',
  },
  {
    id: 'mem_4',
    fullName: 'Mary Johnson',
    nickname: 'MJ',
    birthday: new Date('1998-02-10'),
    email: 'mary.johnson@example.com',
    phone: '456-789-0123',
    qrCodePayload: 'Mary Johnson',
  },
    {
    id: 'mem_5',
    fullName: 'Chris Lee',
    nickname: 'Chris',
    birthday: new Date('2000-01-01'),
    email: 'chris.lee@example.com',
    phone: '567-890-1234',
    qrCodePayload: 'Chris Lee',
  },
];

export const mockAttendanceLogs: AttendanceLog[] = [
  { id: 'att_1', memberId: 'mem_1', memberName: 'John Doe', timestamp: new Date(new Date().setDate(new Date().getDate() - 2)), type: 'Pre-registration', method: 'QR' },
  { id: 'att_2', memberId: 'mem_2', memberName: 'Jane Smith', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)), type: 'Pre-registration', method: 'Face' },
  { id: 'att_3', memberId: 'mem_3', memberName: 'Peter Jones', timestamp: new Date(new Date().setHours(new Date().getHours() - 4)), type: 'Actual', method: 'QR' },
  { id: 'att_4', memberId: 'mem_4', memberName: 'Mary Johnson', timestamp: new Date(new Date().setHours(new Date().getHours() - 2)), type: 'Actual', method: 'Face' },
  { id: 'att_5', memberId: 'mem_1', memberName: 'John Doe', timestamp: new Date(new Date().setHours(new Date().getHours() - 1)), type: 'Actual', method: 'QR' },
];
