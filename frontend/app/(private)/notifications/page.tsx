'use client';

import { AlertTriangle, BellRing, Check, Info, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';

interface Notification { id: string; title: string; message: string; type: string; readAt: string | null; createdAt: string }

export default function NotificationsPage() {
  const { can } = useCan();
  const canGenerate = can(Permission.NOTIFICATIONS_GENERATE);
  const [items, setItems] = useState<Notification[]>([]);
  const load = () => api.get('/notifications').then((response) => setItems(response.data));
  useEffect(() => { void load(); }, []);
  const generate = async () => { await api.post('/notifications/generate'); await load(); };
  const read = async (id: string) => { await api.patch(`/notifications/${id}/read`); await load(); };

  return <>
    <PageHeader title="Notifications" description="Alertes liées aux échéances des contrats" action={canGenerate ? <button className="btn-primary" onClick={generate}><RefreshCw size={18} />Actualiser les échéances</button> : undefined} />
    <div className="panel mb-5 flex flex-wrap items-center justify-between gap-3 px-5"><div className="flex h-14 items-center gap-7 text-sm font-semibold text-slate-500"><span className="flex h-full items-center border-b-2 border-blue-600 text-navy">Toutes</span><span>Non lues</span><span>Échéances</span><span>Système</span></div><span className="text-sm text-slate-500">{items.filter((item) => !item.readAt).length} non lue(s)</span></div>
    <section className="panel overflow-hidden"><div className="hidden grid-cols-[minmax(0,1fr)_180px_120px_90px] border-b border-slate-200 bg-[#f7f9fc] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid"><span>Notification</span><span>Reçue le</span><span>Niveau</span><span>Action</span></div>
      {items.length ? <div className="divide-y divide-slate-100">{items.map((item) => { const warning = item.type === 'WARNING'; return <article key={item.id} className={`grid gap-4 p-5 transition md:grid-cols-[minmax(0,1fr)_180px_120px_90px] md:items-center ${item.readAt ? 'bg-slate-50/50 opacity-65' : 'hover:bg-blue-50/30'}`}><div className="flex min-w-0 gap-4"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${warning ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{warning ? <AlertTriangle size={20} /> : <Info size={20} />}</div><div className="min-w-0"><h2 className="font-semibold text-navy">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p></div></div><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('fr-TN')}</time><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${warning ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{warning ? 'Avertissement' : 'Information'}</span><div>{!item.readAt ? <button title="Marquer comme lue" className="icon-btn border border-slate-200" onClick={() => read(item.id)}><Check size={16} /></button> : <span className="text-xs font-medium text-emerald-700">Lue</span>}</div></article>; })}</div> : <div className="p-12 text-center"><BellRing className="mx-auto mb-3 text-slate-300" size={30} /><p className="text-slate-500">Aucune notification</p></div>}
    </section>
  </>;
}
