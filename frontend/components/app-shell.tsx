'use client';

import { Bell, Building2, Car, ChartNoAxesCombined, ClipboardList, FileClock, Import, LogOut, Menu, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import { Permission } from '@/lib/permissions';
import type { Establishment, Contract, Vehicle } from '@/types';

const links = [
  { href: '/dashboard', label: 'Tableau de bord', icon: ChartNoAxesCombined },
  { href: '/establishments', label: 'Etablissements', icon: Building2, permission: Permission.ESTABLISHMENTS_READ },
  { href: '/contracts', label: 'Contrats', icon: ClipboardList, permission: Permission.CONTRACTS_READ },
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
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      {open && <button aria-label="Fermer le menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-[250px] bg-navy text-white transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/dashboard" className="font-bold">BH <span className="text-cyan">Assurance</span></Link>
          <button className="lg:hidden" aria-label="Fermer" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <nav className="space-y-1 p-3">
          {links.filter((l) => !l.permission || can(l.permission)).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white', pathname.startsWith(href) && 'bg-cyan text-white')}>
              <Icon size={19} />{label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <button className="grid h-10 w-10 place-items-center lg:hidden" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu /></button>
          <div ref={searchRef} className="relative hidden w-full max-w-md sm:block">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                placeholder="Rechercher un etablissement, contrat ou vehicule..."
                className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
              />
            </div>
            {showResults && query.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-[70vh] overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
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
            <button className="relative grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100" title="Notifications"><Bell size={19} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" /></button>
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.email}</p><p className="text-xs text-slate-500">{user.role}</p></div>
            <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-md text-slate-600 hover:bg-red-50 hover:text-red-600" title="Se deconnecter"><LogOut size={19} /></button>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
