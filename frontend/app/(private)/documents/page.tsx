'use client';

import { FileText, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { Amendment, Contract, GeneratedDocument, GeneratedDocumentType, Vehicle } from '@/types';

const documentTypes: GeneratedDocumentType[] = ['ATTESTATION', 'GREEN_CARD', 'AMENDMENT', 'CONTRACT_SUMMARY'];
const typeLabels: Record<GeneratedDocumentType, string> = {
  ATTESTATION: 'Attestation d\'assurance',
  GREEN_CARD: 'Carte verte',
  AMENDMENT: 'Avenant',
  CONTRACT_SUMMARY: 'Recapitulatif de contrat',
};

export default function DocumentsPage() {
  const { can } = useCan();
  const canGenerate = can(Permission.DOCUMENTS_GENERATE);
  const canDelete = can(Permission.DOCUMENTS_DELETE);

  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState<{ contractId: string; type: GeneratedDocumentType; amendmentId: string; vehicleId: string }>({
    contractId: '',
    type: 'CONTRACT_SUMMARY',
    amendmentId: '',
    vehicleId: '',
  });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const r = await api.get<GeneratedDocument[]>('/documents');
    setDocuments(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const loadContracts = useCallback(async () => {
    const r = await api.get<{ data: Contract[] }>('/contracts?limit=1000');
    setContracts(r.data.data);
  }, []);

  const loadVehiclesAndAmendments = useCallback(async (contractId: string) => {
    const [v, a] = await Promise.all([
      api.get<{ data: Vehicle[] }>(`/vehicles?contractId=${contractId}&limit=1000`),
      api.get<Amendment[]>('/amendments', { params: { contractId } }),
    ]);
    setVehicles(v.data.data);
    setAmendments(a.data);
  }, []);

  const openGenerate = useCallback(async () => {
    setForm({ contractId: '', type: 'CONTRACT_SUMMARY', amendmentId: '', vehicleId: '' });
    setVehicles([]);
    setAmendments([]);
    await loadContracts();
    setOpen(true);
  }, [loadContracts]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contractId) return;
    setGenerating(true);
    await api.post('/documents/generate', {
      contractId: form.contractId,
      type: form.type,
      amendmentId: form.amendmentId || undefined,
      vehicleId: form.vehicleId || undefined,
    });
    setForm({ contractId: '', type: 'CONTRACT_SUMMARY', amendmentId: '', vehicleId: '' });
    setOpen(false);
    await loadDocuments();
    setGenerating(false);
  };

  const download = async (doc: GeneratedDocument) => {
    const r = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    await api.delete(`/documents/${id}`);
    await loadDocuments();
  };

  const selectedContract = useMemo(() => contracts.find((c) => c.id === form.contractId) ?? null, [contracts, form.contractId]);

  useEffect(() => {
    if (form.contractId) {
      void loadVehiclesAndAmendments(form.contractId);
    } else {
      setVehicles([]);
      setAmendments([]);
    }
  }, [form.contractId, loadVehiclesAndAmendments]);

  const rows = useMemo(
    () =>
      documents.map((d) => ({
        id: d.id,
        type: typeLabels[d.type] ?? d.type,
        contract: d.contract?.number ?? d.contractId.slice(0, 8),
        establishment: d.contract?.establishment.businessName ?? '-',
        generatedBy: d.generatedBy ? `${d.generatedBy.firstName} ${d.generatedBy.lastName}` : '-',
        createdAt: new Date(d.createdAt).toLocaleString('fr-TN'),
        raw: d,
      })),
    [documents],
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description="Documents generes pour les contrats"
        action={
          canGenerate ? (
            <button className="btn-primary" onClick={() => void openGenerate()}>
              <Plus size={18} /> Generer un document
            </button>
          ) : undefined
        }
      />

      {loading && documents.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Chargement...</p>
      ) : documents.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Aucun document genere.</p>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-navy">Type</th>
                <th className="p-3 text-left font-semibold text-navy">Contrat</th>
                <th className="p-3 text-left font-semibold text-navy">Etablissement</th>
                <th className="p-3 text-left font-semibold text-navy">Genere par</th>
                <th className="p-3 text-left font-semibold text-navy">Date</th>
                <th className="p-3 text-right font-semibold text-navy">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-3">{row.type}</td>
                  <td className="p-3">{row.contract}</td>
                  <td className="p-3">{row.establishment}</td>
                  <td className="p-3">{row.generatedBy}</td>
                  <td className="p-3">{row.createdAt}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="btn-secondary !h-8 !px-2 text-xs"
                        onClick={() => download(row.raw)}
                        title="Telecharger"
                      >
                        <FileText size={14} />
                      </button>
                      {canDelete && (
                        <button
                          className="btn-secondary !h-8 !px-2 text-xs text-red-600"
                          onClick={() => remove(row.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Generer un document" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={generate} className="space-y-4">
          <div>
            <label className="label">Contrat</label>
            <select
              required
              className="field w-full"
              value={form.contractId}
              onChange={(e) => setForm((f) => ({ ...f, contractId: e.target.value, amendmentId: '', vehicleId: '' }))}
            >
              <option value="">Selectionner un contrat</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number} - {c.establishment.businessName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Type de document</label>
            <select
              required
              className="field w-full"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as GeneratedDocumentType, amendmentId: '', vehicleId: '' }))}
            >
              {documentTypes.map((t) => (
                <option key={t} value={t}>
                  {typeLabels[t]}
                </option>
              ))}
            </select>
          </div>

          {form.type === 'AMENDMENT' && selectedContract && (
            <div>
              <label className="label">Avenant</label>
              <select
                required
                className="field w-full"
                value={form.amendmentId}
                onChange={(e) => setForm((f) => ({ ...f, amendmentId: e.target.value }))}
              >
                <option value="">Selectionner un avenant</option>
                {amendments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type} - {a.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(form.type === 'ATTESTATION' || form.type === 'GREEN_CARD') && selectedContract && (
            <div>
              <label className="label">Vehicule</label>
              <select
                required
                className="field w-full"
                value={form.vehicleId}
                onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
              >
                <option value="">Selectionner un vehicule</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={generating}>
              {generating ? 'Generation...' : 'Generer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
