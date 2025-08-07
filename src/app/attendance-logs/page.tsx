
import AppShell from '@/components/layout/app-shell';
import AttendanceLogsPage from '@/components/attendance-logs/attendance-logs-page';

export default function AttendanceLogs() {
  return (
    <AppShell requiredRole="admin">
      <AttendanceLogsPage />
    </AppShell>
  );
}
