'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

interface Log { id:string; action:string; entity:string; entityId?:string; createdAt:string; user?:{email:string} }
export default function AuditLogsPage(){
  const[logs,setLogs]=useState<Log[]>([]);
  useEffect(()=>{void api.get('/audit-logs').then(r=>setLogs(r.data));},[]);
  return <><PageHeader title="Journal d’audit" description="Traces des operations sensibles"/><div className="panel overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Utilisateur</th><th className="p-4">Action</th><th className="p-4">Entite</th><th className="p-4">Identifiant</th></tr></thead><tbody className="divide-y">{logs.map(l=><tr key={l.id}><td className="p-4">{new Date(l.createdAt).toLocaleString('fr-TN')}</td><td className="p-4">{l.user?.email??'Systeme'}</td><td className="p-4 font-semibold">{l.action}</td><td className="p-4">{l.entity}</td><td className="p-4 font-mono text-xs">{l.entityId??'—'}</td></tr>)}</tbody></table>{!logs.length&&<p className="p-12 text-center text-slate-500">Aucune trace enregistree</p>}</div></>;
}
