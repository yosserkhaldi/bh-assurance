import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredSession {
  sessionId: string;
  userId: string;
  title: string;
  messages: unknown[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AgentSessionStorageService {
  private readonly logger = new Logger(AgentSessionStorageService.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    this.baseDir =
      config.get<string>('AGENT_SESSIONS_DIR') ||
      // backend/data/agent-sessions (fonctionne en local et dans Docker)
      path.resolve(__dirname, '..', '..', 'data', 'agent-sessions');
  }

  private userDir(userId: string): string {
    return path.join(this.baseDir, userId);
  }

  private filePath(userId: string, sessionId: string): string {
    // Le sessionId est genere cote serveur (timestamp + random), donc sur.
    const safeName = sessionId.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.userDir(userId), `${safeName}.json`);
  }

  save(userId: string, sessionId: string, title: string, messages: unknown[]): StoredSession {
    const dir = this.userDir(userId);
    fs.mkdirSync(dir, { recursive: true });

    const file = this.filePath(userId, sessionId);
    const now = new Date().toISOString();
    let createdAt = now;

    try {
      if (fs.existsSync(file)) {
        const existing = JSON.parse(fs.readFileSync(file, 'utf8')) as StoredSession;
        createdAt = existing.createdAt || now;
      }
    } catch {
      // ignore
    }

    const session: StoredSession = { sessionId, userId, title, messages, createdAt, updatedAt: now };
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(session, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return session;
  }

  get(userId: string, sessionId: string): StoredSession | null {
    try {
      const file = this.filePath(userId, sessionId);
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, 'utf8')) as StoredSession;
    } catch (err) {
      this.logger.warn(`Lecture session impossible: ${(err as Error).message}`);
      return null;
    }
  }

  list(userId: string): StoredSession[] {
    const dir = this.userDir(userId);
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const sessions: StoredSession[] = [];

    for (const file of files) {
      try {
        const session = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as StoredSession;
        sessions.push(session);
      } catch (err) {
        this.logger.warn(`Fichier session ignore (${file}): ${(err as Error).message}`);
      }
    }

    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50);
  }

  delete(userId: string, sessionId: string): void {
    try {
      const file = this.filePath(userId, sessionId);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (err) {
      this.logger.warn(`Suppression session impossible: ${(err as Error).message}`);
    }
  }
}
