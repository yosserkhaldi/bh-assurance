'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { isAxiosError } from 'axios';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { useRealtimeReload } from '@/hooks/use-realtime-reload';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { Establishment } from '@/types';

const empty = { businessName: '', rne: '', address: '', governorate: 'TUNIS', managerName: '', phone: '', email: '' };

export default function EstablishmentsPage() {
  const { can } = useCan();
  const canCreate = can(Permission.ESTABLISHMENTS_CREATE);
  const canUpdate = can(Permission.ESTABLISHMENTS_UPDATE);
  const canDelete = can(Permission.ESTABLISHMENTS_DELETE);
  const list = usePaginated<Establishment>('/establishments');
  useRealtimeReload(['establishment'], list.reload);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Establishment | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const begin = (item?: Establishment) => {
    setEditing(item ?? null);
    setForm(item ? { ...item } : empty);
    setError('');
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const payload = { ...form, rne: form.rne.toUpperCase(), email: form.email.trim().toLowerCase() };
    try {
      if (editing) await api.patch(`/establishments/${editing.id}`, payload);
      else await api.post('/establishments', payload);
      setOpen(false);
      await list.reload();
    } catch (requestError) {
      if (isAxiosError(requestError)) {
        const message = requestError.response?.data?.message;
        setError(Array.isArray(message) ? message.join(' ? ') : message || 'Impossible d enregistrer l etablissement.');
      } else setError('Impossible d enregistrer l etablissement.');
    } finally {
      setSaving(false);
    }
  };

  const remove = useCallback(async (id: string) => {
    if (confirm('Supprimer cet etablissement et archiver ses contrats ?')) {
      await api.delete(`/establishments/${id}`);
      await list.reload();
    }
  }, [list]);

  const columns = useMemo<ColumnDef<Establishment>[]>(() => [
    { accessorKey: 'businessName', header: 'Raison sociale', cell: ({ row }) => <span className="font-semibold">{row.original.businessName}</span> },
    { accessorKey: 'rne', header: 'RNE' },
    { accessorKey: 'governorate', header: 'Gouvernorat' },
    { accessorKey: 'managerName', header: 'Responsable' },
    { id: 'contracts', header: 'Contrats', cell: ({ row }) => row.original._count?.contracts ?? 0 },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (canUpdate || canDelete) ? <div className="flex gap-1">{canUpdate && <button title="Modifier" className="btn-secondary !h-9 !px-2" onClick={() => begin(row.original)}><Pencil size={16} /></button>}{canDelete && <button title="Supprimer" className="btn-secondary !h-9 !px-2 text-red-600" onClick={() => remove(row.original.id)}><Trash2 size={16} /></button>}</div> : null },
  ], [canUpdate, canDelete, remove]);

  const set = (key: keyof typeof empty, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return <>
    <PageHeader title="Etablissements" description="Organismes et entreprises assures" action={canCreate ? <button className="btn-primary" onClick={() => begin()}><Plus size={18} />Ajouter</button> : undefined} />
    <DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage} />
    <Modal title={editing ? 'Modifier l etablissement' : 'Nouvel etablissement'} open={open} onClose={() => setOpen(false)}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Raison sociale</span><input required minLength={2} maxLength={200} placeholder="Ex. Societe Sahel Transport" className="field" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} /></label>
        <label><span className="label">RNE</span><input required minLength={8} maxLength={8} pattern="[0-9]{7}[A-Za-z]" placeholder="0001238L" title="7 chiffres suivis d une lettre" className="field uppercase" value={form.rne} onChange={(e) => set('rne', e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 8).toUpperCase())} disabled={!!editing} /><small className="text-xs text-slate-500">Format : 7 chiffres + 1 lettre</small></label>
        <label className="sm:col-span-2"><span className="label">Adresse</span><input required minLength={5} maxLength={500} placeholder="Ex. 12 avenue Habib Bourguiba, Tunis" className="field" value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
        <label><span className="label">Responsable</span><input required minLength={2} maxLength={200} placeholder="Ex. Amel Ben Salah" className="field" value={form.managerName} onChange={(e) => set('managerName', e.target.value)} /></label>
        <label><span className="label">Telephone</span><input required type="tel" inputMode="numeric" minLength={8} maxLength={8} pattern="[0-9]{8}" placeholder="71123456" title="Saisissez exactement 8 chiffres" className="field" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 8))} /><small className="text-xs text-slate-500">8 chiffres, sans espaces ni +216</small></label>
        <label><span className="label">Email</span><input required type="email" maxLength={255} placeholder="contact@entreprise.tn" className="field" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
        <label><span className="label">Gouvernorat</span><select className="field" value={form.governorate} onChange={(e) => set('governorate', e.target.value)}>{['TUNIS','ARIANA','BEN_AROUS','MANOUBA','NABEUL','BIZERTE','BEJA','JENDOUBA','KEF','SILIANA','ZAGHOUAN','SOUSSE','MONASTIR','MAHDIA','SFAX','KAIROUAN','KASSERINE','SIDI_BOUZID','GAFSA','TOZEUR','KEBILI','GABES','MEDENINE','TATAOUINE'].map((g) => <option key={g}>{g}</option>)}</select></label>
        {error && <div role="alert" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button><button disabled={saving} className="btn-primary">{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
      </form>
    </Modal>
  </>;
}
