
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Member } from '@/lib/types';
import MembersDataTable from './members-data-table';
import { columns } from './columns';
import { getMembers } from '@/lib/supabaseClient';
import StatCard from '../dashboard/stat-card';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from 'use-debounce';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [fullNameFilter, setFullNameFilter] = useState('');
  const [nicknameFilter, setNicknameFilter] = useState('');
  const [debouncedFullNameFilter] = useDebounce(fullNameFilter, 500);
  const [debouncedNicknameFilter] = useDebounce(nicknameFilter, 500);

  const { user } = useAuth();

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
        const { members: fetchedMembers, count } = await getMembers(
            pagination.pageIndex, 
            pagination.pageSize,
            debouncedFullNameFilter,
            debouncedNicknameFilter
        );
        setMembers(fetchedMembers);
        setTotalMembers(count);
        setPageCount(Math.ceil(count / pagination.pageSize));
    } catch (error) {
        console.error("Failed to fetch members:", error);
    } finally {
        setLoading(false);
    }
  }, [pagination, debouncedFullNameFilter, debouncedNicknameFilter]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Reset page index when filters change
  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }));
  }, [debouncedFullNameFilter, debouncedNicknameFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Member Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your event members.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && members.length === 0 ? (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-12" />
                </CardContent>
            </Card>
        ) : (
            <StatCard title="Total Members" value={totalMembers} icon={Users} />
        )}
      </div>

      <MembersDataTable 
        columns={columns} 
        data={members} 
        onAction={refreshData} 
        isLoading={loading} 
        canEdit={user?.role === 'admin'}
        pageCount={pageCount}
        pagination={pagination}
        setPagination={setPagination}
        fullNameFilter={fullNameFilter}
        setFullNameFilter={setFullNameFilter}
        nicknameFilter={nicknameFilter}
        setNicknameFilter={setNicknameFilter}
      />
    </div>
  );
}
