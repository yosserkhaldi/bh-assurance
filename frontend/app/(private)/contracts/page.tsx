'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Folder, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { useRealtimeReload } from '@/hooks/use-realtime-reload';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { Amendment, Contract, EstablishmentForContract, GeneratedDocument, GeneratedDocumentType, Vehicle } from '@/types';

const empty = { number: '', type: 'FLEET', startDate: '', endDate: '', status: 'ACTIVE', establishmentId: '' };
const emptyAmendment = { type: 'OTHER' as Amendment['type'], effectiveDate: '', description: '', vehicleIds: [] as string[] };
const documentTypes: GeneratedDocumentType[] = ['ATTESTATION', 'GREEN_CARD', 'AMENDMENT', 'CONTRACT_SUMMARY'];

export default function ContractsPage() {
  const { can } = useCan();
  const canCreate = can(Permission.CONTRACTS_CREATE);
  const canUpdate = can(Permission.CONTRACTS_UPDATE);
  const canDelete = can(Permission.CONTRACTS_DELETE);
  const canRenew = can(Permission.CONTRACTS_RENEW);
  const canDocumentsRead = can(Permission.DOCUMENTS_READ);
  const canDocumentsGenerate = can(Permission.DOCUMENTS_GENERATE);

  const list = usePaginated<Contract>('/contracts');
  useRealtimeReload(['contract', 'establishment'], () => { void list.reload(); void loadEstablishments(); });

  const [establishments, setEstablishments] = useState<EstablishmentForContract[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [renewing, setRenewing] = useState<Contract | null>(null);
  const [form, setForm] = useState(empty);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [amendmentsOpen, setAmendmentsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [amendmentForm, setAmendmentForm] = useState(emptyAmendment);
  const [amendmentCreating, setAmendmentCreating] = useState(false);

  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [documentForm, setDocumentForm] = useState<{ type: GeneratedDocumentType; amendmentId: string; vehicleId: string }>({ type: 'CONTRACT_SUMMARY', amendmentId: '', vehicleId: '' });
  const [documentGenerating, setDocumentGenerating] = useState(false);

  const loadEstablishments = () => void api.get<EstablishmentForContract[]>('/establishments/for-contract').then((r) => setEstablishments(r.data));
  useEffect(() => { loadEstablishments(); }, []);

  const begin = (item?: Contract, renew = false) => {
    setEditing(renew ? null : item ?? null); setRenewing(renew ? item! : null);
    setForm(item ? { number: renew ? '' : item.number, type: item.type, startDate: item.startDate.slice(0,10), endDate: item.endDate.slice(0,10), status: renew ? 'ACTIVE' : item.status, establishmentId: item.establishmentId } : empty); setOpen(true);
  };
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (renewing) await api.post(`/contracts/${renewing.id}/renew`, form); else if (editing) await api.patch(`/contracts/${editing.id}`, form); else await api.post('/contracts', form); setOpen(false); await list.reload(); };
  const remove = useCallback(async (id: string) => { if (confirm('Archiver ce contrat et ses vehicules ?')) { await api.delete(`/contracts/${id}`); await list.reload(); } }, [list]);

  const openAmendments = useCallback(async (contract: Contract) => {
    setSelectedContract(contract);
    setAmendmentsOpen(true);
    setAmendmentForm(emptyAmendment);
    await loadAmendments(contract.id);
  }, []);

  const loadAmendments = async (contractId: string) => {
    const r = await api.get<Amendment[]>('/amendments', { params: { contractId } });
    setAmendments(r.data);
  };

  const createAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setAmendmentCreating(true);
    await api.post('/amendments', {
      contractId: selectedContract.id,
      type: amendmentForm.type,
      effectiveDate: amendmentForm.effectiveDate || undefined,
      description: amendmentForm.description || undefined,
      vehicleIds: amendmentForm.vehicleIds.length ? amendmentForm.vehicleIds : undefined,
    });
    setAmendmentForm(emptyAmendment);
    await loadAmendments(selectedContract.id);
    setAmendmentCreating(false);
  };

  const changeAmendmentStatus = async (id: string, status: Amendment['status']) => {
    if (!selectedContract) return;
    await api.patch(`/amendments/${id}/status`, { status });
    await loadAmendments(selectedContract.id);
  };

  const deleteAmendment = async (id: string) => {
    if (!selectedContract) return;
    if (!confirm('Archiver cet avenant ?')) return;
    await api.delete(`/amendments/${id}`);
    await loadAmendments(selectedContract.id);
  };

  const openDocuments = useCallback(async (contract: Contract) => {
    setSelectedContract(contract);
    setDocumentsOpen(true);
    setDocumentForm({ type: 'CONTRACT_SUMMARY', amendmentId: '', vehicleId: '' });
    const [v, d] = await Promise.all([
      api.get<{ data: Vehicle[] }>(`/vehicles?contractId=${contract.id}&limit=100`),
      api.get<GeneratedDocument[]>('/documents', { params: { contractId: contract.id } }),
    ]);
    setVehicles(v.data.data);
    setDocuments(d.data);
  }, []);

  const loadDocuments = async (contractId: string) => {
    const r = await api.get<GeneratedDocument[]>('/documents', { params: { contractId } });
    setDocuments(r.data);
  };

  const generateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setDocumentGenerating(true);
    await api.post('/documents/generate', {
      contractId: selectedContract.id,
      type: documentForm.type,
      amendmentId: documentForm.amendmentId || undefined,
      vehicleId: documentForm.vehicleId || undefined,
    });
    setDocumentForm({ type: 'CONTRACT_SUMMARY', amendmentId: '', vehicleId: '' });
    await loadDocuments(selectedContract.id);
    setDocumentGenerating(false);
  };

  const downloadDocument = async (doc: GeneratedDocument) => {
    const r = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteDocument = async (id: string) => {
    if (!selectedContract) return;
    if (!confirm('Supprimer ce document ?')) return;
    await api.delete(`/documents/${id}`);
    await loadDocuments(selectedContract.id);
  };

  const columns = useMemo<ColumnDef<Contract>[]>(() => [
    { accessorKey: 'number', header: 'Numéro', cell: ({ row }) => <span className="font-semibold text-navy">{row.original.number}</span> },
    { id: 'establishment', header: 'Établissement', cell: ({ row }) => row.original.establishment.businessName },
    { accessorKey: 'type', header: 'Type' }, { accessorKey: 'status', header: 'Statut', cell: ({ row }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.original.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : row.original.status === 'EXPIRED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{row.original.status}</span> },
    { accessorKey: 'endDate', header: 'Échéance', cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString('fr-TN') },
    { id: 'vehicles', header: 'Véhicules', cell: ({ row }) => row.original._count?.vehicles ?? 0 },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        {canDocumentsRead && <button title="Avenants" className="btn-secondary !h-9 !px-2 text-blue-700" onClick={() => openAmendments(row.original)}><Folder size={16} /></button>}
        {canDocumentsRead && <button title="Documents" className="btn-secondary !h-9 !px-2 text-indigo-700" onClick={() => openDocuments(row.original)}><FileText size={16} /></button>}
        {canRenew && <button title="Renouveler" className="btn-secondary !h-9 !px-2 text-emerald-700" onClick={() => begin(row.original, true)}><RefreshCw size={16} /></button>}
        {canUpdate && <button title="Modifier" className="btn-secondary !h-9 !px-2" onClick={() => begin(row.original)}><Pencil size={16} /></button>}
        {canDelete && <button title="Supprimer" className="btn-secondary !h-9 !px-2 text-red-600" onClick={() => remove(row.original.id)}><Trash2 size={16} /></button>}
      </div>
    ) },
  ], [canUpdate, canDelete, canRenew, canDocumentsRead, remove, openAmendments, openDocuments]);
  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return <><PageHeader title="Contrats" description="Suivi des polices flotte et de leurs échéances" action={canCreate ? <button className="btn-primary" onClick={() => begin()}><Plus size={18}/>Ajouter un contrat</button> : undefined} /><DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage} />
    <Modal title={renewing ? `Renouveler ${renewing.number}` : editing ? 'Modifier le contrat' : 'Nouveau contrat'} open={open} onClose={() => setOpen(false)}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <label><span className="label">Numero</span><input required minLength={3} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9/_-]{2,99}" className="field" value={form.number} disabled={!!editing} onChange={(e) => set('number', e.target.value)} /></label>
      <label><span className="label">Type</span><select className="field" value={form.type} onChange={(e) => set('type', e.target.value)}>{['FLEET','INDIVIDUAL','TEMPORARY','OTHER'].map((v)=><option key={v}>{v}</option>)}</select></label>
      <label><span className="label">Date de debut</span><input required type="date" className="field" max={form.endDate || undefined} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
      <label><span className="label">Date de fin</span><input required type="date" className="field" min={form.startDate || undefined} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
      <label><span className="label">Statut</span><select className="field" value={form.status} onChange={(e) => set('status', e.target.value)}>{['DRAFT','ACTIVE','EXPIRING_SOON','EXPIRED','CANCELLED'].map((v)=><option key={v}>{v}</option>)}</select></label>
      <label><span className="label">Etablissement</span><select required className="field" disabled={!!editing || !!renewing} value={form.establishmentId} onChange={(e) => set('establishmentId', e.target.value)}><option value="">Selectionner</option>{establishments.map((e)=><option key={e.id} value={e.id} disabled={e.hasActiveContract}>{e.businessName}{e.hasActiveContract ? ' (contrat actif existant)' : ''}</option>)}</select></label>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button><button className="btn-primary">Enregistrer</button></div>
    </form></Modal>

    <Modal title={`Avenants - ${selectedContract?.number ?? ''}`} open={amendmentsOpen} onClose={() => setAmendmentsOpen(false)}>
      <div className="space-y-4">
        {canCreate && (
          <form onSubmit={createAmendment} className="rounded border p-3 space-y-3">
            <h3 className="font-semibold">Nouvel avenant</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="label">Type</span><select className="field" value={amendmentForm.type} onChange={(e) => setAmendmentForm((f) => ({ ...f, type: e.target.value as Amendment['type'] }))}>{['VEHICLE_ADDITION','VEHICLE_REMOVAL','DATE_CHANGE','COVERAGE_CHANGE','OTHER'].map((v)=><option key={v}>{v}</option>)}</select></label>
              <label><span className="label">Date d&apos;effet</span><input type="date" className="field" value={amendmentForm.effectiveDate} onChange={(e) => setAmendmentForm((f) => ({ ...f, effectiveDate: e.target.value }))} /></label>
              <label className="sm:col-span-2"><span className="label">Description</span><textarea className="field" rows={2} value={amendmentForm.description} onChange={(e) => setAmendmentForm((f) => ({ ...f, description: e.target.value }))} /></label>
            </div>
            <div className="flex justify-end"><button className="btn-primary" disabled={amendmentCreating}>{amendmentCreating ? 'Creation...' : 'Creer'}</button></div>
          </form>
        )}
        <div className="max-h-96 overflow-auto">
          {amendments.length === 0 ? <p className="text-sm text-slate-500">Aucun avenant.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className="p-2 text-left">Type</th><th className="p-2 text-left">Statut</th><th className="p-2 text-left">Effet</th><th className="p-2 text-left">Description</th><th className="p-2"></th></tr></thead>
              <tbody>
                {amendments.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="p-2">{a.type}</td>
                    <td className="p-2"><span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-semibold">{a.status}</span></td>
                    <td className="p-2">{a.effectiveDate ? new Date(a.effectiveDate).toLocaleDateString('fr-TN') : '-'}</td>
                    <td className="p-2 max-w-xs truncate">{a.description ?? '-'}</td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-end">
                        {canUpdate && a.status === 'DRAFT' && <button className="btn-secondary !h-8 !px-2 text-xs" onClick={() => changeAmendmentStatus(a.id, 'ACTIVE')}>Activer</button>}
                        {canUpdate && a.status !== 'CANCELLED' && <button className="btn-secondary !h-8 !px-2 text-xs text-red-600" onClick={() => changeAmendmentStatus(a.id, 'CANCELLED')}>Annuler</button>}
                        {canDelete && <button className="btn-secondary !h-8 !px-2 text-xs text-red-600" onClick={() => deleteAmendment(a.id)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>

    <Modal title={`Documents - ${selectedContract?.number ?? ''}`} open={documentsOpen} onClose={() => setDocumentsOpen(false)}>
      <div className="space-y-4">
        {canDocumentsGenerate && (
          <form onSubmit={generateDocument} className="rounded border p-3 space-y-3">
            <h3 className="font-semibold">Generer un document</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="label">Type</span><select className="field" value={documentForm.type} onChange={(e) => setDocumentForm((f) => ({ ...f, type: e.target.value as GeneratedDocumentType }))}>{documentTypes.map((v)=><option key={v}>{v}</option>)}</select></label>
              {documentForm.type === 'AMENDMENT' && (
                <label><span className="label">Avenant</span><select required className="field" value={documentForm.amendmentId} onChange={(e) => setDocumentForm((f) => ({ ...f, amendmentId: e.target.value }))}><option value="">Selectionner</option>{amendments.map((a)=><option key={a.id} value={a.id}>{a.type} - {a.status}</option>)}</select></label>
              )}
              {(documentForm.type === 'ATTESTATION' || documentForm.type === 'GREEN_CARD') && (
                <label><span className="label">Vehicule</span><select required className="field" value={documentForm.vehicleId} onChange={(e) => setDocumentForm((f) => ({ ...f, vehicleId: e.target.value }))}><option value="">Selectionner</option>{vehicles.map((v)=><option key={v.id} value={v.id}>{v.registrationNumber} - {v.make} {v.model}</option>)}</select></label>
              )}
            </div>
            <div className="flex justify-end"><button className="btn-primary" disabled={documentGenerating}>{documentGenerating ? 'Generation...' : 'Generer'}</button></div>
          </form>
        )}
        <div className="max-h-96 overflow-auto">
          {documents.length === 0 ? <p className="text-sm text-slate-500">Aucun document genere.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className="p-2 text-left">Type</th><th className="p-2 text-left">Date</th><th className="p-2"></th></tr></thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="p-2">{d.type}</td>
                    <td className="p-2">{new Date(d.createdAt).toLocaleString('fr-TN')}</td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-end">
                        <button className="btn-secondary !h-8 !px-2 text-xs" onClick={() => downloadDocument(d)}>Telecharger</button>
                        {canDelete && <button className="btn-secondary !h-8 !px-2 text-xs text-red-600" onClick={() => deleteDocument(d.id)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  </>;
}
