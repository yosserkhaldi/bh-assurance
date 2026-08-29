import express, { Request, Response } from 'express';
import { config } from './config';
import { logger } from './logger';
import { sendEmail } from './gmail-client';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildWelcomeEmail(data: { firstName: string; email: string; role: string; frontendUrl: string; temporaryPassword: string }) {
  const subject = 'Votre compte BH Assurance a ete cree';
  const loginUrl = `${data.frontendUrl}/login`;
  const text = [
    `Bienvenue chez BH Assurance, ${data.firstName} !`,
    '',
    `Votre compte employe (${data.role}) a ete cree avec succes.`,
    '',
    'Voici vos identifiants de connexion :',
    '',
    `Email : ${data.email}`,
    `Mot de passe temporaire : ${data.temporaryPassword}`,
    '',
    `Lien de connexion : ${loginUrl}`,
    '',
    'Vous devrez changer ce mot de passe a votre premiere connexion.',
    '',
    'Cordialement,',
    'Equipe BH Assurance',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #172033;">
      <h2 style="color: #00a6b2;">Bienvenue chez BH Assurance, ${data.firstName} !</h2>
      <p>Votre compte employe (${data.role}) a ete cree avec succes.</p>
      <p>Voici vos identifiants de connexion :</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Mot de passe temporaire</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${escapeHtml(data.temporaryPassword)}</td></tr>
      </table>
      <p><a href="${loginUrl}" style="color: #00a6b2; text-decoration: none;">Se connecter et changer le mot de passe</a></p>
      <p><strong>Vous devrez changer ce mot de passe a votre premiere connexion.</strong></p>
      <p>Cordialement,<br/>Equipe BH Assurance</p>
    </div>
  `;
  return { subject, text, html };
}

interface OnboardBody {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  temporaryPassword: string;
  frontendUrl?: string;
}

function unauthorized(res: Response, message: string) {
  res.status(401).json({ error: message });
}

export function startServer(): void {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/onboard', async (req: Request, res: Response) => {
    if (config.agentApiKey) {
      const provided = req.headers['x-agent-api-key'];
      if (provided !== config.agentApiKey) {
        logger.warn('Rejected /onboard request: invalid or missing X-Agent-Api-Key');
        return unauthorized(res, 'Invalid or missing API key');
      }
    }

    const { email, firstName, lastName, role, temporaryPassword, frontendUrl } = req.body as OnboardBody;

    if (!email || !firstName || !lastName || !role || !temporaryPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedRole = String(role).toUpperCase();
    if (normalizedRole !== 'MANAGER' && normalizedRole !== 'VIEWER') {
      return res.status(400).json({ error: 'Role must be MANAGER or VIEWER' });
    }

    try {
      const welcome = buildWelcomeEmail({
        firstName,
        email,
        role: normalizedRole,
        frontendUrl: frontendUrl || config.frontendUrl,
        temporaryPassword,
      });

      await sendEmail(email, welcome.subject, welcome.text, welcome.html);
      logger.info(`Sent onboarding email to ${email} (${normalizedRole})`);
      res.json({ sent: true });
    } catch (err) {
      logger.error(`Failed to send onboarding email to ${email}: ${(err as Error).message}`);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  app.listen(config.agentPort, () => {
    logger.info(`Agent HTTP server listening on port ${config.agentPort}`);
  });
}
