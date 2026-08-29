import { config, validateConfig } from './config';
import { fetchUnreadEmails, markAsSeen, ParsedEmail, sendEmail } from './gmail-client';
import { logger } from './logger';
import { parseOnboardingRequest } from './llm-client';
import { createUser } from './onboarding-client';

let running = true;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildWelcomeEmail(data: { firstName: string; email: string; temporaryPassword: string }) {
  const subject = 'Votre compte BH Assurance a ete cree';
  const text = [
    `Bienvenue chez BH Assurance, ${data.firstName} !`,
    '',
    'Votre compte employe a ete cree avec succes. Voici vos identifiants de connexion :',
    '',
    `Email : ${data.email}`,
    `Mot de passe temporaire : ${data.temporaryPassword}`,
    '',
    `Lien vers l'application : ${config.frontendUrl}`,
    '',
    "Vous devrez changer ce mot de passe a votre premiere connexion.",
    '',
    'Cordialement,',
    'Equipe BH Assurance',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #172033;">
      <h2 style="color: #00a6b2;">Bienvenue chez BH Assurance, ${data.firstName} !</h2>
      <p>Votre compte employe a ete cree avec succes. Voici vos identifiants de connexion :</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Mot de passe temporaire</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${data.temporaryPassword}</td></tr>
      </table>
      <p><a href="${config.frontendUrl}" style="color: #00a6b2; text-decoration: none;">Acceder a l'application</a></p>
      <p><strong>Vous devrez changer ce mot de passe a votre premiere connexion.</strong></p>
      <p>Cordialement,<br/>Equipe BH Assurance</p>
    </div>
  `;

  return { subject, text, html };
}

async function processEmail(email: ParsedEmail) {
  logger.info(`Processing email from ${email.from}: "${email.subject}"`);

  const parsed = await parseOnboardingRequest(email.textBody || email.subject);
  if (parsed.error) {
    logger.warn(`Skipped email: ${parsed.error}`);
    return;
  }

  const response = await createUser({
    email: parsed.email!,
    firstName: parsed.firstName!,
    lastName: parsed.lastName!,
    role: parsed.role as 'MANAGER' | 'VIEWER',
  });

  const { subject, text, html } = buildWelcomeEmail({
    firstName: response.user.firstName,
    email: response.user.email,
    temporaryPassword: response.temporaryPassword,
  });

  await sendEmail(response.user.email, subject, text, html);
  await markAsSeen(email.messageId);
  logger.info(`Onboarded ${response.user.email} (${response.user.role})`);
}

async function main() {
  const missing = validateConfig();
  if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please configure the agent variables in your .env file.');
    process.exit(1);
  }

  logger.info(`Agent started in ${config.agentMode} mode`);
  logger.info(`Polling interval: ${config.pollIntervalMs}ms`);

  while (running) {
    try {
      const emails = await fetchUnreadEmails();
      if (emails.length) {
        logger.info(`Found ${emails.length} unread email(s)`);
        for (const email of emails) {
          if (!running) break;
          await processEmail(email);
        }
      }
    } catch (err) {
      logger.error(`Poll loop error: ${(err as Error).message}`);
    }

    if (!running) break;
    await delay(config.pollIntervalMs);
  }

  logger.info('Agent stopped');
  process.exit(0);
}

function shutdown(signal: string) {
  logger.info(`Received ${signal}. Stopping gracefully...`);
  running = false;
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

void main();
