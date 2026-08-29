import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnboardingService } from '../onboarding/onboarding.service';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

interface GeminiOnboardResult {
  action: 'onboard';
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface GeminiTalkResult {
  action: 'talk';
  response: string;
}

type GeminiAgentResult = GeminiOnboardResult | GeminiTalkResult;

interface SessionState {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
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

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);
  private readonly sessions = new Map<string, SessionState>();
  private readonly histories = new Map<string, ChatMessage[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly onboarding: OnboardingService,
  ) {}

  async chat(userId: string, sessionId: string | undefined, message: string) {
    const sid = sessionId || generateSessionId();
    const key = `${userId}:${sid}`;

    let state = this.sessions.get(key) || {};
    let history = this.histories.get(key) || [];

    history.push({ role: 'user', content: message });
    this.histories.set(key, history);

    try {
      const extracted = this.extractFields(message);
      state = this.mergeState(state, extracted);
      this.sessions.set(key, state);

      const missing = this.getMissingFields(state);
      if (missing.length > 0) {
        const reply = this.askForMissing(missing, state);
        history.push({ role: 'agent', content: reply });
        return { sessionId: sid, type: 'talk', message: reply };
      }

      const normalizedRole = normalizeRole(state.role);
      if (!state.email || !state.firstName || !state.lastName || !normalizedRole) {
        const reply = 'Je suis desole, je n\'ai pas compris. Pouvez-vous reformuler ?';
        history.push({ role: 'agent', content: reply });
        return { sessionId: sid, type: 'talk', message: reply };
      }

      const result = await this.onboarding.createUser({
        email: state.email.toLowerCase(),
        firstName: state.firstName,
        lastName: state.lastName,
        role: normalizedRole,
      });

      const reply = `Compte cree pour ${result.user.firstName} ${result.user.lastName}. Email envoye a ${result.user.email}. Mot de passe temporaire : ${result.temporaryPassword}`;
      history.push({ role: 'agent', content: reply });

      this.sessions.delete(key);

      return {
        sessionId: sid,
        type: 'success',
        message: reply,
        temporaryPassword: result.temporaryPassword,
      };
    } catch (err) {
      this.logger.error(`Agent chat error: ${(err as Error).message}`);
      const userMessage = (err as { response?: { message?: string }; message?: string })?.response?.message || (err as Error).message;
      const reply = userMessage
        ? `Erreur : ${userMessage}`
        : 'L\'agent de creation de compte est momentanement indisponible. Veuillez reessayer plus tard.';
      history.push({ role: 'agent', content: reply, isError: true });
      return { sessionId: sid, type: 'error', message: reply };
    }
  }

  private mergeState(current: SessionState, extracted: Partial<SessionState>): SessionState {
    return {
      email: extracted.email ?? current.email,
      firstName: extracted.firstName ?? current.firstName,
      lastName: extracted.lastName ?? current.lastName,
      role: normalizeRole(extracted.role ?? current.role),
    };
  }

  private getMissingFields(state: SessionState): string[] {
    const missing: string[] = [];
    if (!state.email) missing.push('l\'email');
    if (!state.firstName) missing.push('le prenom');
    if (!state.lastName) missing.push('le nom');
    if (!state.role) missing.push('le role (MANAGER ou VIEWER)');
    return missing;
  }

  private askForMissing(missing: string[], state: SessionState): string {
    if (!state.email) {
      return 'Merci de me donner l\'adresse email de l\'employe.';
    }
    if (!state.firstName || !state.lastName) {
      return 'Merci de me donner le prenom et le nom de l\'employe.';
    }
    if (!state.role) {
      return 'Merci de me preciser le role : MANAGER ou VIEWER ?';
    }
    return `Informations manquantes : ${missing.join(', ')}.`;
  }

  private extractFields(message: string): Partial<SessionState> {
    const result: Partial<SessionState> = {};

    // Email
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      result.email = emailMatch[1].toLowerCase();
    }

    // Role
    const roleMatch = message.match(/\b(MANAGER|VIEWER)\b/i);
    if (roleMatch) {
      const r = normalizeRole(roleMatch[1]);
      if (r) result.role = r;
    }

    // "prenom est X et le nom est Y"
    const explicitNameMatch = message.match(
      /pr[eé]nom\s+(?:est\s+)?([A-Za-zÀ-ÿ\-]+).*?\s(?:le\s+)?nom\s+(?:est\s+)?([A-Za-zÀ-ÿ\-]+)/i,
    );
    if (explicitNameMatch) {
      result.firstName = this.cleanName(explicitNameMatch[1]);
      result.lastName = this.cleanName(explicitNameMatch[2]);
    }

    // "nom : X, prenom : Y" ou "X Y" apres "pour" / "employe" / "compte"
    if (!result.firstName || !result.lastName) {
      const prepared = message
        .replace(emailMatch?.[0] || '', ' ')
        .replace(roleMatch?.[0] || '', ' ')
        .replace(/[,;:]/g, ' ');

      // "pour Yosser Khaldi" ou "nom : Yosser Khaldi"
      const namePattern = /(?:pour|nom|prenom|employ[eé]|compte)\s*(?:est|:)?\s*([A-Za-zÀ-ÿ\-]+(?:\s+[A-Za-zÀ-ÿ\-]+)+)/i;
      const nameMatch = prepared.match(namePattern);
      if (nameMatch) {
        const tokens = this.tokenizeNames(nameMatch[1]);
        if (tokens.length >= 2) {
          result.firstName = tokens[0];
          result.lastName = tokens.slice(1).join(' ');
        }
      }
    }

    // Si l'utilisateur fournit "Prenom Nom" directement au debut
    if (!result.firstName || !result.lastName) {
      const simpleName = message.match(
        /^\s*([A-Za-zÀ-ÿ\-]+)\s+([A-Za-zÀ-ÿ\-]+(?:\s+[A-Za-zÀ-ÿ\-]+)?)\s*(?:email|r[oô]le|manager|viewer|$)/i,
      );
      if (simpleName) {
        result.firstName = this.cleanName(simpleName[1]);
        result.lastName = this.cleanName(simpleName[2]);
      }
    }

    return result;
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

  // Gardé pour les messages ambigus ou conversationnels
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
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API error ${response.status}`);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }
}
