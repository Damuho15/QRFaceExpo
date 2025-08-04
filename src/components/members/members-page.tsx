
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Member } from '@/lib/types';
import MembersDataTable from './members-data-table';
import { columns } from './columns';
import { getMembers } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
        const fetchedMembers = await getMembers();
        setMembers(fetchedMembers);
    } catch (error) => {
        console.error("Failed to fetch members:", error);
        // Optionally, add toast notifications for errors
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const firstMember = !loading && members.length > 0 ? members[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Member Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage your event members.
        </p>
      </div>

       {/* --- Temporary Debugging Card --- */}
      <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
              <CardTitle>Temporary Debugger: First Member Data</CardTitle>
              <CardDescription>
                  This card shows the raw data and JavaScript type for the first member fetched from the database.
                  Use this to identify any field with an incorrect data type (e.g., an 'id' that is a 'number' instead of a 'string').
              </CardDescription>
          </CardHeader>
          <CardContent>
              {loading ? (
                  <p>Loading member data...</p>
              ) : firstMember ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Field Name</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Type (typeof)</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {Object.entries(firstMember).map(([key, value]) => (
                              <TableRow key={key}>
                                  <TableCell className="font-mono">{key}</TableCell>
                                  <TableCell className="font-mono">{String(value)}</TableCell>
                                  <TableCell className="font-mono">{typeof value}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : (
                  <p>No members found to display.</p>
              )}
          </CardContent>
      </Card>
      {/* --- End Temporary Debugging Card --- */}

      <MembersDataTable columns={columns} data={members} onAction={refreshData} isLoading={loading} />
    </div>
  );
}
