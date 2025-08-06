
import AppShell from '@/components/layout/app-shell';
import FirstTimersPage from '@/components/first-timers/first-timers-page';

export default function FirstTimers() {
  return (
    <AppShell requiredRole="viewer">
      <FirstTimersPage />
    </AppShell>
  );
}
