import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingService } from '../onboarding/onboarding.service';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

interface ParsedIntent {
  action: 'onboard' | 'update' | 'delete' | 'talk';
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  response?: string;
}

interface SessionState {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  action?: 'onboard' | 'update' | 'delete';
}

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  isError?: boolean;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeRole(role?: string): 'MANAGER' | 'VIEWER' | undefined {
  const r = role?.toUpperCase();
  if (r === 'MANAGER' || r === 'VIEWER') return r;
  return undefined;
}

function normalizeAction(action?: string): ParsedIntent['action'] {
  const a = action?.toLowerCase();
  if (a === 'onboard' || a === 'create' || a === 'add' || a === 'creer' || a === 'ajouter') return 'onboard';
  if (a === 'update' || a === 'modify' || a === 'edit' || a === 'modifier' || a === 'changer') return 'update';
  if (a === 'delete' || a === 'remove' || a === 'supprimer' || a === 'archiver') return 'delete';
  return 'talk';
}

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);
  private readonly sessions = new Map<string, SessionState>();
  private readonly histories = new Map<string, ChatMessage[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly onboarding: OnboardingService,
    private readonly prisma: PrismaService,
  ) {}

  async chat(userId: string, sessionId: string | undefined, message: string) {
    const sid = sessionId || generateSessionId();
    const key = `${userId}:${sid}`;

    let state = this.sessions.get(key) || {};
    let history = this.histories.get(key) || [];
    history.push({ role: 'user', content: message });

    try {
      const parsed = await this.parseIntent(message, history, state);
      state = this.mergeState(state, {
        email: parsed.email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        role: parsed.role,
      });

      if (parsed.action !== 'talk') {
        state.action = parsed.action;
      }

      const missing = this.getMissingFields(state);
      if (missing.length > 0) {
        const reply = parsed.response || this.askForMissing(missing, state);
        this.saveInteraction(key, state, history, reply);
        return { sessionId: sid, type: 'talk', message: reply };
      }

      if (!state.email) {
        const reply = parsed.response || 'Merci de me donner l\'adresse email de l\'employe.';
        this.saveInteraction(key, state, history, reply);
        return { sessionId: sid, type: 'talk', message: reply };
      }

      const normalizedRole = normalizeRole(state.role);
      if (!normalizedRole && state.action === 'onboard') {
        const reply = parsed.response || 'Merci de me preciser le role : MANAGER ou VIEWER ?';
        this.saveInteraction(key, state, history, reply);
        return { sessionId: sid, type: 'talk', message: reply };
      }

      if (state.action === 'delete') {
        return this.handleDelete(userId, state, key, history, sid, parsed.response);
      }

      if (state.action === 'update') {
        return this.handleUpdate(userId, state, key, history, sid, parsed.response);
      }

      return this.handleOnboard(userId, state, key, history, sid, parsed.response);
    } catch (err) {
      this.logger.error(`Agent chat error: ${(err as Error).message}`);
      const userMessage = (err as { response?: { message?: string }; message?: string })?.response?.message || (err as Error).message;
      const reply = userMessage ? `Erreur : ${userMessage}` : 'L\'agent est momentanement indisponible. Veuillez reessayer plus tard.';
      history.push({ role: 'agent', content: reply, isError: true });
      this.histories.set(key, history);
      return { sessionId: sid, type: 'error', message: reply };
    }
  }

  private async handleOnboard(
    userId: string,
    state: SessionState,
    key: string,
    history: ChatMessage[],
    sid: string,
    suggestedReply?: string,
  ) {
    const normalizedRole = normalizeRole(state.role)!;
    const result = await this.onboarding.createUser(
      {
        email: state.email!.toLowerCase(),
        firstName: state.firstName!,
        lastName: state.lastName!,
        role: normalizedRole,
      },
      userId,
    );

    const reply = `Compte cree pour ${result.user.firstName} ${result.user.lastName}. Email envoye a ${result.user.email}. Mot de passe temporaire : ${result.temporaryPassword}`;

    this.saveInteraction(key, {}, history, reply);
    this.sessions.delete(key);
    return {
      sessionId: sid,
      type: 'success',
      message: reply,
      temporaryPassword: result.temporaryPassword,
    };
  }

  private async handleUpdate(
    userId: string,
    state: SessionState,
    key: string,
    history: ChatMessage[],
    sid: string,
    suggestedReply?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { email: state.email!.toLowerCase(), deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    if (!user) throw new NotFoundException('Aucun compte actif trouve avec cet email.');

    const updateData: { firstName?: string; lastName?: string; role?: 'MANAGER' | 'VIEWER' } = {};
    if (state.firstName && state.firstName !== user.firstName) updateData.firstName = state.firstName;
    if (state.lastName && state.lastName !== user.lastName) updateData.lastName = state.lastName;
    if (normalizeRole(state.role) && normalizeRole(state.role) !== user.role) updateData.role = normalizeRole(state.role);

    if (Object.keys(updateData).length === 0) {
      const reply = suggestedReply || `Aucune modification a apporter pour ${user.email}. Que souhaitez-vous changer ?`;
      this.saveInteraction(key, state, history, reply);
      return { sessionId: sid, type: 'talk', message: reply };
    }

    await this.prisma.user.update({ where: { id: user.id }, data: updateData });

    const updated = await this.prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true, role: true } });
    const reply = `Compte mis a jour : ${updated!.firstName} ${updated!.lastName} (${updated!.role}).`;

    this.saveInteraction(key, {}, history, reply);
    this.sessions.delete(key);
    return { sessionId: sid, type: 'success', message: reply };
  }

  private async handleDelete(
    userId: string,
    state: SessionState,
    key: string,
    history: ChatMessage[],
    sid: string,
    suggestedReply?: string,
  ) {
    const email = state.email!.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user) throw new NotFoundException('Aucun compte actif trouve avec cet email.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });

    const reply = `Compte de ${user.firstName} ${user.lastName} (${email}) archive.`;
    this.saveInteraction(key, {}, history, reply);
    this.sessions.delete(key);
    return { sessionId: sid, type: 'success', message: reply };
  }

  private mergeState(current: SessionState, parsed: Partial<SessionState> & { action?: ParsedIntent['action'] }): SessionState {
    return {
      email: parsed.email ?? current.email,
      firstName: parsed.firstName ?? current.firstName,
      lastName: parsed.lastName ?? current.lastName,
      role: normalizeRole(parsed.role ?? current.role),
      action: parsed.action ?? current.action,
    };
  }

  private getMissingFields(state: SessionState): string[] {
    if (state.action === 'delete') {
      return state.email ? [] : ['l\'email'];
    }
    if (state.action === 'update') {
      const missing: string[] = [];
      if (!state.email) missing.push('l\'email');
      if (!state.firstName && !state.lastName && !state.role) {
        missing.push('au moins un champ a modifier (prenom, nom ou role)');
      }
      return missing;
    }
    const missing: string[] = [];
    if (!state.email) missing.push('l\'email');
    if (!state.firstName) missing.push('le prenom');
    if (!state.lastName) missing.push('le nom');
    if (!state.role) missing.push('le role (MANAGER ou VIEWER)');
    return missing;
  }

  private askForMissing(missing: string[], state: SessionState): string {
    if (missing.length === 1) {
      const field = missing[0];
      const options = [
        `Il me manque ${field}.`,
        `J'ai besoin de ${field} pour continuer.`,
        `Pouvez-vous me donner ${field} ?`,
      ];
      return options[Math.floor(Math.random() * options.length)];
    }
    return `Pour avancer, merci de preciser : ${missing.join(', ')}.`;
  }

  private async parseIntent(message: string, history: ChatMessage[], state: SessionState): Promise<ParsedIntent> {
    const apiKey = this.config.get<string>('GOOGLE_GEMINI_API_KEY');
    const fallback = this.fallbackParse(message, state);

    if (!apiKey) {
      return fallback;
    }

    const historyText = history
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'Utilisateur' : 'Agent'} : ${h.content}`)
      .join('\n');

    const prompt = `Tu es un assistant RH intelligent pour BH Assurance. L'administrateur gere des comptes employes (MANAGER ou VIEWER).

