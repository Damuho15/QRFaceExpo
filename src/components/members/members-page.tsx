'use client';

import React from 'react';
import { mockMembers } from '@/lib/data';
import type { Member } from '@/lib/types';
import MembersDataTable from './members-data-table';
import { columns } from './columns';

export default function MembersPage() {
  const [members, setMembers] = React.useState<Member[]>(mockMembers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Member Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your event members.
        </p>
      </div>
      <MembersDataTable columns={columns} data={members} />
    </div>
  );
}
