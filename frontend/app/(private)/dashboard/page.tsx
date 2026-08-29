'use client';

import {
  Activity,
  ArrowRight,
  Building2,
  Car,
  ClipboardCheck,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

const CHART_COLORS = ['#175cd3', '#00a6b2', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];



const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creation',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Deconnexion',
  IMPORT: 'Import',
  EXPORT: 'Export',
};

type ExpiringContract = {
  id: string;
  number: string;
  endDate: string;
  establishment: { businessName: string };
};

type ChartItem = { name: string; value: number };

type TopEstablishment = { id: string; businessName: string; contractCount: number };

type RecentActivity = {
  id: string;
  action: string;
  entity: string;
  description?: string;
  createdAt: string;
  userName: string;
};

type Stats = {
  totals: { establishments: number; contracts: number; vehicles: number; expired: number };
  expiringSoon: ExpiringContract[];
  byStatus: ChartItem[];
  byGovernorate: ChartItem[];
  topEstablishments: TopEstablishment[];
  vehiclesByType: ChartItem[];
  recentActivity: RecentActivity[];
};

const actionLabel = (action: string) => AUDIT_ACTION_LABELS[action] ?? action;
const actionColor = (action: string) => {
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

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-navy">{name}</p>
        <p className="text-slate-600">{value} élément(s)</p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void api.get<Stats>('/dashboard/statistics').then((r) => setStats(r.data));
  }, []);

  const cards = useMemo(
    () => [
      ['Établissements', stats?.totals.establishments ?? 0, Building2, 'text-blue-600', 'bg-blue-50'],
      ['Contrats actifs', stats?.totals.contracts ?? 0, ClipboardCheck, 'text-indigo-600', 'bg-indigo-50'],
      ['Véhicules assurés', stats?.totals.vehicles ?? 0, Car, 'text-emerald-600', 'bg-emerald-50'],
      ['Contrats expirés', stats?.totals.expired ?? 0, TriangleAlert, 'text-red-600', 'bg-red-50'],
    ],
    [stats],
  ) as const;

  const contractsByStatus = useMemo(() => stats?.byStatus ?? [], [stats]);

  return (
    <>
      <PageHeader title="Tableau de bord" description="Vue consolidée du portefeuille assuré" />

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, color, surface]) => (
          <article
            key={label}
            className="panel group flex items-center justify-between overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-navy">
                {value.toLocaleString('fr-TN')}
              </p>
            </div>
            <div className={`grid h-12 w-12 place-items-center rounded-xl ${surface}`}>
              <Icon className={color} size={25} />
            </div>
          </article>
        ))}
      </section>

      {/* Main widgets grid */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Répartition des contrats */}
        <article className="panel p-5">
          <div className="mb-5">
            <h2 className="font-bold text-navy">Répartition des contrats</h2>
            <p className="mt-1 text-xs text-slate-500">Portefeuille par statut</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contractsByStatus}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: '#eff6ff' }} />
                <Bar dataKey="value" fill="#175cd3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Répartition par gouvernorat */}
        <article className="panel p-5">
          <div className="mb-5">
            <h2 className="font-bold text-navy">Répartition par gouvernorat</h2>
            <p className="mt-1 text-xs text-slate-500">Top 5 + Autres</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.byGovernorate ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {(stats?.byGovernorate ?? []).map((_, index) => (
                    <Cell key={`cell-gov-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend verticalAlign="bottom" height={30} fontSize={11} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Top établissements */}
        <article className="panel p-5">
          <div className="mb-5">
            <h2 className="font-bold text-navy">Top 5 établissements</h2>
            <p className="mt-1 text-xs text-slate-500">Par nombre de contrats</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.topEstablishments ?? []}
                layout="vertical"
                margin={{ left: 16, right: 16, bottom: 8, top: 8 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="businessName"
                  width={120}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip cursor={{ fill: '#eff6ff' }} />
                <Bar dataKey="contractCount" fill="#00a6b2" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Répartition des véhicules par type */}
        <article className="panel p-5">
          <div className="mb-5">
            <h2 className="font-bold text-navy">Véhicules par type</h2>
            <p className="mt-1 text-xs text-slate-500">Répartition du parc assuré</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.vehiclesByType ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {(stats?.vehiclesByType ?? []).map((_, index) => (
                    <Cell key={`cell-type-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend verticalAlign="bottom" height={30} fontSize={11} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* Bottom row : activity + expiring contracts */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Activité récente */}
        <article className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-navy">Activité récente</h2>
              <p className="mt-1 text-xs text-slate-500">Dernières actions tracées</p>
            </div>
            <Activity size={18} className="text-blue-600" />
          </div>
          <div className="divide-y divide-slate-100 px-5">
            {stats?.recentActivity.length ? (
              stats.recentActivity.map((log) => (
                <div key={log.id} className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${actionColor(log.action)}`}
                      >
                        {actionLabel(log.action)}
                      </span>
                      <span className="text-sm font-semibold text-navy">{log.entity}</span>
                    </div>
                    <time className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString('fr-TN')}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{log.description ?? '—'}</p>
                  <p className="mt-0.5 text-xs text-slate-400">par {log.userName}</p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">Aucune activité récente</p>
            )}
          </div>
        </article>

        {/* Échéances sous 30 jours */}
        <article className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-navy">Échéances sous 30 jours</h2>
              <p className="mt-1 text-xs text-slate-500">Contrats nécessitant une attention</p>
            </div>
            <ArrowRight size={18} className="text-blue-600" />
          </div>
          <div className="divide-y divide-slate-100 px-5">
            {stats?.expiringSoon.length ? (
              stats.expiringSoon.map((c) => (
                <div key={c.id} className="py-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold text-navy">{c.number}</p>
                    <time className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                      {new Date(c.endDate).toLocaleDateString('fr-TN')}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{c.establishment.businessName}</p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">Aucune échéance proche</p>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
