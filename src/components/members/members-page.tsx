'use client';

import React, { useState, useEffect } from 'react';
import { mockMembers } from '@/lib/data';
import type { Member } from '@/lib/types';
import MembersDataTable from './members-data-table';
import { columns } from './columns';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // In a real app, you'd fetch this from an API
    setMembers(mockMembers);
  }, [version]);
  
  const refreshData = () => {
    // This is a dummy function to simulate refetching data
    // In a real app, you would invalidate a query cache or re-fetch from an API
    console.log("Refreshing data...")
    setVersion(v => v + 1);
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
