'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { useRealtimeReload } from '@/hooks/use-realtime-reload';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { Contract, Paginated, Vehicle } from '@/types';

const empty = { registrationNumber: '', make: '', model: '', year: String(new Date().getFullYear()), chassisNumber: '', type: 'CAR', contractId: '' };
export default function VehiclesPage() {
  const { can } = useCan();
  const canCreate = can(Permission.VEHICLES_CREATE);
  const canUpdate = can(Permission.VEHICLES_UPDATE);
  const canDelete = can(Permission.VEHICLES_DELETE);
  const canImport = can(Permission.VEHICLES_IMPORT);
  const canExport = can(Permission.VEHICLES_EXPORT);
  const list = usePaginated<Vehicle>('/vehicles');
  useRealtimeReload(['vehicle', 'contract'], () => { void list.reload(); void api.get<Paginated<Contract>>('/contracts', { params: { limit: 100 } }).then((r) => setContracts(r.data.data)); });
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Vehicle | null>(null); const [form, setForm] = useState(empty);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void api.get<Paginated<Contract>>('/contracts', { params: { limit: 100 } }).then((r) => setContracts(r.data.data)); }, []);
  const begin = (v?: Vehicle) => { setEditing(v ?? null); setForm(v ? { registrationNumber: v.registrationNumber, make: v.make, model: v.model, year: String(v.year), chassisNumber: v.chassisNumber, type: v.type, contractId: v.contractId } : empty); setOpen(true); };
  const save = async (e: React.FormEvent) => { e.preventDefault(); const payload = { ...form, year: Number(form.year) }; if (editing) await api.patch(`/vehicles/${editing.id}`, payload); else await api.post('/vehicles', payload); setOpen(false); await list.reload(); };
  const remove = useCallback(async (id: string) => { if (confirm('Archiver ce véhicule ?')) { await api.delete(`/vehicles/${id}`); await list.reload(); } }, [list]);
  const importFile = async (file?: File) => { if (!file) return; const contractId = prompt('Identifiant du contrat destinataire'); if (!contractId) return; const body = new FormData(); body.append('file', file); await api.post(`/vehicles/import/${contractId}`, body); await list.reload(); };
  const download = async () => { const response = await api.get('/vehicles/export/excel', { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = 'vehicules.xlsx'; a.click(); URL.revokeObjectURL(url); };
  const columns = useMemo<ColumnDef<Vehicle>[]>(() => [
    { accessorKey: 'registrationNumber', header: 'Immatriculation', cell: ({ row }) => <span className="font-semibold">{row.original.registrationNumber}</span> },
    { id: 'vehicle', header: 'Marque & modèle', cell: ({ row }) => <span>{row.original.make} <span className="text-slate-500">{row.original.model}</span></span> }, { accessorKey: 'year', header: 'Année' },
    { accessorKey: 'type', header: 'Type' }, { id: 'contract', header: 'Contrat', cell: ({ row }) => row.original.contract.number },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (canUpdate || canDelete) ? <div className="flex gap-1">{canUpdate && <button className="icon-btn" title="Modifier" onClick={() => begin(row.original)}><Pencil size={16}/></button>}{canDelete && <button className="icon-btn text-red-600 hover:bg-red-50" title="Supprimer" onClick={() => remove(row.original.id)}><Trash2 size={16}/></button>}</div> : null },
  ], [canUpdate, canDelete, remove]);
  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));
  return <><PageHeader title="Véhicules" description="Parc automobile couvert par les contrats" action={<div className="flex flex-wrap gap-2">{canImport && <><input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void importFile(e.target.files?.[0])}/><button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={18}/>Importer</button></>}{canExport && <button className="btn-secondary" onClick={download}><Download size={18}/>Exporter Excel</button>}{canCreate && <button className="btn-primary" onClick={() => begin()}><Plus size={18}/>Ajouter un véhicule</button>}</div>} /><DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage}/>
    <Modal title={editing ? 'Modifier le vehicule' : 'Nouveau vehicule'} open={open} onClose={() => setOpen(false)}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">{(['registrationNumber','make','model','year','chassisNumber'] as const).map((key)=><label key={key}><span className="label">{{registrationNumber:'Immatriculation',make:'Marque',model:'Modele',year:'Annee',chassisNumber:'Numero de chassis'}[key]}</span><input required type={key === 'year' ? 'number' : 'text'} min={key === 'year' ? 1900 : undefined} max={key === 'year' ? new Date().getFullYear() + 1 : undefined} minLength={key === 'chassisNumber' ? 6 : key === 'make' ? 2 : undefined} maxLength={key === 'registrationNumber' ? 50 : 100} className="field" disabled={!!editing && ['registrationNumber','chassisNumber'].includes(key)} value={form[key]} onChange={(e)=>set(key,e.target.value)}/></label>)}<label><span className="label">Type</span><select className="field" value={form.type} onChange={(e)=>set('type',e.target.value)}>{['CAR','VAN','TRUCK','BUS','MOTORCYCLE','SPECIAL','OTHER'].map((v)=><option key={v}>{v}</option>)}</select></label><label className="sm:col-span-2"><span className="label">Contrat</span><select required className="field" value={form.contractId} onChange={(e)=>set('contractId',e.target.value)}><option value="">Selectionner</option>{contracts.map((c)=><option key={c.id} value={c.id}>{c.number} — {c.establishment.businessName}</option>)}</select></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={()=>setOpen(false)}>Annuler</button><button className="btn-primary">Enregistrer</button></div></form></Modal></>;
}
