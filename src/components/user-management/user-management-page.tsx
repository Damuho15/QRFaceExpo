
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import UserManagementDataTable from './user-management-data-table';
import { columns } from './columns';
import { getUsers } from '@/lib/supabaseClient';
import { useDebounce } from 'use-debounce';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [usernameFilter, setUsernameFilter] = useState('');
  const [debouncedUsernameFilter] = useDebounce(usernameFilter, 500);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
        const { users: fetchedUsers, count } = await getUsers({
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            usernameFilter: debouncedUsernameFilter
        });
        setUsers(fetchedUsers);
        setPageCount(Math.ceil((count ?? 0) / pagination.pageSize));
    } catch (error) {
        console.error("Failed to fetch users:", error);
    } finally {
        setLoading(false);
    }
  }, [pagination, debouncedUsernameFilter]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Reset page index when filter changes
  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }));
  }, [debouncedUsernameFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">User Management</h1>
        <p className="text-muted-foreground">
          Create, edit, and manage user roles and access.
        </p>
      </div>

      <UserManagementDataTable 
        columns={columns} 
        data={users} 
        onAction={refreshData} 
        isLoading={loading}
        pageCount={pageCount}
        pagination={pagination}
        setPagination={setPagination}
        usernameFilter={usernameFilter}
        setUsernameFilter={setUsernameFilter}
      />
    </div>
  );
}
