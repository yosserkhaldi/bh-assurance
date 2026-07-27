'use client';
import { BellRing, Check, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

interface Notification { id: string; title: string; message: string; type: string; readAt: string | null; createdAt: string }
export default function NotificationsPage() {
  const [items,setItems]=useState<Notification[]>([]);
  const load=()=>api.get('/notifications').then(r=>setItems(r.data));
  useEffect(()=>{void load();},[]);
  const generate=async()=>{await api.post('/notifications/generate');await load();};
  const read=async(id:string)=>{await api.patch(`/notifications/${id}/read`);await load();};
  return <><PageHeader title="Notifications" description="Alertes liees aux echeances des contrats" action={<button className="btn-primary" onClick={generate}><RefreshCw size={18}/>Actualiser les echeances</button>}/><section className="panel divide-y">{items.length?items.map(n=><article key={n.id} className={`flex gap-4 p-5 ${n.readAt?'opacity-60':''}`}><BellRing className={n.type==='WARNING'?'text-amber-600':'text-cyan'} size={21}/><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-navy">{n.title}</h2><time className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString('fr-TN')}</time></div><p className="mt-1 text-sm text-slate-600">{n.message}</p></div>{!n.readAt&&<button title="Marquer comme lue" className="btn-secondary !h-9 !px-2" onClick={()=>read(n.id)}><Check size={16}/></button>}</article>):<p className="p-12 text-center text-slate-500">Aucune notification</p>}</section></>;
}
