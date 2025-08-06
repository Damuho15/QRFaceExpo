
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import UserManagementDataTable from './user-management-data-table';
import { columns } from './columns';
import { getUsers } from '@/lib/supabaseClient';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
    } catch (error) {
        console.error("Failed to fetch users:", error);
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
        <h1 className="text-2xl font-bold font-headline">User Management</h1>
        <p className="text-muted-foreground">
          Create, edit, and manage user roles and access.
        </p>
      </div>

      <UserManagementDataTable columns={columns} data={users} onAction={refreshData} isLoading={loading} />
    </div>
  );
}
