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

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly onboarding: OnboardingService,
  ) {}

  async chat(message: string) {
    try {
      const prompt = this.buildPrompt(message);
      const raw = await this.callGemini(prompt);
      const parsed = this.parseAgentResult(raw);

      if (parsed.action === 'onboard') {
        return this.handleOnboard(parsed);
      }

      return { type: 'talk', message: parsed.response };
    } catch (err) {
      this.logger.error(`Agent chat error: ${(err as Error).message}`);
      return {
        type: 'error',
        message: 'L\'agent de création de compte est momentanément indisponible. Veuillez réessayer plus tard.',
      };
    }
  }

  private buildPrompt(message: string): string {
    return [
      'Tu es un assistant de BH Assurance. Tu aides l\'administrateur à créer des comptes employés.',
      'Réponds UNIQUEMENT avec un JSON valide ayant l\'un des deux formats suivants.',
      '',
      'Si la demande contient toutes les informations nécessaires (email, prénom, nom, rôle MANAGER ou VIEWER) :',
      '{',
      '  "action": "onboard",',
      '  "email": "...",',
      '  "firstName": "...",',
      '  "lastName": "...",',
      '  "role": "MANAGER|VIEWER"',
      '}',
      '',
      'Sinon, si une information manque ou si c\'est une discussion générale :',
      '{',
      '  "action": "talk",',
      '  "response": "..."',
      '}',
      '',
      `Message de l'administrateur : ${message}`,
    ].join('\n');
  }

  private async callGemini(userPrompt: string): Promise<string> {
    const apiKey = this.config.get<string>('GOOGLE_GEMINI_API_KEY');
    const rawModel = this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');
    // Le suffixe `-latest` n'est pas reconnu pour gemini-1.5-flash par l'API v1beta.
    const model = rawModel === 'gemini-1.5-flash-latest' ? 'gemini-1.5-flash' : rawModel;

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
          maxOutputTokens: 500,
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API error ${response.status}`);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  private parseAgentResult(raw: string): GeminiAgentResult {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : raw;
      const parsed = JSON.parse(jsonString) as GeminiAgentResult;

      const action = parsed.action as string;
      if (action !== 'onboard' && action !== 'talk') {
        throw new Error(`Action inconnue: ${action}`);
      }

      return parsed;
    } catch (err) {
      this.logger.error(`Agent response parsing error: ${(err as Error).message}`);
      this.logger.debug(`Raw response: ${raw}`);
      return {
        action: 'talk',
        response: 'Je suis désolé, je n\'ai pas compris. Pouvez-vous reformuler ?',
      };
    }
  }

  private async handleOnboard(parsed: GeminiOnboardResult) {
    const normalizedRole = parsed.role?.toUpperCase();

    if (!parsed.email || !parsed.firstName || !parsed.lastName) {
      return {
        type: 'error',
        message: 'Informations manquantes pour créer le compte (email, prénom ou nom).',
      };
    }

    if (normalizedRole !== 'MANAGER' && normalizedRole !== 'VIEWER') {
      return {
        type: 'error',
        message: `Rôle invalide : ${parsed.role}. Seuls MANAGER et VIEWER sont autorisés.`,
      };
    }

    try {
      const result = await this.onboarding.createUser({
        email: parsed.email.toLowerCase(),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        role: normalizedRole as 'MANAGER' | 'VIEWER',
      });

      return {
        type: 'success',
        message: `Compte créé pour ${result.user.firstName} ${result.user.lastName}. Email envoyé à ${result.user.email}. Mot de passe temporaire : ${result.temporaryPassword}`,
        temporaryPassword: result.temporaryPassword,
      };
    } catch (err) {
      this.logger.error(`Onboarding error: ${(err as Error).message}`);
      return {
        type: 'error',
        message: `Erreur lors de la création du compte : ${(err as Error).message}`,
      };
    }
  }
}
