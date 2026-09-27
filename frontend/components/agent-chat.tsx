'use client';

import {
  ArrowLeft,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  MessageSquarePlus,
  Mic,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/hooks/use-auth';
import { useSpeech } from '@/hooks/use-speech';
import { api } from '@/lib/api';

function welcomeMessage(role?: string) {
  if (role === 'ADMIN') return 'Bonjour ! Je peux gérer les utilisateurs et vous assister sur les établissements, contrats et véhicules.';
  if (role === 'MANAGER') return 'Bonjour ! Je peux vous aider à consulter et gérer les établissements, contrats et véhicules. La gestion des utilisateurs reste réservée aux administrateurs.';
  return 'Bonjour ! Je peux rechercher et consulter les établissements, contrats et véhicules. Votre accès est en lecture seule.';
}

type ChatMessage = {
  role: 'user' | 'agent';
  content: string;
  temporaryPassword?: string;
  isError?: boolean;
  createdAt: number;
};

type ChatResponse =
  | { sessionId: string; type: 'talk'; message: string }
  | { sessionId: string; type: 'success'; message: string; temporaryPassword?: string }
  | { sessionId: string; type: 'error'; message: string }
  | { sessionId: string; type: 'confirm_delete'; message: string; email?: string }
  | { sessionId: string; type: 'confirm_update'; message: string; email?: string };

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

type ConversationCategory = 'Tous' | 'Employés' | 'Contrats' | 'Établissements' | 'Véhicules' | 'Autres';

const CONVERSATION_CATEGORIES: ConversationCategory[] = ['Tous', 'Employés', 'Contrats', 'Établissements', 'Véhicules', 'Autres'];

function getConversationCategory(conversation: Conversation): Exclude<ConversationCategory, 'Tous'> {
  const text = `${conversation.title} ${conversation.messages.map((message) => message.content).join(' ')}`.toLocaleLowerCase('fr');
  if (/employ|utilisateur|compte|manager|viewer/.test(text)) return 'Employés';
  if (/contrat|garantie|résili|resili|avenant|remboursement/.test(text)) return 'Contrats';
  if (/établissement|etablissement|agence|siret/.test(text)) return 'Établissements';
  if (/véhicule|vehicule|auto|immatric|flotte/.test(text)) return 'Véhicules';
  return 'Autres';
}

function getDateGroup(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDifference = Math.round((startOfToday - startOfDate) / 86_400_000);
  if (dayDifference === 0) return "Aujourd’hui";
  if (dayDifference === 1) return 'Hier';
  return date.toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const MANAGER_SUGGESTIONS = [
  { label: 'Créer un établissement', icon: Building2 },
  { label: 'Créer un contrat', icon: FileText },
  { label: 'Rechercher', icon: Search },
  { label: 'Aide', icon: CircleHelp },
];

const ADMIN_SUGGESTIONS = [
  { label: 'Créer un utilisateur', icon: UserPlus },
  { label: 'Créer un établissement', icon: Building2 },
  { label: 'Créer un contrat', icon: FileText },
  { label: 'Rechercher', icon: Search },
];

const VIEWER_SUGGESTIONS = [
  { label: 'Rechercher un établissement', icon: Building2 },
  { label: 'Consulter un contrat', icon: FileText },
  { label: 'Rechercher un véhicule', icon: Search },
  { label: 'Aide', icon: CircleHelp },
];

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

export function AgentChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCopied, setChatCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState<ConversationCategory>('Tous');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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
    if (open && !chatInitializedRef.current) {
      chatInitializedRef.current = true;
      const id = generateSessionId();
      setCurrentSessionId(id);
      setMessages([{ role: 'agent', content: welcomeMessage(user?.role), createdAt: Date.now() }]);
      setChatInput('');
      setHistoryOpen(false);
    }
  }, [open, user?.role]);

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
    setMessages([{ role: 'agent', content: welcomeMessage(user?.role), createdAt: Date.now() }]);
    setChatInput('');
    setHistoryOpen(false);
  };

  const selectConversation = (id: string) => {
    if (id === currentSessionId) return;
    setCurrentSessionId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setMessages([...conv.messages]);
    }
    setHistoryOpen(false);
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
        window.dispatchEvent(new CustomEvent('bh:agent-action'));
      }

      const skipVoiceTypes = ['success', 'confirm_update', 'confirm_delete'];
      if (voiceMode && !containsSensitiveInfo(data.message) && !skipVoiceTypes.includes(data.type)) {
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

  const filteredConversations = conversations
    .filter((conversation) => {
      const matchesCategory = historyCategory === 'Tous' || getConversationCategory(conversation) === historyCategory;
      const query = historySearch.trim().toLocaleLowerCase('fr');
      const matchesSearch = !query || conversation.title.toLocaleLowerCase('fr').includes(query);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (!open) return null;

  return (
    <section className="fixed inset-0 z-50 flex min-h-0 bg-[#fcfcfb]" role="dialog" aria-modal="true" aria-label="Assistant BH">
      <aside className={`absolute inset-y-0 left-0 z-40 flex w-[340px] flex-col border-r border-slate-200 bg-[#f8fbff] shadow-xl transition-transform lg:relative lg:z-auto lg:w-[390px] lg:shrink-0 lg:translate-x-0 lg:shadow-none ${historyOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5 text-navy"><Bot size={20} /><h2 className="font-bold">Assistant BH</h2></div>
          <button onClick={startNewConversation} className="icon-btn" title="Nouvelle conversation" aria-label="Nouvelle conversation"><MessageSquarePlus size={18} /></button>
        </div>
        <div className="p-4">
          <button onClick={startNewConversation} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"><Plus size={17} /> Nouvelle discussion</button>
          <label className="mt-3 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-500 focus-within:border-blue-400">
            <Search size={17} />
            <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" placeholder="Rechercher dans l’historique" />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CONVERSATION_CATEGORIES.map((category) => <button key={category} type="button" onClick={() => setHistoryCategory(category)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold ${historyCategory === category ? 'border-blue-200 bg-blue-100 text-navy' : 'border-slate-200 bg-white text-slate-600'}`}>{category}</button>)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-5">
          <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Conversations</p>
          {filteredConversations.length === 0 ? <p className="px-2 py-6 text-sm text-slate-400">Aucune conversation trouvée</p> : (
            <ul className="space-y-1">
              {filteredConversations.map((conv) => (
                <li key={conv.id}>
                  <button onClick={() => selectConversation(conv.id)} className={`group flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left transition ${conv.id === currentSessionId ? 'bg-blue-50 text-navy' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{conv.title || 'Nouvelle conversation'}</p><p className="mt-1 text-[11px] text-slate-400">{getConversationCategory(conv)} · {getDateGroup(conv.updatedAt)} · {new Date(conv.updatedAt).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</p></div>
                    <span onClick={(e) => deleteConversation(e, conv.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" role="button" aria-label="Supprimer la conversation"><Trash2 size={13} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-4 text-xs text-slate-500"><CalendarDays size={15} />{new Date().toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </aside>
      {historyOpen && <button className="absolute inset-0 z-30 bg-slate-950/20 lg:hidden" onClick={() => setHistoryOpen(false)} aria-label="Fermer l’historique" />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fcfcfb]">
        <header className="relative grid h-[84px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200/80 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <BrandLogo className="hidden" />
            <button onClick={onClose} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-navy transition hover:border-blue-200 hover:bg-blue-50/60" aria-label="Fermer l'assistant"><ArrowLeft size={18} /><span className="hidden sm:inline">Retour</span></button>
          </div>
          <div className="flex items-center gap-2 text-navy">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50"><Bot size={18} /></span>
            <h2 className="hidden text-lg font-bold sm:block">Assistant de gestion</h2>
            <h2 className="text-base font-bold sm:hidden">Assistant BH</h2>
          </div>
          <div className="relative flex items-center justify-end gap-2">
            <button onClick={() => setHistoryOpen((open) => !open)} className={`flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition lg:hidden ${historyOpen ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-navy hover:border-blue-200 hover:bg-slate-50'}`} aria-expanded={historyOpen}><Clock3 size={17} /><span className="hidden md:inline">Historique</span></button>
            <div className="hidden h-11 items-center gap-2 px-2 text-sm font-semibold text-navy lg:flex"><Clock3 size={17} />Historique</div>
            {speechSupported && <button type="button" onClick={() => { if (voiceMode) cancel(); setVoiceMode((v) => !v); }} className={`grid h-11 w-11 place-items-center rounded-xl border transition ${voiceMode ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-navy hover:bg-slate-50'}`} title={voiceMode ? 'Arrêter le mode vocal' : 'Démarrer le mode vocal'} aria-label={voiceMode ? 'Arrêter le mode vocal' : 'Démarrer le mode vocal'}>{voiceMode ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>}
            <button type="button" className="hidden h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-navy hover:bg-slate-50 sm:grid" aria-label="Paramètres de l’assistant"><Settings size={18} /></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col px-4 py-8 sm:px-6 sm:py-12">
            <div className="flex-1 space-y-8">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'agent' && <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-white"><Bot size={16} /></div>}
                  <div className={`max-w-[680px] ${msg.role === 'user' ? 'rounded-2xl bg-blue-50 px-5 py-3.5 text-navy' : 'pt-1'}`}>
                    <p className={`whitespace-pre-wrap text-[15px] leading-7 ${msg.isError ? 'text-red-700' : 'text-slate-700'}`}>{msg.content}</p>
                    <time className={`mt-1.5 block text-[10px] text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{new Date(msg.createdAt).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</time>
                    {msg.temporaryPassword && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mot de passe temporaire</p>
                        <div className="mt-2 flex items-center gap-2"><code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-navy">{msg.temporaryPassword}</code><button type="button" onClick={() => copyChatPassword(msg.temporaryPassword!)} className="icon-btn border border-slate-200 bg-white" title="Copier">{chatCopied ? <CheckCircle size={16} className="text-emerald-600" /> : <Copy size={16} />}</button></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && <div className="flex items-center gap-3 text-sm text-slate-500"><div className="grid h-9 w-9 place-items-center rounded-full bg-navy text-white"><Bot size={17} /></div><span>L&apos;agent prépare sa réponse…</span></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="sticky bottom-0 mt-10 bg-[#fcfcfb] pb-4 pt-5">
              <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {(user?.role === 'ADMIN' ? ADMIN_SUGGESTIONS : user?.role === 'VIEWER' ? VIEWER_SUGGESTIONS : MANAGER_SUGGESTIONS).map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setChatInput(label)}
                    aria-pressed={chatInput === label}
                    className={`flex min-h-[48px] items-center justify-center gap-3 rounded-xl border px-3 py-2 text-center transition focus-visible:outline-none ${
                      chatInput === label
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-navy hover:border-blue-200 hover:bg-blue-50/60'
                    }`}
                  >
                    <Icon size={20} className="shrink-0 text-blue-700" aria-hidden="true" />
                    <span className="text-xs font-semibold sm:text-sm">{label}</span>
                  </button>
                ))}
              </div>
              <form onSubmit={sendChatMessage} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_30px_rgba(6,38,80,0.08)] transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
                <div className="flex items-center gap-2">
                  <div className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-navy" aria-hidden="true">
                    <Sparkles size={17} />
                  </div>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={recording ? 'Parlez maintenant...' : 'Tapez votre message…'}
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:!outline-none focus-visible:ring-0"
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
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${recording ? 'animate-pulse bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-navy'}`}
                      title="Maintenez pour parler"
                      aria-label="Maintenez pour parler"
                    >
                      <Mic size={17} />
                    </button>
                  )}
                  <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none" disabled={chatLoading || recording || !chatInput.trim()} aria-label="Envoyer"><Send size={17} /></button>
                </div>
                <div className="flex items-center justify-between px-2 pb-0.5 pt-1.5 text-[10px] text-slate-400">
                  <span>{recording ? 'Enregistrement en cours…' : chatLoading ? 'Réponse en cours…' : 'Assistant sécurisé BH Assurance'}</span>
                  <span className="hidden sm:inline">Entrée pour envoyer</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
