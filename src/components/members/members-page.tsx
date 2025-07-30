
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Member } from '@/lib/types';
import MembersDataTable from './members-data-table';
import { columns } from './columns';
import { getMembers } from '@/lib/supabaseClient';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
        const fetchedMembers = await getMembers();
        setMembers(fetchedMembers);
    } catch (error) {
        console.error("Failed to fetch members:", error);
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
        <h1 className="text-2xl font-bold font-headline">Member Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your event members.
        </p>
      </div>
      <MembersDataTable columns={columns} data={members} onAction={refreshData} isLoading={loading} />
    </div>
  );
}
