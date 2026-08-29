import { config } from './config';
import { logger } from './logger';

export interface OnboardingRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  error?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export async function parseOnboardingRequest(textBody: string): Promise<OnboardingRequest> {
  const prompt = [
    'Extrais de cet email la demande de creation de compte employe.',
    'Retourne UNIQUEMENT un JSON valide avec les champs : email, firstName, lastName, role.',
    'role doit etre MANAGER ou VIEWER.',
    "Si une information manque ou n'est pas claire, retourne { error: 'raison' }.",
    '',
    'Email :',
    textBody,
  ].join('\n');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.googleGeminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API error ${response.status}`);
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonString) as OnboardingRequest;

    if (parsed.error) {
      return { error: parsed.error };
    }

    if (!parsed.email || !parsed.firstName || !parsed.lastName || !parsed.role) {
      return { error: 'Informations manquantes dans la reponse du LLM' };
    }

    const normalizedRole = parsed.role.toUpperCase();
    if (normalizedRole !== 'MANAGER' && normalizedRole !== 'VIEWER') {
      return { error: `Role invalide: ${parsed.role}` };
    }

    return {
      email: parsed.email.toLowerCase(),
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      role: normalizedRole,
    };
  } catch (err) {
    logger.error(`LLM parsing error: ${(err as Error).message}`);
    return { error: 'Impossible de parser la reponse du LLM' };
  }
}
