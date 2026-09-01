'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Bot, CalendarDays, CheckCircle, Copy, MessageSquarePlus, Mic, Pencil, Plus, Send, Sparkles, Trash2, UserRound, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table';

import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { useSpeech } from '@/hooks/use-speech';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { User, Role } from '@/types';

const WELCOME_MESSAGE =
  "Bonjour ! Je peux créer un compte employé pour vous. Donnez-moi l'email, le prénom, le nom et le rôle (MANAGER ou VIEWER).";

type ChatMessage = {
  role: 'user' | 'agent';
  content: string;
  temporaryPassword?: string;
  isError?: boolean;
  createdAt: number;
};

type ChatResponse =
  | { sessionId: string; type: 'talk'; message: string }
  | { sessionId: string; type: 'success'; message: string; temporaryPassword: string }
  | { sessionId: string; type: 'error'; message: string };

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed?.id || null;
  } catch {
    return null;
  }
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function containsSensitiveInfo(text: string): boolean {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const passwordPattern = /Mot de passe temporaire|Vos identifiants|votre mot de passe|mot de passe temporaire/i;
  return emailPattern.test(text) || passwordPattern.test(text);
}

function conversationTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (firstUser) return firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '');
  return 'Nouvelle conversation';
}

export default function UsersPage() {
  const { can } = useCan();
  const canCreate = can(Permission.USERS_CREATE);
  const canUpdate = can(Permission.USERS_UPDATE);
  const canDelete = can(Permission.USERS_DELETE);

  const list = usePaginated<User>('/users');

  // Agent chat panel
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCopied, setChatCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', role: 'VIEWER' as Role, status: 'ACTIVE' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const interimTranscriptRef = useRef('');
  const { supported: speechSupported, listen, speak, cancel } = useSpeech();

  useEffect(() => {
    try {
      setVoiceMode(localStorage.getItem('bh-agent-voice-mode') === 'true');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bh-agent-voice-mode', String(voiceMode));
    } catch {
      // ignore
    }
  }, [voiceMode]);

  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
    if (!userId) return;

    api
      .get<Array<{ id: string; title: string; updatedAt: string; messages: ChatMessage[] }>>('/agent/chat/sessions')
      .then(({ data }) => {
        setConversations(
          data.map((s) => ({
            ...s,
            updatedAt: new Date(s.updatedAt).getTime(),
            messages: (s.messages || []).map((m, idx) => ({ ...m, createdAt: Date.now() - (s.messages.length - idx) * 1000 })),
          })),
        );
      })
      .catch(() => {
        setConversations([]);
      });
  }, []);

  const chatInitializedRef = useRef(false);

  useEffect(() => {
    if (chatOpen && !chatInitializedRef.current) {
      chatInitializedRef.current = true;
      startNewConversation();
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!currentSessionId || !currentUserId) return;
    setConversations((prev) => {
      const next = prev
        .map((c) => (c.id === currentSessionId ? { ...c, messages, updatedAt: Date.now(), title: conversationTitle(messages) } : c))
        .filter((c) => c.messages.length > 0);
      if (!next.find((c) => c.id === currentSessionId) && messages.length > 0) {
        next.unshift({
          id: currentSessionId,
          title: conversationTitle(messages),
          updatedAt: Date.now(),
          messages,
        });
      }
      return next;
    });
  }, [messages, currentSessionId, currentUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = () => {
    const id = generateSessionId();
    setCurrentSessionId(id);
    setMessages([{ role: 'agent', content: WELCOME_MESSAGE, createdAt: Date.now() }]);
    setChatInput('');
  };

  const selectConversation = (id: string) => {
    if (id === currentSessionId) return;
    setCurrentSessionId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setMessages([...conv.messages]);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/agent/chat/sessions/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentSessionId === id) {
        startNewConversation();
      }
    } catch {
      // ignore
    }
  };

  const sendChatMessage = async (e?: React.FormEvent | string) => {
    if (typeof e !== 'string' && e?.preventDefault) {
      e.preventDefault();
    }
    const text = (typeof e === 'string' ? e : chatInput).trim();
    if (!text || chatLoading) return;

    const now = Date.now();
    cancel();

    const userMessage: ChatMessage = { role: 'user', content: text, createdAt: now };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data } = await api.post<ChatResponse>('/agent/chat', { message: text, sessionId: currentSessionId });
      setCurrentSessionId(data.sessionId);
      const agentMessage: ChatMessage = {
        role: 'agent',
        content: data.message,
        isError: data.type === 'error',
        temporaryPassword:
          data.type === 'success' ? data.temporaryPassword : undefined,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, agentMessage]);

      if (data.type === 'success') {
        await list.reload();
      }

      if (voiceMode && !containsSensitiveInfo(data.message) && data.type !== 'success') {
        speak(data.message);
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err.response as { data?: { message?: string } })?.data?.message ||
            'Une erreur est survenue.'
          : 'Une erreur est survenue.';
      setMessages((prev) => [...prev, { role: 'agent', content: message, isError: true, createdAt: Date.now() }]);

      if (voiceMode && !containsSensitiveInfo(message)) {
        speak(message);
      }
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const startRecording = () => {
    if (!speechSupported || recordingRef.current) return;
    recordingRef.current = true;
    setRecording(true);
    interimTranscriptRef.current = '';
    cancel();

    listen((text) => {
      interimTranscriptRef.current = text;
      setChatInput(text);
    })
      .then((finalText) => {
        recordingRef.current = false;
        setRecording(false);
        if (finalText) {
          setChatInput(finalText);
        } else {
          setChatInput('');
        }
      })
      .catch(() => {
        recordingRef.current = false;
        setRecording(false);
        setChatInput('');
      });
  };

  const stopRecording = () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
  };

  const copyChatPassword = async (password: string) => {
    await navigator.clipboard.writeText(password);
    setChatCopied(true);
    setTimeout(() => setChatCopied(false), 2000);
  };

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
      { accessorKey: 'status', header: 'Statut', cell: ({ row }) => <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{row.original.status}</span> },
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
        action={
          canCreate ? (
            <button className="btn-primary" onClick={() => setChatOpen(true)}>
              <Bot size={18} />
              Agent BH 🤖
            </button>
          ) : undefined
        }
      />
      <DataTable {...list} columns={columns} onSearch={list.setSearch} onPage={list.setPage} />

      {/* Agent workspace */}
      {chatOpen && (
        <section className="fixed inset-0 z-50 flex min-h-0 bg-white lg:left-[272px] lg:z-30" role="dialog" aria-modal="true" aria-label="Assistant BH">
          <aside className="hidden w-[286px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
            <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
              <div className="flex items-center gap-2.5 text-navy"><Bot size={20} /><h2 className="font-bold">Assistant BH</h2></div>
              <button onClick={startNewConversation} className="icon-btn" title="Nouvelle conversation" aria-label="Nouvelle conversation"><MessageSquarePlus size={18} /></button>
            </div>
            <div className="p-4">
              <button onClick={startNewConversation} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-brandRed transition hover:border-red-200 hover:bg-red-50"><Plus size={17} /> Nouvelle conversation</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-5">
              <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Conversations</p>
              {conversations.length === 0 ? <p className="px-2 py-6 text-sm text-slate-400">Aucune conversation enregistrée</p> : (
                <ul className="space-y-1">
                  {conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt).map((conv) => (
                    <li key={conv.id}>
                      <button onClick={() => selectConversation(conv.id)} className={`group flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left transition ${conv.id === currentSessionId ? 'bg-blue-50 text-navy' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{conv.title || 'Nouvelle conversation'}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(conv.updatedAt).toLocaleString('fr-TN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                        <span onClick={(e) => deleteConversation(e, conv.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" role="button" aria-label="Supprimer la conversation"><Trash2 size={13} /></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-4 text-xs text-slate-500"><CalendarDays size={15} />{new Date().toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-white">
            <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-4 md:px-8">
              <div className="flex items-center gap-3 md:hidden"><Bot size={20} className="text-navy" /><h2 className="font-bold text-navy">Assistant BH</h2></div>
              <div className="hidden md:block"><p className="text-sm font-semibold text-navy">Espace de gestion assistée</p><p className="mt-0.5 text-xs text-slate-500">Créez et gérez les comptes collaborateurs en toute sécurité</p></div>
              <div className="flex items-center gap-2">
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceMode) cancel();
                      setVoiceMode((v) => !v);
                    }}
                    className={`icon-btn border transition ${voiceMode ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
                    title={voiceMode ? 'Arrêter le mode vocal' : 'Démarrer le mode vocal'}
                    aria-label={voiceMode ? 'Arrêter le mode vocal' : 'Démarrer le mode vocal'}
                  >
                    {voiceMode ? <Volume2 size={19} /> : <VolumeX size={19} />}
                  </button>
                )}
                <button onClick={() => setChatOpen(false)} className="icon-btn border border-slate-200" aria-label="Fermer l’assistant"><X size={19} /></button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-6 md:px-8 md:py-8">
                <div className="flex-1 space-y-6">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'agent' && <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-white"><Bot size={17} /></div>}
                      <div className={`max-w-[780px] ${msg.role === 'user' ? 'rounded-xl bg-blue-50 px-5 py-4 text-navy' : ''}`}>
                        <p className={`whitespace-pre-wrap text-sm leading-6 ${msg.isError ? 'text-red-700' : 'text-slate-700'}`}>{msg.content}</p>
                        <time className="mt-1.5 block text-right text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</time>
                        {msg.temporaryPassword && (
                          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mot de passe temporaire</p>
                            <div className="mt-2 flex items-center gap-2"><code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-navy">{msg.temporaryPassword}</code><button type="button" onClick={() => copyChatPassword(msg.temporaryPassword!)} className="icon-btn border border-slate-200 bg-white" title="Copier">{chatCopied ? <CheckCircle size={16} className="text-emerald-600" /> : <Copy size={16} />}</button></div>
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-navy"><UserRound size={17} /></div>}
                    </div>
                  ))}
                  {chatLoading && <div className="flex items-center gap-3 text-sm text-slate-500"><div className="grid h-9 w-9 place-items-center rounded-full bg-navy text-white"><Bot size={17} /></div><span>L&apos;agent prépare sa réponse…</span></div>}
                  <div ref={chatEndRef} />
                </div>
                <div className="sticky bottom-0 mt-8 bg-white pb-1 pt-4">
                  <p className="mb-3 text-sm font-semibold text-navy">Que souhaitez-vous faire ?</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {["Créer un utilisateur", "Modifier un utilisateur", "Désactiver un utilisateur", "Inspecter un utilisateur"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setChatInput(suggestion)} className="rounded-full border border-navy/70 bg-white px-4 py-2 text-xs font-semibold text-navy transition hover:bg-blue-50">{suggestion}</button>)}
                  </div>
                  <form onSubmit={sendChatMessage} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgba(15,42,82,0.08)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
                    <Sparkles size={18} className="ml-2 shrink-0 text-navy" />
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={recording ? 'Parlez maintenant...' : 'Tapez votre message…'}
                      className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      disabled={chatLoading || recording}
                      autoFocus
                    />
                    {speechSupported && (
                      <button
                        type="button"
                        onPointerDown={startRecording}
                        onPointerUp={stopRecording}
                        onPointerLeave={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        disabled={chatLoading}
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        title="Maintenez pour parler"
                        aria-label="Maintenez pour parler"
                      >
                        <Mic size={17} />
                      </button>
                    )}
                    <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brandRed text-white transition hover:bg-[#c9151c] disabled:cursor-not-allowed disabled:opacity-40" disabled={chatLoading || recording || !chatInput.trim()} aria-label="Envoyer"><Send size={17} /></button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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
