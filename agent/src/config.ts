import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  return process.env[name] || fallback || '';
}

export const config = {
  googleGeminiApiKey: getEnv('GOOGLE_GEMINI_API_KEY'),
  geminiModel: getEnv('GEMINI_MODEL', 'gemini-3.5-flash'),
  agentApiKey: getEnv('AGENT_API_KEY'),
  gmailUser: getEnv('GMAIL_USER'),
  gmailAppPassword: getEnv('GMAIL_APP_PASSWORD'),
  agentEmail: getEnv('AGENT_EMAIL', 'onboarding@bh-assurance.tn'),
  backendUrl: getEnv('BACKEND_URL', 'http://backend:3001/api'),
  pollIntervalMs: Number(getEnv('POLL_INTERVAL_MS', '30000')),
  agentMode: getEnv('AGENT_MODE', 'http'),
  agentPort: Number(getEnv('AGENT_PORT', '3002')),
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3000'),
};

export function validateConfig(): string[] {
  const missing: string[] = [];
  if (!config.googleGeminiApiKey) missing.push('GOOGLE_GEMINI_API_KEY');
  if (!config.agentApiKey) missing.push('AGENT_API_KEY');
  if (!config.gmailUser) missing.push('GMAIL_USER');
  if (!config.gmailAppPassword) missing.push('GMAIL_APP_PASSWORD');
  return missing;
}
