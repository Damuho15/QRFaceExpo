
'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MemberDialog from './member-dialog';
import BatchAddDialog from './batch-add-dialog';
import { Skeleton } from '../ui/skeleton';
import { PlusCircle } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onAction: () => void;
  isLoading: boolean;
}

export default function MembersDataTable<TData, TValue>({
  columns,
  data,
  onAction,
  isLoading
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
     meta: {
      onAction: onAction
    }
  });

  const [fullNameFilter, setFullNameFilter] = React.useState('');
  const [nicknameFilter, setNicknameFilter] = React.useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
        table.getColumn('fullName')?.setFilterValue(fullNameFilter);
    }, 300);

    return () => {
        clearTimeout(handler);
    };
  }, [fullNameFilter, table]);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
        table.getColumn('nickname')?.setFilterValue(nicknameFilter);
    }, 300);

    return () => {
        clearTimeout(handler);
    };
  }, [nicknameFilter, table]);


  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <Input
            placeholder="Filter by full name..."
            value={fullNameFilter}
            onChange={(event) => setFullNameFilter(event.target.value)}
            className="w-full sm:max-w-sm"
            />
            <Input
            placeholder="Filter by nickname..."
            value={nicknameFilter}
            onChange={(event) => setNicknameFilter(event.target.value)}
            className="w-full sm:max-w-sm"
            />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-start">
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
                Array.from({ length: 10 }).map((_, i) => (
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
      <div className="flex items-center justify-end space-x-2 py-4">
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
  );
}
