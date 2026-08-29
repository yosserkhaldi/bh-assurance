'use client';

import { ChevronRight, Info, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

interface Log { id: string; action: string; entity: string; entityId?: string; description?: string | null; createdAt: string; user?: { email: string; firstName: string; lastName: string } }

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => { void api.get('/audit-logs').then((response) => setLogs(response.data)); }, []);
  const userFullName = (log: Log) => {
    if (!log.user) return 'Système';
    const name = `${log.user.firstName ?? ''} ${log.user.lastName ?? ''}`.trim();
    return name || log.user.email;
  };

  const actionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      case 'UPDATE':
        return 'bg-blue-50 text-blue-700 ring-blue-200';
      case 'DELETE':
        return 'bg-red-50 text-red-700 ring-red-200';
      case 'IMPORT':
        return 'bg-amber-50 text-amber-700 ring-amber-200';
      case 'EXPORT':
        return 'bg-purple-50 text-purple-700 ring-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? logs.filter((log) =>
          [log.action, log.entity, log.entityId, log.description, userFullName(log)].some((value) =>
            value?.toLowerCase().includes(query),
          ),
        )
      : logs;
  }, [logs, search]);

  return <>
    <PageHeader title="Journal d’audit" description="Traçabilité des opérations sensibles" />
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"><Info size={18} /><p>Les journaux d’audit sont en lecture seule et conservés pour des raisons de sécurité et de conformité.</p></div>
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div className="relative w-full max-w-sm"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field pl-10" placeholder="Rechercher par identifiant…" aria-label="Rechercher dans le journal" /></div><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><ShieldCheck size={17} className="text-emerald-600" />{visible.length} événements affichés</div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3.5">Date & heure</th><th className="px-5 py-3.5">Utilisateur</th><th className="px-5 py-3.5">Action</th><th className="px-5 py-3.5">Entité</th><th className="px-5 py-3.5">Détail</th><th className="px-5 py-3.5">Résultat</th><th className="px-5 py-3.5" /></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((log) => <tr key={log.id} className="transition hover:bg-blue-50/40"><td className="px-5 py-4 text-slate-600">{new Date(log.createdAt).toLocaleString('fr-TN')}</td><td className="px-5 py-4 font-medium text-navy">{userFullName(log)}</td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 font-mono text-xs font-semibold ring-1 ${actionBadge(log.action)}`}>{log.action}</span></td><td className="px-5 py-4">{log.entity}</td><td className="px-5 py-4 text-slate-600">{log.description ?? log.entityId ?? '—'}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Succès</span></td><td className="px-5 py-4"><ChevronRight size={17} className="text-slate-400" /></td></tr>)}</tbody></table></div>
      {!visible.length && <p className="p-12 text-center text-slate-500">Aucune trace enregistrée</p>}
    </div>
  </>;
}
