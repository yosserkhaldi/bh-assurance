'use client';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export function DataTable<T>({
  data, columns, search, onSearch, page, pageCount, onPage,
}: {
  data: T[]; columns: ColumnDef<T>[]; search: string; onSearch: (value: string) => void;
  page: number; pageCount: number; onPage: (page: number) => void;
}) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center border-b border-slate-200 bg-white p-4">
        <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input value={search} onChange={(e) => onSearch(e.target.value)} className="field pl-10" placeholder="Rechercher..." /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-wider text-slate-500">{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((h) => <th key={h.id} className="px-5 py-3.5 font-bold">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead>
          <tbody className="divide-y divide-slate-100">{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id} className="transition hover:bg-blue-50/40">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-5 py-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">Aucune donnee trouvee</td></tr>}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 bg-[#fbfcfe] px-5 py-3.5 text-sm text-slate-600"><span>Page <strong className="text-navy">{page}</strong> sur {Math.max(pageCount, 1)}</span><div className="flex gap-1"><button className="btn-secondary !h-9 !px-2" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Page precedente"><ChevronLeft size={18} /></button><button className="btn-secondary !h-9 !px-2" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Page suivante"><ChevronRight size={18} /></button></div></div>
    </div>
  );
}
