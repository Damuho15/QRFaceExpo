
'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type PaginationState,
  type Row,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MemberDialog from './member-dialog';
import BatchAddDialog from './batch-add-dialog';
import { Skeleton } from '../ui/skeleton';
import { PlusCircle, Printer } from 'lucide-react';
import IdCardGeneratorDialog from './id-card-generator-dialog';
import type { Member } from '@/lib/types';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onAction: () => void;
  isLoading: boolean;
  canEdit: boolean;
  pageCount: number;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  fullNameFilter: string;
  setFullNameFilter: (value: string) => void;
  nicknameFilter: string;
  setNicknameFilter: (value: string) => void;
  onGenerateIds: (selectedIds: string[]) => void;
  isGeneratingIds: boolean;
}

export default function MembersDataTable<TData, TValue>({
  columns,
  data,
  onAction,
  isLoading,
  canEdit,
  pageCount,
  pagination,
  setPagination,
  fullNameFilter,
  setFullNameFilter,
  nicknameFilter,
  setNicknameFilter,
  onGenerateIds,
  isGeneratingIds,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    pageCount: pageCount,
    onPaginationChange: setPagination,
    manualPagination: true,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => (row as Member).id,
    state: {
      sorting,
      pagination,
      rowSelection,
    },
    meta: {
      onAction: onAction,
      canEdit: canEdit
    }
  });
  
  const selectedRowIds = Object.keys(rowSelection);


  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <Input
            placeholder="Filter by full name..."
            value={fullNameFilter}
            onChange={(event) => setFullNameFilter(event.target.value)}
            className="w-full sm:max-w-xs"
            />
            <Input
            placeholder="Filter by nickname..."
            value={nicknameFilter}
            onChange={(event) => setNicknameFilter(event.target.value)}
            className="w-full sm:max-w-xs"
            />
        </div>
        {canEdit && (
        <div className="flex items-center gap-2 w-full justify-start sm:justify-end flex-wrap">
            <Button 
                variant="outline" 
                onClick={() => onGenerateIds(selectedRowIds)}
                disabled={selectedRowIds.length === 0 || isGeneratingIds}
            >
                <Printer className="mr-2 h-4 w-4" />
                Generate ID Cards
            </Button>
            <BatchAddDialog onSuccess={onAction} />
            <MemberDialog 
                mode="add"
                onSuccess={onAction} 
            >
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </MemberDialog>
        </div>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: pagination.pageSize }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                        {columns.map((column, j) => (
                            <TableCell key={`skeleton-cell-${i}-${j}`}>
                                <Skeleton className="h-8 w-full" />
                            </TableCell>
                        ))}
                    </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected on this page. ({selectedRowIds.length} total)
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                Next
            </Button>
        </div>
      </div>
    </div>
  );
}
