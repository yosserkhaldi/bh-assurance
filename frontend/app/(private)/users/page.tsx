'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Bot, CheckCircle, Copy, Plus, Send, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
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

const WELCOME_MESSAGE =
  "Bonjour ! Je peux créer un compte employé pour vous. Donnez-moi l'email, le prénom, le nom et le rôle (MANAGER ou VIEWER).";

type AgentResult = {
  user: User;
  temporaryPassword: string;
  emailSent?: boolean;
  warning?: string;
};

type ChatMessage = {
  role: 'user' | 'agent';
  content: string;
  temporaryPassword?: string;
  isError?: boolean;
};

type ChatResponse =
  | { type: 'talk'; message: string }
  | { type: 'success'; message: string; temporaryPassword: string }
  | { type: 'error'; message: string };

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

  // Agent chat panel
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', content: WELCOME_MESSAGE },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCopied, setChatCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  const sendChatMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data } = await api.post<ChatResponse>('/agent/chat', { message: text });
      const agentMessage: ChatMessage = {
        role: 'agent',
        content: data.message,
        isError: data.type === 'error',
        temporaryPassword:
          data.type === 'success' ? data.temporaryPassword : undefined,
      };
      setMessages((prev) => [...prev, agentMessage]);

      if (data.type === 'success') {
        await list.reload();
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err.response as { data?: { message?: string } })?.data?.message ||
            'Une erreur est survenue.'
          : 'Une erreur est survenue.';
      setMessages((prev) => [...prev, { role: 'agent', content: message, isError: true }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const copyChatPassword = async (password: string) => {
    await navigator.clipboard.writeText(password);
    setChatCopied(true);
    setTimeout(() => setChatCopied(false), 2000);
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
              <button className="btn-primary" onClick={() => setChatOpen(true)}>
                <Bot size={18} />
                Agent BH 🤖
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

      {/* Agent chat panel */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => setChatOpen(false)}
        >
          <section
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-cyan text-white">
                  <Bot size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-navy">Agent BH</h2>
                  <p className="text-xs text-slate-500">Création de comptes employés</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-none bg-cyan text-white'
                        : `rounded-bl-none ${msg.isError ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-800'}`
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.temporaryPassword && (
                      <div className="mt-3 rounded-md bg-white/90 p-2">
                        <p className="mb-1 text-xs font-medium text-slate-600">
                          Mot de passe temporaire
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
                            {msg.temporaryPassword}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyChatPassword(msg.temporaryPassword!)}
                            className="grid h-7 w-7 place-items-center rounded hover:bg-slate-200"
                            title="Copier"
                          >
                            {chatCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-none bg-slate-100 px-4 py-2 text-sm text-slate-600">
                    L&apos;agent écrit…
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendChatMessage} className="border-t p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tapez votre message…"
                  className="field flex-1"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="btn-primary !h-10 !w-10 !px-0"
                  disabled={chatLoading || !chatInput.trim()}
                  aria-label="Envoyer"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
