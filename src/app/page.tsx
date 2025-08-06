
import AppShell from '@/components/layout/app-shell';
import DashboardPage from '@/components/dashboard/dashboard-page';

export default function Home() {
  return (
    <AppShell requiredRole="viewer">
      <DashboardPage />
    </AppShell>
  );
}
