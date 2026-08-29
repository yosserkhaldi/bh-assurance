import { config } from './config';
import { logger } from './logger';

export interface OnboardingPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: 'MANAGER' | 'VIEWER';
}

export interface OnboardingResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  temporaryPassword: string;
}

export async function createUser(payload: OnboardingPayload): Promise<OnboardingResponse> {
  const response = await fetch(`${config.backendUrl}/users/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Api-Key': config.agentApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(`Backend onboarding failed: ${response.status} ${body}`);
    throw new Error(`Backend onboarding failed: ${response.status}`);
  }

  return response.json() as Promise<OnboardingResponse>;
}
