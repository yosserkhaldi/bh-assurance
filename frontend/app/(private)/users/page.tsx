'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { User } from '@/types';

const empty = { email: '', password: '', firstName: '', lastName: '', role: 'VIEWER' };
export default function UsersPage() {
  const { can } = useCan();
  const canCreate = can(Permission.USERS_CREATE);
  const canDelete = can(Permission.USERS_DELETE);
  const list = usePaginated<User>('/users'); const [open,setOpen]=useState(false); const [form,setForm]=useState(empty);
  const save=async(e:React.FormEvent)=>{e.preventDefault();await api.post('/users',form);setOpen(false);setForm(empty);await list.reload();};
  const remove=useCallback(async(id:string)=>{if(confirm('Desactiver cet utilisateur ?')){await api.delete(`/users/${id}`);await list.reload();}},[list]);
  const columns=useMemo<ColumnDef<User>[]>(()=>[
    {id:'name',header:'Nom',cell:({row})=><span className="font-semibold">{row.original.firstName} {row.original.lastName}</span>},
    {accessorKey:'email',header:'Email'},{accessorKey:'role',header:'Role'},{accessorKey:'status',header:'Statut'},
    {id:'actions',header:'Actions',cell:({row})=>canDelete ? <button className="btn-secondary !h-9 !px-2 text-red-600" title="Desactiver" onClick={()=>remove(row.original.id)}><Trash2 size={16}/></button> : null},
  ],[canDelete, remove]);
  const set=(key:keyof typeof empty,value:string)=>setForm(f=>({...f,[key]:value}));
  return <><PageHeader title="Utilisateurs" description="Comptes et niveaux d’acces" action={canCreate ? <button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={18}/>Ajouter</button> : undefined}/><DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage}/><Modal title="Nouvel utilisateur" open={open} onClose={()=>setOpen(false)}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">{(['firstName','lastName','email','password'] as const).map(key=><label key={key}><span className="label">{{firstName:'Prenom',lastName:'Nom',email:'Email',password:'Mot de passe'}[key]}</span><input required type={key==='password'?'password':key==='email'?'email':'text'} minLength={key==='password'?8:2} maxLength={key==='password'?72:key==='email'?255:100} pattern={key==='password'?'(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+':undefined} title={key==='password'?'Au moins 8 caracteres avec majuscule, minuscule, chiffre et caractere special':undefined} className="field" value={form[key]} onChange={e=>set(key,e.target.value)}/></label>)}<label><span className="label">Role</span><select className="field" value={form.role} onChange={e=>set('role',e.target.value)}>{['ADMIN','MANAGER','VIEWER'].map(v=><option key={v}>{v}</option>)}</select></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={()=>setOpen(false)}>Annuler</button><button className="btn-primary">Creer</button></div></form></Modal></>;
}
