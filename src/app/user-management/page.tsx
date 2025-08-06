
import AppShell from '@/components/layout/app-shell';
import UserManagementPage from '@/components/user-management/user-management-page';

export default function UserManagement() {
  return (
    <AppShell requiredRole="admin">
      <UserManagementPage />
    </AppShell>
  );
}
