import Image from 'next/image';
import { Headphones, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <header className="flex h-[76px] items-center justify-between border-b border-slate-200 px-5 sm:px-8 lg:px-12">
        <BrandLogo className="w-52 sm:w-64" />
        <div className="hidden items-center gap-5 text-sm font-medium text-navy sm:flex">
          <span>Espace collaborateurs</span>
          <span className="h-6 w-px bg-slate-200" />
          <a href="mailto:support.it@bhassurance.tn" className="flex items-center gap-2 transition hover:text-red-600">
            <Headphones size={18} /> Support IT
          </a>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-76px)] max-w-[1500px] lg:grid-cols-[minmax(440px,0.9fr)_1.1fr]">
        <section className="flex items-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-[510px]">{children}</div>
        </section>
        <aside className="relative hidden min-h-[680px] items-center justify-center overflow-hidden bg-[#f7f9fc] lg:flex">
          <div className="absolute inset-y-0 left-0 w-px bg-slate-100" />
          <Image
            src="/images/employee-portal-illustration.png"
            alt="Illustration de l’espace de gestion sécurisé BH Assurance"
            width={1400}
            height={1000}
            priority
            className="h-auto w-[94%] object-contain"
          />
          <div className="absolute bottom-8 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
            <ShieldCheck size={16} className="text-navy" /> Accès sécurisé · Réservé aux collaborateurs
          </div>
        </aside>
      </div>
    </main>
  );
}
