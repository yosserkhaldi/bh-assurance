import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { createTransport } from 'nodemailer';
import { config } from './config';
import { logger } from './logger';

export interface ParsedEmail {
  messageId: string;
  from: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}

const imapConfig: Imap.Config = {
  user: config.gmailUser,
  password: config.gmailAppPassword,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: config.gmailUser,
    pass: config.gmailAppPassword,
  },
});

export async function fetchUnreadEmails(): Promise<ParsedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    const emails: ParsedEmail[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          if (!results.length) {
            imap.end();
            return resolve([]);
          }

          const fetch = imap.fetch(results, { bodies: '' });
          fetch.on('message', (msg) => {
            let uid = '';
            let buffer = Buffer.alloc(0);

            msg.on('attributes', (attrs) => {
              uid = String(attrs.uid);
            });

            msg.on('body', (stream) => {
              stream.on('data', (chunk: Buffer) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
              stream.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  emails.push({
                    messageId: uid,
                    from: parsed.from?.text || '',
                    subject: parsed.subject || '',
                    textBody: parsed.text || '',
                    htmlBody: parsed.html || '',
                  });
                } catch (parseErr) {
                  logger.error(`Failed to parse email: ${(parseErr as Error).message}`);
                }
              });
            });
          });

          fetch.once('error', (err) => {
            logger.error(`Fetch error: ${err.message}`);
          });

          fetch.once('end', () => {
            imap.end();
            resolve(emails);
          });
        });
      });
    });

    imap.once('error', (err) => reject(err));
    imap.connect();
  });
}

export async function markAsSeen(messageId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          imap.end();
          return reject(err);
        }
        imap.addFlags(messageId, '\\Seen', (err) => {
          imap.end();
          if (err) return reject(err);
          resolve();
        });
      });
    });

    imap.once('error', (err) => reject(err));
    imap.connect();
  });
}

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  await transporter.sendMail({
    from: `BH Assurance Onboarding <${config.agentEmail}>`,
    to,
    subject,
    text,
    html,
  });
  logger.info(`Sent onboarding email to ${to}`);
}
