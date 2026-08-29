'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Bot, CheckCircle, Copy, MessageSquarePlus, Send, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table';

import { PageHeader } from '@/components/page-header';
import { useCan } from '@/hooks/use-can';
import { usePaginated } from '@/hooks/use-paginated';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { User } from '@/types';

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

function getStorageKey(userId: string): string {
  return `bh-agent-conversations-${userId}`;
}

function loadConversations(userId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConversations(userId: string, conversations: Conversation[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(conversations));
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function conversationTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (firstUser) return firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '');
  return 'Nouvelle conversation';
}

export default function UsersPage() {
  const { can } = useCan();
  const canCreate = can(Permission.USERS_CREATE);
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
    if (userId) {
      setConversations(loadConversations(userId));
    }
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
      saveConversations(currentUserId, next);
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

  const deleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentUserId) return;
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConversations(currentUserId, next);
      return next;
    });
    if (currentSessionId === id) {
      startNewConversation();
    }
  };

  const sendChatMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const now = Date.now();
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
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err.response as { data?: { message?: string } })?.data?.message ||
            'Une erreur est survenue.'
          : 'Une erreur est survenue.';
      setMessages((prev) => [...prev, { role: 'agent', content: message, isError: true, createdAt: Date.now() }]);
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
        cell: ({ row }) =>
          canDelete ? (
            <button
              className="icon-btn text-red-600 hover:bg-red-50"
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

      {/* Agent chat panel */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => setChatOpen(false)}
        >
          <section
            className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl sm:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Conversations sidebar */}
            <aside className="flex h-32 flex-col border-b bg-slate-50 sm:h-full sm:w-64 sm:border-b-0 sm:border-r">
              <div className="flex items-center justify-between border-b p-3">
                <h3 className="text-sm font-semibold text-navy">Conversations</h3>
                <button
                  onClick={startNewConversation}
                  className="grid h-7 w-7 place-items-center rounded bg-cyan text-white hover:bg-cyan-600"
                  title="Nouvelle conversation"
                  aria-label="Nouvelle conversation"
                >
                  <MessageSquarePlus size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {conversations.length === 0 ? (
                  <p className="px-2 py-4 text-xs text-slate-400">Aucune conversation</p>
                ) : (
                  <ul className="space-y-1">
                    {conversations
                      .slice()
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .map((conv) => (
                        <li
                          key={conv.id}
                          onClick={() => selectConversation(conv.id)}
                          className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-xs ${
                            conv.id === currentSessionId
                              ? 'bg-cyan/10 text-cyan-700'
                              : 'hover:bg-slate-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{conv.title || 'Nouvelle conversation'}</p>
                            <p className="truncate text-[10px] text-slate-400">
                              {new Date(conv.updatedAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteConversation(e, conv.id)}
                            className="ml-1 grid h-6 w-6 place-items-center rounded text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </aside>

            {/* Active chat */}
            <div className="flex flex-1 flex-col">
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
            </div>
          </section>
        </div>
      )}
    </>
  );
}
