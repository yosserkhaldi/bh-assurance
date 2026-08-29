'use client';

import { Download, FileSpreadsheet, Upload } from 'lucide-react';
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
      <PageHeader title="Imports / Export SI" description="Importer les fichiers Excel et générer le fichier d’injection SI" />

      <div className="panel grid overflow-hidden lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
        {canImportEstablishments && (
          <div className="p-6">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span><h3 className="font-semibold text-navy">Importer les établissements</h3></div>
            <p className="mb-4 text-sm text-slate-500">Fichier attendu : <strong>liste_des_etablissements.xlsx</strong></p>
            <input ref={establishmentsRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void importEstablishments(e.target.files?.[0])} />
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center"><div><Upload className="mx-auto mb-3 text-navy" size={30}/><p className="mb-4 text-sm text-slate-600">Glissez-déposez votre fichier Excel ici</p><button className="btn-secondary" disabled={loading} onClick={() => establishmentsRef.current?.click()}>Choisir un fichier</button></div></div>
          </div>
        )}

        {canImportTarification && (
          <div className="p-6">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">2</span><h3 className="font-semibold text-navy">Importer la base tarifaire</h3></div>
            <p className="mb-4 text-sm text-slate-500">Fichier attendu : <strong>tarification_template.xlsx</strong></p>
            <input ref={tarificationRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void importTarification(e.target.files?.[0])} />
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center"><div><Upload className="mx-auto mb-3 text-navy" size={30}/><p className="mb-4 text-sm text-slate-600">Glissez-déposez votre fichier Excel ici</p><button className="btn-secondary" disabled={loading} onClick={() => tarificationRef.current?.click()}>Choisir un fichier</button></div></div>
          </div>
        )}

        {canExportSi && (
          <div className="p-6">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">3</span><h3 className="font-semibold text-navy">Exporter pour le SI</h3></div>
            <p className="text-sm leading-6 text-slate-500">Générez le fichier d’injection SI à partir des données validées dans le système.</p>
            <div className="grid min-h-48 place-items-center p-5 text-center"><div><FileSpreadsheet className="mx-auto mb-5 text-navy" size={44}/><button className="btn-primary" disabled={loading} onClick={() => void exportSi()}><Download size={18} /> Générer le fichier</button></div></div>
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
