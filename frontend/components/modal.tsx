'use client';
import { X } from 'lucide-react';

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true"><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white shadow-xl"><header className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-bold text-navy">{title}</h2><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100" aria-label="Fermer"><X size={20} /></button></header><div className="p-5">{children}</div></section></div>;
}
