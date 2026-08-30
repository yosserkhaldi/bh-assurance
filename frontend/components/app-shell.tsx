'use client';

import { Bell, Building2, Car, ChartNoAxesCombined, ClipboardList, FileClock, FileText, Import, LogOut, Menu, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import { Permission } from '@/lib/permissions';
import type { Establishment, Contract, Vehicle } from '@/types';
import { BrandLogo } from '@/components/brand-logo';

const links = [
  { href: '/dashboard', label: 'Tableau de bord', icon: ChartNoAxesCombined },
  { href: '/establishments', label: 'Etablissements', icon: Building2, permission: Permission.ESTABLISHMENTS_READ },
  { href: '/contracts', label: 'Contrats', icon: ClipboardList, permission: Permission.CONTRACTS_READ },
  { href: '/documents', label: 'Documents', icon: FileText, permission: Permission.DOCUMENTS_READ },
  { href: '/vehicles', label: 'Vehicules', icon: Car, permission: Permission.VEHICLES_READ },
  { href: '/imports', label: 'Imports / Export SI', icon: Import, permission: Permission.IMPORTS_EXPORT_SI },
  { href: '/users', label: 'Utilisateurs', icon: Users, permission: Permission.USERS_READ },
  { href: '/audit-logs', label: 'Journal d’audit', icon: FileClock, permission: Permission.AUDIT_READ },
  { href: '/notifications', label: 'Notifications', icon: Bell, permission: Permission.NOTIFICATIONS_READ },
];

interface SearchResults {
  establishments: Establishment[];
  contracts: Contract[];
  vehicles: Vehicle[];
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { can } = useCan();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void api.get<AppNotification[]>('/notifications').then((r) => setNotifications(r.data));
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void api.get<SearchResults>('/search', { params: { q: debounced.trim() } }).then((r) => {
      if (!cancelled) setResults(r.data);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') });
    } finally {
      localStorage.clear();
      router.replace('/login');
    }
  };

  const total = (results?.establishments.length ?? 0) + (results?.contracts.length ?? 0) + (results?.vehicles.length ?? 0);

  if (!ready || !user) return <div className="grid min-h-screen place-items-center text-slate-500">Chargement...</div>;

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[272px_1fr]">
      {open && <button aria-label="Fermer le menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-navy text-white shadow-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
          <Link href="/dashboard" className="flex h-12 w-full max-w-[224px] items-center justify-center rounded-xl bg-white px-3 shadow-sm">
            <BrandLogo className="w-full" />
          </Link>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-white hover:bg-white/10 lg:hidden" aria-label="Fermer" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <div className="px-5 pb-2 pt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200/70">Espace collaborateurs</div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.filter((l) => !l.permission || can(l.permission)).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-blue-100/80 transition hover:bg-white/10 hover:text-white', pathname.startsWith(href) && 'bg-white/10 text-white before:absolute before:-left-3 before:h-6 before:w-1 before:rounded-r-full before:bg-brandRed')}>
              <Icon size={19} />{label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs leading-5 text-blue-100/60">Portail interne sécurisé<br/>BH Assurance</div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <button className="grid h-10 w-10 place-items-center lg:hidden" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu /></button>
          <div ref={searchRef} className="relative hidden w-full max-w-md sm:block">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                placeholder="Rechercher un etablissement, contrat ou vehicule..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            {showResults && query.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-panel">
                {loading && <p className="p-3 text-sm text-slate-500">Recherche...</p>}
                {!loading && total === 0 && <p className="p-3 text-sm text-slate-500">Aucun resultat</p>}
                {!loading && results && (
                  <div className="divide-y divide-slate-100">
                    {results.establishments.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-400">Etablissements</p>
                        {results.establishments.map((e) => (
                          <Link key={e.id} href="/establishments" onClick={() => { setShowResults(false); setQuery(''); }} className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                            {e.businessName}
                          </Link>
                        ))}
                      </div>
                    )}
                    {results.contracts.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-400">Contrats</p>
                        {results.contracts.map((c) => (
                          <Link key={c.id} href="/contracts" onClick={() => { setShowResults(false); setQuery(''); }} className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                            {c.number} — {c.establishment.businessName}
                          </Link>
                        ))}
                      </div>
                    )}
                    {results.vehicles.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-400">Vehicules</p>
                        {results.vehicles.map((v) => (
                          <Link key={v.id} href="/vehicles" onClick={() => { setShowResults(false); setQuery(''); }} className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                            {v.registrationNumber} — {v.make} {v.model}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brandRed px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-navy">Notifications</h3>
                    <Link href="/notifications" onClick={() => setNotifOpen(false)} className="text-xs font-medium text-cyan hover:underline">
                      Voir tout
                    </Link>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">Aucune notification</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {notifications.slice(0, 6).map((n) => (
                          <li
                            key={n.id}
                            className={`cursor-pointer px-4 py-3 transition hover:bg-slate-50 ${n.readAt ? 'opacity-60' : 'bg-blue-50/30'}`}
                            onClick={() => {
                              if (!n.readAt) {
                                void api.patch(`/notifications/${n.id}/read`).then(() => {
                                  setNotifications((prev) =>
                                    prev.map((item) => (item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item)),
                                  );
                                });
                              }
                            }}
                          >
                            <p className="text-xs font-semibold text-navy">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-600">{n.message}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString('fr-TN')}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="hidden border-l border-slate-200 pl-4 text-right sm:block"><p className="text-sm font-semibold text-navy">{user.email}</p><p className="text-xs uppercase tracking-wide text-slate-500">{user.role}</p></div>
            <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-red-50 hover:text-red-600" title="Se deconnecter"><LogOut size={19} /></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
