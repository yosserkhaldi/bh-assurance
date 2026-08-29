import { config } from './config';
import { logger } from './logger';

export interface OnboardingRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  error?: string;
}

export interface WelcomeEmail {
  subject: string;
  text: string;
  html: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

function buildGeminiPrompt(userPrompt: string) {
  return {
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
  };
}

async function callGemini(userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.googleGeminiApiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGeminiPrompt(userPrompt)),
  });

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini API error ${response.status}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
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
    const raw = await callGemini(prompt);
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

export async function generateWelcomeEmail(data: {
  firstName: string;
  email: string;
  role: string;
  frontendUrl: string;
}): Promise<WelcomeEmail> {
  const prompt = [
    'Redige un email de bienvenue professionnel et concis pour un nouvel employe.',
    "Objet : Votre compte BH Assurance a ete cree.",
    "Le ton doit etre chaleureux, professionnel et succinct (2 a 3 paragraphes maximum).",
    `Destinataire : ${data.firstName} (${data.email}), role : ${data.role}.`,
    `Lien vers l'application : ${data.frontendUrl}`,
    'Retourne UNIQUEMENT un JSON valide avec les champs : subject, text, html.',
    "Le champ html doit contenir les memes informations que text, mais mis en forme avec du HTML simple (paragraphes, lien cliquable).",
  ].join('\n');

  try {
    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonString) as WelcomeEmail;

    if (!parsed.subject || !parsed.text || !parsed.html) {
      throw new Error('Réponse Gemini incomplète');
    }

    return parsed;
  } catch (err) {
    logger.error(`Welcome email generation error: ${(err as Error).message}`);
    // Fallback simple et professionnel
    const subject = 'Votre compte BH Assurance a ete cree';
    const text = [
      `Bienvenue chez BH Assurance, ${data.firstName} !`,
      '',
      `Votre compte employe (${data.role}) a ete cree avec succes. Vos identifiants vous seront transmis separement.`,
      '',
      `Lien vers l'application : ${data.frontendUrl}`,
      '',
      'Cordialement,',
      'Equipe BH Assurance',
    ].join('\n');
    const html = `
      <div style="font-family: Arial, sans-serif; color: #172033;">
        <h2 style="color: #00a6b2;">Bienvenue chez BH Assurance, ${data.firstName} !</h2>
        <p>Votre compte employe (${data.role}) a ete cree avec succes. Vos identifiants vous seront transmis separement.</p>
        <p><a href="${data.frontendUrl}" style="color: #00a6b2; text-decoration: none;">Acceder a l'application</a></p>
        <p>Cordialement,<br/>Equipe BH Assurance</p>
      </div>
    `;
    return { subject, text, html };
  }
}
