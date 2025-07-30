'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Member } from '@/lib/types';
import MembersDataTable from './members-data-table';
import { columns } from './columns';
import { getMembers } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const fetchedMembers = await getMembers();
    setMembers(fetchedMembers);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (loading) {
     return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-headline">Member Management</h1>
                <p className="text-muted-foreground">
                    Add, edit, and manage your event members.
                </p>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Member Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your event members.
        </p>
      </div>
      <MembersDataTable columns={columns} data={members} onAction={refreshData} />
    </div>
  );
}
