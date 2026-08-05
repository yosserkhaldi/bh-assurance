'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { usePaginated } from '@/hooks/use-paginated';
import { api } from '@/lib/api';
import type { Contract, Establishment, Paginated } from '@/types';

const empty = { number: '', type: 'FLEET', startDate: '', endDate: '', status: 'ACTIVE', establishmentId: '' };
export default function ContractsPage() {
  const list = usePaginated<Contract>('/contracts');
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [renewing, setRenewing] = useState<Contract | null>(null);
  const [form, setForm] = useState(empty);
  useEffect(() => { void api.get<Paginated<Establishment>>('/establishments', { params: { limit: 100 } }).then((r) => setEstablishments(r.data.data)); }, []);
  const begin = (item?: Contract, renew = false) => {
    setEditing(renew ? null : item ?? null); setRenewing(renew ? item! : null);
    setForm(item ? { number: renew ? '' : item.number, type: item.type, startDate: item.startDate.slice(0,10), endDate: item.endDate.slice(0,10), status: renew ? 'ACTIVE' : item.status, establishmentId: item.establishmentId } : empty); setOpen(true);
  };
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (renewing) await api.post(`/contracts/${renewing.id}/renew`, form); else if (editing) await api.patch(`/contracts/${editing.id}`, form); else await api.post('/contracts', form); setOpen(false); await list.reload(); };
  const remove = async (id: string) => { if (confirm('Archiver ce contrat et ses véhicules ?')) { await api.delete(`/contracts/${id}`); await list.reload(); } };
  const columns = useMemo<ColumnDef<Contract>[]>(() => [
    { accessorKey: 'number', header: 'Numero', cell: ({ row }) => <span className="font-semibold">{row.original.number}</span> },
    { id: 'establishment', header: 'Etablissement', cell: ({ row }) => row.original.establishment.businessName },
    { accessorKey: 'type', header: 'Type' }, { accessorKey: 'status', header: 'Statut', cell: ({ row }) => <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-semibold">{row.original.status}</span> },
    { accessorKey: 'endDate', header: 'Echeance', cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString('fr-TN') },
    { id: 'vehicles', header: 'Vehicules', cell: ({ row }) => row.original._count?.vehicles ?? 0 },
    { id: 'actions', header: 'Actions', cell: ({ row }) => <div className="flex gap-1"><button title="Renouveler" className="btn-secondary !h-9 !px-2 text-emerald-700" onClick={() => begin(row.original, true)}><RefreshCw size={16} /></button><button title="Modifier" className="btn-secondary !h-9 !px-2" onClick={() => begin(row.original)}><Pencil size={16} /></button><button title="Supprimer" className="btn-secondary !h-9 !px-2 text-red-600" onClick={() => remove(row.original.id)}><Trash2 size={16} /></button></div> },
  ], []);
  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));
  return <><PageHeader title="Contrats" description="Suivi des polices flotte et de leurs echeances" action={<button className="btn-primary" onClick={() => begin()}><Plus size={18}/>Ajouter</button>} /><DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage} />
    <Modal title={renewing ? `Renouveler ${renewing.number}` : editing ? 'Modifier le contrat' : 'Nouveau contrat'} open={open} onClose={() => setOpen(false)}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <label><span className="label">Numero</span><input required minLength={3} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9/_-]{2,99}" className="field" value={form.number} disabled={!!editing} onChange={(e) => set('number', e.target.value)} /></label>
      <label><span className="label">Type</span><select className="field" value={form.type} onChange={(e) => set('type', e.target.value)}>{['FLEET','INDIVIDUAL','TEMPORARY','OTHER'].map((v)=><option key={v}>{v}</option>)}</select></label>
      <label><span className="label">Date de debut</span><input required type="date" className="field" max={form.endDate || undefined} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
      <label><span className="label">Date de fin</span><input required type="date" className="field" min={form.startDate || undefined} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
      <label><span className="label">Statut</span><select className="field" value={form.status} onChange={(e) => set('status', e.target.value)}>{['DRAFT','ACTIVE','EXPIRING_SOON','EXPIRED','CANCELLED'].map((v)=><option key={v}>{v}</option>)}</select></label>
      <label><span className="label">Etablissement</span><select required className="field" disabled={!!editing || !!renewing} value={form.establishmentId} onChange={(e) => set('establishmentId', e.target.value)}><option value="">Selectionner</option>{establishments.map((e)=><option key={e.id} value={e.id}>{e.businessName}</option>)}</select></label>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button><button className="btn-primary">Enregistrer</button></div>
    </form></Modal></>;
}
