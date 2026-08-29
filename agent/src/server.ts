import express, { Request, Response } from 'express';
import { config } from './config';
import { logger } from './logger';
import { generateWelcomeEmail } from './llm-client';
import { sendEmail } from './gmail-client';

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
      const welcome = await generateWelcomeEmail({
        firstName,
        email,
        role: normalizedRole,
        frontendUrl: frontendUrl || config.frontendUrl,
      });

      const credentialsText = [
        '',
        'Voici vos identifiants de connexion :',
        '',
        `Email : ${email}`,
        `Mot de passe temporaire : ${temporaryPassword}`,
        '',
        'Vous devrez changer ce mot de passe a votre premiere connexion.',
      ].join('\n');

      const credentialsHtml = `
        <p>Voici vos identifiants de connexion :</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${email}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Mot de passe temporaire</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${temporaryPassword}</td></tr>
        </table>
        <p><strong>Vous devrez changer ce mot de passe a votre premiere connexion.</strong></p>
      `;

      await sendEmail(email, welcome.subject, `${welcome.text}\n${credentialsText}`, `${welcome.html}\n${credentialsHtml}`);
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
