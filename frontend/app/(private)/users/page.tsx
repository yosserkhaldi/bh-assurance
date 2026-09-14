'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { User, Role } from '@/types';

export default function UsersPage() {
  const { can } = useCan();
  const canUpdate = can(Permission.USERS_UPDATE);
  const canDelete = can(Permission.USERS_DELETE);

  const list = usePaginated<User>('/users');

  // Rechargement de la liste quand l'agent (bouton flottant) effectue une action.
  useEffect(() => {
    const handler = () => list.reload();
    window.addEventListener('bh:agent-action', handler);
    return () => window.removeEventListener('bh:agent-action', handler);
  }, [list]);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', role: 'VIEWER' as Role, status: 'ACTIVE' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const openEdit = useCallback((user: User) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      status: (user.status as 'ACTIVE' | 'INACTIVE' | 'LOCKED') || 'ACTIVE',
    });
    setEditError(null);
    setEditLoading(false);
  }, []);

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await api.patch(`/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      await list.reload();
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err.response as { data?: { message?: string } })?.data?.message || 'Une erreur est survenue lors de la modification.'
          : 'Une erreur est survenue lors de la modification.';
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  const remove = useCallback(
    async (id: string) => {
      if (confirm('Desactiver cet utilisateur ?')) {
        await api.delete(`/users/${id}`);
        await list.reload();
      }
    },
    [list],
  );

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'name',
        header: 'Collaborateur',
        cell: ({ row }) => (
          <span className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{row.original.firstName?.[0]}{row.original.lastName?.[0]}</span><span className="font-semibold text-navy">{row.original.firstName} {row.original.lastName}</span></span>
        ),
      },
      { accessorKey: 'email', header: 'E-mail professionnel' },
      { accessorKey: 'role', header: 'Rôle', cell: ({ row }) => <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{row.original.role}</span> },
      { accessorKey: 'status', header: 'Statut', cell: ({ row }) => {
        const s = row.original.status;
        const styles = s === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : s === 'LOCKED' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
        const label = s === 'ACTIVE' ? 'Actif' : s === 'LOCKED' ? 'Verrouillé' : 'Désactivé';
        return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
      } },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {canUpdate && (
              <button
                className="icon-btn text-blue-600 hover:bg-blue-50"
                title="Modifier"
                onClick={() => openEdit(row.original)}
              >
                <Pencil size={16} />
              </button>
            )}
            {canDelete && (
              <button
                className="icon-btn text-red-600 hover:bg-red-50"
                title="Desactiver"
                onClick={() => remove(row.original.id)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate, remove, openEdit],
  );

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Comptes et niveaux d’acces"
      />
      <DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage} />

      {/* Edit user modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Modifier l’utilisateur</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Prénom</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="field w-full"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="field w-full"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Rôle</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="field w-full"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Statut</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="field w-full"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="LOCKED">LOCKED</option>
                </select>
              </div>
              {editError && (
                <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{editError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary"
                  disabled={editLoading}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
