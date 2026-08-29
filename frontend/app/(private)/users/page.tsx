'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Bot, CheckCircle, Copy, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { User } from '@/types';

const emptyManual = { email: '', password: '', firstName: '', lastName: '', role: 'VIEWER' };
const emptyAgent = { email: '', firstName: '', lastName: '', role: 'MANAGER' as const };

type AgentResult = {
  user: User;
  temporaryPassword: string;
  emailSent?: boolean;
  warning?: string;
};

export default function UsersPage() {
  const { can } = useCan();
  const canCreate = can(Permission.USERS_CREATE);
  const canDelete = can(Permission.USERS_DELETE);

  const list = usePaginated<User>('/users');

  // Manual user creation modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(emptyManual);

  // Agent onboarding modal
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentForm, setAgentForm] = useState(emptyAgent);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [copied, setCopied] = useState(false);

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/users', manualForm);
    setManualOpen(false);
    setManualForm(emptyManual);
    await list.reload();
  };

  const submitAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentLoading(true);
    try {
      const { data } = await api.post('/users/onboard', agentForm);
      setAgentResult({
        user: data.user,
        temporaryPassword: data.temporaryPassword,
        emailSent: !data.warning,
        warning: data.warning,
      });
      await list.reload();
    } finally {
      setAgentLoading(false);
    }
  };

  const closeAgent = () => {
    setAgentOpen(false);
    setAgentForm(emptyAgent);
    setAgentResult(null);
  };

  const copyPassword = async () => {
    if (!agentResult) return;
    await navigator.clipboard.writeText(agentResult.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        header: 'Nom',
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.firstName} {row.original.lastName}
          </span>
        ),
      },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'role', header: 'Role' },
      { accessorKey: 'status', header: 'Statut' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) =>
          canDelete ? (
            <button
              className="btn-secondary !h-9 !px-2 text-red-600"
              title="Desactiver"
              onClick={() => remove(row.original.id)}
            >
              <Trash2 size={16} />
            </button>
          ) : null,
      },
    ],
    [canDelete, remove],
  );

  const updateManual = (key: keyof typeof emptyManual, value: string) =>
    setManualForm((f) => ({ ...f, [key]: value }));

  const updateAgent = (key: keyof typeof emptyAgent, value: string) =>
    setAgentForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Comptes et niveaux d’acces"
        action={
          canCreate ? (
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={() => setManualOpen(true)}>
                <Plus size={18} />
                Ajouter
              </button>
              <button className="btn-primary" onClick={() => setAgentOpen(true)}>
                <Bot size={18} />
                Creer un compte employe
              </button>
            </div>
          ) : undefined
        }
      />
      <DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage} />

      {/* Manual creation modal */}
      <Modal title="Nouvel utilisateur" open={manualOpen} onClose={() => setManualOpen(false)}>
        <form onSubmit={saveManual} className="grid gap-4 sm:grid-cols-2">
          {(['firstName', 'lastName', 'email', 'password'] as const).map((key) => (
            <label key={key}>
              <span className="label">
                {{
                  firstName: 'Prenom',
                  lastName: 'Nom',
                  email: 'Email',
                  password: 'Mot de passe',
                }[key]}
              </span>
              <input
                required
                type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
                minLength={key === 'password' ? 8 : 2}
                maxLength={key === 'password' ? 72 : key === 'email' ? 255 : 100}
                pattern={
                  key === 'password'
                    ? '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+'
                    : undefined
                }
                title={
                  key === 'password'
                    ? 'Au moins 8 caracteres avec majuscule, minuscule, chiffre et caractere special'
                    : undefined
                }
                className="field"
                value={manualForm[key]}
                onChange={(e) => updateManual(key, e.target.value)}
              />
            </label>
          ))}
          <label>
            <span className="label">Role</span>
            <select
              className="field"
              value={manualForm.role}
              onChange={(e) => updateManual('role', e.target.value)}
            >
              {['ADMIN', 'MANAGER', 'VIEWER'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn-secondary" onClick={() => setManualOpen(false)}>
              Annuler
            </button>
            <button className="btn-primary">Creer</button>
          </div>
        </form>
      </Modal>

      {/* Agent onboarding modal */}
      <Modal
        title={agentResult ? 'Compte cree' : 'Creer un compte employe'}
        open={agentOpen}
        onClose={closeAgent}
      >
        {agentResult ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle size={20} />
              <p className="font-medium">Utilisateur cree avec succes.</p>
            </div>

            <div className="rounded-md bg-slate-50 p-4 text-sm">
              <p>
                <span className="font-semibold">Email :</span> {agentResult.user.email}
              </p>
              <p>
                <span className="font-semibold">Role :</span> {agentResult.user.role}
              </p>
            </div>

            <div>
              <span className="label">Mot de passe temporaire</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-slate-100 p-2 font-mono text-sm">
                  {agentResult.temporaryPassword}
                </code>
                <button
                  type="button"
                  className="btn-secondary !h-9 !px-2"
                  onClick={copyPassword}
                  title="Copier"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {agentResult.warning ? (
              <p className="text-sm text-amber-600">{agentResult.warning}</p>
            ) : (
              <p className="text-sm text-slate-600">
                Un email contenant les identifiants a ete envoye au nouvel employe.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setAgentResult(null);
                  setAgentForm(emptyAgent);
                }}
              >
                Creer un autre
              </button>
              <button type="button" className="btn-primary" onClick={closeAgent}>
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitAgent} className="grid gap-4 sm:grid-cols-2">
            {(['firstName', 'lastName', 'email'] as const).map((key) => (
              <label key={key}>
                <span className="label">
                  {{
                    firstName: 'Prenom',
                    lastName: 'Nom',
                    email: 'Email',
                  }[key]}
                </span>
                <input
                  required
                  type={key === 'email' ? 'email' : 'text'}
                  minLength={2}
                  maxLength={key === 'email' ? 255 : 100}
                  className="field"
                  value={agentForm[key]}
                  onChange={(e) => updateAgent(key, e.target.value)}
                />
              </label>
            ))}
            <label>
              <span className="label">Role</span>
              <select
                className="field"
                value={agentForm.role}
                onChange={(e) => updateAgent('role', e.target.value)}
              >
                {['MANAGER', 'VIEWER'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={closeAgent}>
                Annuler
              </button>
              <button className="btn-primary" disabled={agentLoading}>
                {agentLoading ? 'Creation...' : 'Creer et envoyer'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
