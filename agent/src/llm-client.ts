import OpenAI from 'openai';
import { config } from './config';
import { logger } from './logger';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface OnboardingRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  error?: string;
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es un assistant qui extrait des informations structurées de demandes de création de compte.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
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
