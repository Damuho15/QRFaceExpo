
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { FirstTimer } from '@/lib/types';
import FirstTimersDataTable from './first-timers-data-table';
import { columns } from './columns';
import { getFirstTimers } from '@/lib/supabaseClient';

export default function FirstTimersPage() {
  const [firstTimers, setFirstTimers] = useState<FirstTimer[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
        const fetchedFirstTimers = await getFirstTimers();
        setFirstTimers(fetchedFirstTimers);
    } catch (error) {
        console.error("Failed to fetch first-timers:", error);
        // Optionally, add toast notifications for errors
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">1st Timer Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your first-time attendees.
        </p>
      </div>

      <FirstTimersDataTable columns={columns} data={firstTimers} onAction={refreshData} isLoading={loading} />
    </div>
  );
}
