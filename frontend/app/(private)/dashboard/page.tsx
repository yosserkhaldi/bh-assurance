'use client';
import { ArrowRight, Building2, Car, ClipboardCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

type Stats = { totals: { establishments: number; contracts: number; vehicles: number; expired: number }; expiringSoon: Array<{ id: string; number: string; endDate: string; establishment: { businessName: string } }>; byStatus: Array<{ status: string; _count: number }> };
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { void api.get('/dashboard/statistics').then((r) => setStats(r.data)); }, []);
  const cards = [
    ['Établissements', stats?.totals.establishments ?? 0, Building2, 'text-blue-600', 'bg-blue-50'],
    ['Contrats actifs', stats?.totals.contracts ?? 0, ClipboardCheck, 'text-indigo-600', 'bg-indigo-50'],
    ['Véhicules assurés', stats?.totals.vehicles ?? 0, Car, 'text-emerald-600', 'bg-emerald-50'],
    ['Contrats expirés', stats?.totals.expired ?? 0, TriangleAlert, 'text-red-600', 'bg-red-50'],
  ] as const;
  return <><PageHeader title="Tableau de bord" description="Vue consolidée du portefeuille assuré" />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, color, surface]) => <article key={label} className="panel group flex items-center justify-between overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-navy">{value.toLocaleString('fr-TN')}</p></div><div className={`grid h-12 w-12 place-items-center rounded-xl ${surface}`}><Icon className={color} size={25} /></div></article>)}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <article className="panel p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-navy">Répartition des contrats</h2><p className="mt-1 text-xs text-slate-500">Portefeuille par statut</p></div><span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Vue actuelle</span></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats?.byStatus ?? []}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip cursor={{ fill: '#eff6ff' }} /><Bar dataKey="_count" fill="#175cd3" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
      <article className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-bold text-navy">Échéances sous 30 jours</h2><p className="mt-1 text-xs text-slate-500">Contrats nécessitant une attention</p></div><ArrowRight size={18} className="text-blue-600"/></div><div className="divide-y divide-slate-100 px-5">{stats?.expiringSoon.length ? stats.expiringSoon.map((c) => <div key={c.id} className="py-4"><div className="flex justify-between gap-3"><p className="font-semibold text-navy">{c.number}</p><time className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{new Date(c.endDate).toLocaleDateString('fr-TN')}</time></div><p className="mt-1 text-sm text-slate-500">{c.establishment.businessName}</p></div>) : <p className="py-10 text-center text-sm text-slate-500">Aucune échéance proche</p>}</div></article>
    </section></>;
}
