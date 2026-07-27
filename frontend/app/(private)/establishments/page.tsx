'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { usePaginated } from '@/hooks/use-paginated';
import { api } from '@/lib/api';
import type { Establishment } from '@/types';

const empty = { businessName: '', rne: '', address: '', governorate: 'TUNIS', managerName: '', phone: '', email: '' };
export default function EstablishmentsPage() {
  const list = usePaginated<Establishment>('/establishments');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Establishment | null>(null);
  const [form, setForm] = useState(empty);
  const begin = (item?: Establishment) => { setEditing(item ?? null); setForm(item ? { ...item } : empty); setOpen(true); };
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (editing) await api.patch(`/establishments/${editing.id}`, form); else await api.post('/establishments', form); setOpen(false); await list.reload(); };
  const remove = async (id: string) => { if (confirm('Supprimer cet etablissement et archiver ses contrats ?')) { await api.delete(`/establishments/${id}`); await list.reload(); } };
  const columns = useMemo<ColumnDef<Establishment>[]>(() => [
    { accessorKey: 'businessName', header: 'Raison sociale', cell: ({ row }) => <span className="font-semibold">{row.original.businessName}</span> },
    { accessorKey: 'rne', header: 'RNE' }, { accessorKey: 'governorate', header: 'Gouvernorat' },
    { accessorKey: 'managerName', header: 'Responsable' }, { id: 'contracts', header: 'Contrats', cell: ({ row }) => row.original._count?.contracts ?? 0 },
    { id: 'actions', header: 'Actions', cell: ({ row }) => <div className="flex gap-1"><button title="Modifier" className="btn-secondary !h-9 !px-2" onClick={() => begin(row.original)}><Pencil size={16} /></button><button title="Supprimer" className="btn-secondary !h-9 !px-2 text-red-600" onClick={() => remove(row.original.id)}><Trash2 size={16} /></button></div> },
  ], []);
  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));
  return <><PageHeader title="Etablissements" description="Organismes et entreprises assures" action={<button className="btn-primary" onClick={() => begin()}><Plus size={18} />Ajouter</button>} />
    <DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage} />
    <Modal title={editing ? 'Modifier l’établissement' : 'Nouvel établissement'} open={open} onClose={() => setOpen(false)}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">{Object.entries({ businessName: 'Raison sociale', rne: 'RNE', address: 'Adresse', managerName: 'Responsable', phone: 'Telephone', email: 'Email' }).map(([key, label]) => <label key={key} className={key === 'address' ? 'sm:col-span-2' : ''}><span className="label">{label}</span><input required type={key === 'email' ? 'email' : 'text'} className="field" value={form[key as keyof typeof empty]} onChange={(e) => set(key as keyof typeof empty, e.target.value)} disabled={!!editing && key === 'rne'} /></label>)}<label><span className="label">Gouvernorat</span><select className="field" value={form.governorate} onChange={(e) => set('governorate', e.target.value)}>{['TUNIS','ARIANA','BEN_AROUS','MANOUBA','NABEUL','BIZERTE','BEJA','JENDOUBA','KEF','SILIANA','ZAGHOUAN','SOUSSE','MONASTIR','MAHDIA','SFAX','KAIROUAN','KASSERINE','SIDI_BOUZID','GAFSA','TOZEUR','KEBILI','GABES','MEDENINE','TATAOUINE'].map((g) => <option key={g}>{g}</option>)}</select></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button><button className="btn-primary">Enregistrer</button></div></form></Modal></>;
}
