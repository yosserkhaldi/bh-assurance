'use client';

import { Bell, Building2, Car, ChartNoAxesCombined, ClipboardList, FileClock, LogOut, Menu, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const links = [
  { href: '/dashboard', label: 'Tableau de bord', icon: ChartNoAxesCombined },
  { href: '/establishments', label: 'Etablissements', icon: Building2 },
  { href: '/contracts', label: 'Contrats', icon: ClipboardList },
  { href: '/vehicles', label: 'Vehicules', icon: Car },
  { href: '/users', label: 'Utilisateurs', icon: Users, admin: true },
  { href: '/audit-logs', label: 'Journal d’audit', icon: FileClock, admin: true },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  if (!ready || !user) return <div className="grid min-h-screen place-items-center text-slate-500">Chargement...</div>;
  const logout = async () => {
    try { await api.post('/auth/logout'); } finally { localStorage.clear(); router.replace('/login'); }
  };
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      {open && <button aria-label="Fermer le menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-[250px] bg-navy text-white transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/dashboard" className="font-bold">BH <span className="text-cyan">Assurance</span></Link>
          <button className="lg:hidden" aria-label="Fermer" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <nav className="space-y-1 p-3">
          {links.filter((l) => !l.admin || user.role === 'ADMIN').map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white', pathname.startsWith(href) && 'bg-cyan text-white')}>
              <Icon size={19} />{label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <button className="grid h-10 w-10 place-items-center lg:hidden" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu /></button>
          <p className="hidden text-sm font-medium text-slate-500 sm:block">Plateforme interne de gestion</p>
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
