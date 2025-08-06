
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Member } from '@/lib/types';
import MembersDataTable from './members-data-table';
import { columns } from './columns';
import { getMembers } from '@/lib/supabaseClient';
import StatCard from '../dashboard/stat-card';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/context/AuthContext';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
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
            <StatCard title="Total Members" value={members.length} icon={Users} />
        )}
      </div>

      <MembersDataTable columns={columns} data={members} onAction={refreshData} isLoading={loading} canEdit={user?.role === 'admin'} />
    </div>
  );
}
