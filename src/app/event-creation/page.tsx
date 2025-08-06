
import AppShell from '@/components/layout/app-shell';
import EventCreationPage from '@/components/event-creation/event-creation-page';

export default function EventCreation() {
  return (
    <AppShell requiredRole="admin">
      <EventCreationPage />
    </AppShell>
  );
}