Historique recent :
${historyText}

Message actuel : "${message}"

Determine l'intention EXACTE parmi : onboard, update, delete, talk.
- onboard/creer/ajouter : creation d'un compte (besoin de email, prenom, nom, role).
- update/modifier/changer : modification d'un compte existant (besoin de email + les champs a changer : prenom, nom, role).
- delete/supprimer/archiver : suppression d'un compte (besoin uniquement de email).
- talk : question/conversation generale.

Extrais les champs s'ils sont presents dans le message.

Reponds UNIQUEMENT en JSON strict (sans markdown, sans texte autour) :
{"action":"onboard|update|delete|talk","email":"...","firstName":"...","lastName":"...","role":"MANAGER|VIEWER","response":"..."}

response doit etre un message concis et naturel. Si une information manque, pose une question ciblee. Ne repete pas toujours la meme phrase de bienvenue.`;

    try {
      const text = await this.callGemini(prompt);
      const json = JSON.parse(text) as Partial<ParsedIntent>;
      let action = normalizeAction(json.action);

      // On privilegie la detection locale si un verbe d'action est clairement present
      const detected = this.detectAction(message);
      if (detected) {
        action = detected;
      }

      // On fusionne les champs trouves par Gemini et par le fallback regex
      return {
        action,
        email: json.email || fallback.email,
        firstName: json.firstName || fallback.firstName,
        lastName: json.lastName || fallback.lastName,
        role: json.role || fallback.role,
        response: json.response,
      };
    } catch (err) {
      this.logger.warn(`Gemini parsing failed: ${(err as Error).message}`);
      return fallback;
    }
  }

  private fallbackParse(message: string, state: SessionState): ParsedIntent {
    const result: Partial<SessionState> = {};

    // Email
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      result.email = emailMatch[1].toLowerCase();
    }

    // Role
    const roleMatch = message.match(/\b(MANAGER|VIEWER)\b/i);
    if (roleMatch) {
      result.role = normalizeRole(roleMatch[1]);
    }

    // "prenom est X et le nom est Y"
    const explicitNameMatch = message.match(
      /pr[eé]nom\s+(?:est\s+)?([A-Za-zÀ-ÿ\-]+).*?\s(?:le\s+)?nom\s+(?:est\s+)?([A-Za-zÀ-ÿ\-]+)/i,
    );
    if (explicitNameMatch) {
      result.firstName = this.cleanName(explicitNameMatch[1]);
      result.lastName = this.cleanName(explicitNameMatch[2]);
    }

    // "modifier le prenom en X" / "changer le nom en Y"
    const updateFirstNameMatch = message.match(/pr[eé]nom\s+(?:en\s+|a\s+)?([A-Za-zÀ-ÿ\-]+)/i);
    if (updateFirstNameMatch && !result.firstName) {
      result.firstName = this.cleanName(updateFirstNameMatch[1]);
    }
    const updateLastNameMatch = message.match(/\bnom\s+(?:en\s+|a\s+)?([A-Za-zÀ-ÿ\-]+)/i);
    if (updateLastNameMatch && !result.lastName) {
      result.lastName = this.cleanName(updateLastNameMatch[1]);
    }

    // "nom : X, prenom : Y" ou "X Y" apres "pour" / "employe" / "compte"
    if (!result.firstName || !result.lastName) {
      const prepared = message
        .replace(emailMatch?.[0] || '', ' ')
        .replace(roleMatch?.[0] || '', ' ')
        .replace(/[,;:]/g, ' ')
        .replace(/\b(pr[eé]nom\s+(?:est\s+|en\s+|a\s+)?)\b/gi, ' ')
        .replace(/\b(le\s+nom\s+(?:est\s+|en\s+|a\s+)?)\b/gi, ' ');

      const namePattern = /(?:pour|nom|employ[eé]|compte)\s*(?:est|:)?\s*([A-Za-zÀ-ÿ\-]+(?:\s+[A-Za-zÀ-ÿ\-]+)+)/i;
      const nameMatch = prepared.match(namePattern);
      if (nameMatch) {
        const tokens = this.tokenizeNames(nameMatch[1]);
        if (tokens.length >= 2 && (!result.firstName || !result.lastName)) {
          if (!result.firstName) result.firstName = tokens[0];
          if (!result.lastName) result.lastName = tokens.slice(1).join(' ');
        }
      }
    }

    // "Prenom Nom" directement au debut
    if (!result.firstName || !result.lastName) {
      const simpleName = message.match(
        /^\s*([A-Za-zÀ-ÿ\-]+)\s+([A-Za-zÀ-ÿ\-]+(?:\s+[A-Za-zÀ-ÿ\-]+)?)\s*(?:email|r[oô]le|manager|viewer|$)/i,
      );
      if (simpleName) {
        result.firstName = this.cleanName(simpleName[1]);
        result.lastName = this.cleanName(simpleName[2]);
      }
    }

    const action = this.detectAction(message) || state.action || 'talk';
    return {
      action,
      email: result.email || state.email,
      firstName: result.firstName || state.firstName,
      lastName: result.lastName || state.lastName,
      role: result.role || state.role,
    };
  }

  private detectAction(message: string): ParsedIntent['action'] | undefined {
    const lower = message.toLowerCase().trim();
    const firstVerb = lower.match(/^(?:je\s+(?:veux|voudrais|souhaite|vais|dois)\s+)?(supprimer|archiver|delete|remove|modifier|changer|update|edit|mettre\s+a\s+jour|creer|ajouter|onboard|create|add|nouveau)\b/);
    if (firstVerb) {
      const verb = firstVerb[1];
      if (/\b(supprimer|archiver|delete|remove)\b/.test(verb)) return 'delete';
      if (/\b(modifier|changer|update|edit|mettre a jour)\b/.test(verb)) return 'update';
      if (/\b(creer|ajouter|onboard|create|add|nouveau)\b/.test(verb)) return 'onboard';
    }
    // Detection secondaire si un verbe d'action apparait sans ambiguite (pas dans un nom propre isole)
    if (/\b(supprimer|archiver|delete|remove)\b/.test(lower) && !/\bcreer\b/.test(lower)) return 'delete';
    if (/\b(modifier|changer|update|edit|mettre a jour)\b/.test(lower) && !/\bcreer\b/.test(lower)) return 'update';
    if (/\b(creer|ajouter|onboard|create|add|nouveau)\b/.test(lower)) return 'onboard';
    return undefined;
  }

  private cleanName(value: string): string {
    return value
      .replace(/\b(avec|email|r[oô]le|manager|viewer|est|je|suis|un|compte|pour|nom|pr[eé]nom|employ[eé])\b/gi, '')
      .replace(/[,;:]/g, ' ')
      .trim();
  }

  private tokenizeNames(value: string): string[] {
    const cleaned = this.cleanName(value);
    return cleaned.split(/\s+/).filter(Boolean);
  }

  private saveInteraction(key: string, state: SessionState, history: ChatMessage[], reply: string) {
    this.sessions.set(key, state);
    history.push({ role: 'agent', content: reply });
    this.histories.set(key, history);
  }

  private async callGemini(userPrompt: string): Promise<string> {
    const apiKey = this.config.get<string>('GOOGLE_GEMINI_API_KEY');
    const rawModel = this.config.get<string>('GEMINI_MODEL', 'gemini-3.5-flash');
    const model = rawModel.startsWith('gemini-1.5') ? 'gemini-3.5-flash' : rawModel;

    if (!apiKey) {
      throw new BadRequestException('GOOGLE_GEMINI_API_KEY is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API error ${response.status}`);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }
}
