'use client';

import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';

export default function ImportsPage() {
  const { can } = useCan();
  const canImportEstablishments = can(Permission.IMPORTS_IMPORT_ESTABLISHMENTS);
  const canImportTarification = can(Permission.IMPORTS_IMPORT_TARIFICATION);
  const canExportSi = can(Permission.IMPORTS_EXPORT_SI);
  const establishmentsRef = useRef<HTMLInputElement>(null);
  const tarificationRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const importEstablishments = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await api.post<Record<string, number>>('/imports/establishments', body);
      setResult(response.data);
      setMessage('Import des établissements terminé.');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err.response?.data?.message || 'Erreur lors de l\'import.');
    } finally {
      setLoading(false);
    }
  };

  const importTarification = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await api.post<Record<string, number>>('/imports/tarification', body);
      setResult(response.data);
      setMessage('Import de la base tarifiaire terminé.');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err.response?.data?.message || 'Erreur lors de l\'import.');
    } finally {
      setLoading(false);
    }
  };

  const exportSi = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/imports/export-si', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_injection_SI.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Export SI téléchargé.');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err.response?.data?.message || 'Erreur lors de l\'export.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Imports / Export SI" description="Importer les fichiers Excel et generer le fichier d injection SI" />

      <div className="grid gap-6 lg:grid-cols-3">
        {canImportEstablishments && (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-2 font-semibold text-slate-800">1. Importer les etablissements</h3>
            <p className="mb-4 text-sm text-slate-500">Fichier : liste des etablissements.xlsx</p>
            <input ref={establishmentsRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void importEstablishments(e.target.files?.[0])} />
            <button className="btn-secondary w-full" disabled={loading} onClick={() => establishmentsRef.current?.click()}>
              <Upload size={18} /> Choisir le fichier
            </button>
          </div>
        )}

        {canImportTarification && (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-2 font-semibold text-slate-800">2. Importer la base tarifiaire</h3>
            <p className="mb-4 text-sm text-slate-500">Fichier : tarification_template.xlsx</p>
            <input ref={tarificationRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void importTarification(e.target.files?.[0])} />
            <button className="btn-secondary w-full" disabled={loading} onClick={() => tarificationRef.current?.click()}>
              <Upload size={18} /> Choisir le fichier
            </button>
          </div>
        )}

        {canExportSi && (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-2 font-semibold text-slate-800">3. Exporter pour le SI</h3>
            <p className="mb-4 text-sm text-slate-500">Generer template_injection_SI.xlsx</p>
            <button className="btn-primary w-full" disabled={loading} onClick={() => void exportSi()}>
              <Download size={18} /> Telecharger l export SI
            </button>
          </div>
        )}

        {!canImportEstablishments && !canImportTarification && !canExportSi && (
          <p className="col-span-full text-sm text-slate-500">Vous n avez acces a aucune fonction d import / export.</p>
        )}
      </div>

      {(message || result) && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h4 className="mb-2 font-semibold text-slate-800">Résultat</h4>
          {message && <p className="text-sm text-slate-700">{message}</p>}
          {result && (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(result).map(([key, value]) => (
                <li key={key} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">{key}:</span>{' '}
                  <span className="font-semibold text-slate-800">{value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
