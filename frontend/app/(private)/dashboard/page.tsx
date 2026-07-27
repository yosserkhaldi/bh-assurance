'use client';
import { Building2, Car, ClipboardCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

type Stats = { totals: { establishments: number; contracts: number; vehicles: number; expired: number }; expiringSoon: Array<{ id: string; number: string; endDate: string; establishment: { businessName: string } }>; byStatus: Array<{ status: string; _count: number }> };
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { void api.get('/dashboard/statistics').then((r) => setStats(r.data)); }, []);
  const cards = [
    ['Etablissements', stats?.totals.establishments ?? 0, Building2, 'text-cyan'],
    ['Contrats', stats?.totals.contracts ?? 0, ClipboardCheck, 'text-blue-600'],
    ['Vehicules', stats?.totals.vehicles ?? 0, Car, 'text-emerald-600'],
    ['Contrats expires', stats?.totals.expired ?? 0, TriangleAlert, 'text-red-600'],
  ] as const;
  return <><PageHeader title="Tableau de bord" description="Vue consolidee du portefeuille assure" />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, color]) => <article key={label} className="panel flex items-center justify-between p-5"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-navy">{value}</p></div><Icon className={color} size={30} /></article>)}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <article className="panel p-5"><h2 className="mb-5 font-bold text-navy">Repartition des contrats</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats?.byStatus ?? []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="_count" fill="#00a6b2" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
      <article className="panel p-5"><h2 className="mb-4 font-bold text-navy">Echeances sous 30 jours</h2><div className="divide-y">{stats?.expiringSoon.length ? stats.expiringSoon.map((c) => <div key={c.id} className="py-3"><div className="flex justify-between gap-3"><p className="font-semibold">{c.number}</p><time className="text-sm text-amber-700">{new Date(c.endDate).toLocaleDateString('fr-TN')}</time></div><p className="mt-1 text-sm text-slate-500">{c.establishment.businessName}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">Aucune echeance proche</p>}</div></article>
    </section></>;
}
