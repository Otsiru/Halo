import type { Connect, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Dev/preview middleware that proxies TempMail.lol server-side.
// TempMail.lol only allows the `tempmail.lol` browser origin (CORS), so calls
// must be made from Node. This keeps everything same-origin for the SPA on the
// single port the v0 preview detects — no separate Express server required.

const BASE = 'https://api.tempmail.lol/v2';

interface TempMailEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  html: string | null;
  date: number;
}

function extractCode(text: string): string | null {
  if (!text) return null;
  const matches = text.match(/\b\d{4,8}\b/g);
  if (!matches) return null;
  const filtered = matches.filter(
    (m) => !(m.length === 4 && Number(m) >= 2000 && Number(m) <= 2100),
  );
  return filtered[0] ?? null;
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

async function handleCreate(req: IncomingMessage, res: ServerResponse) {
  let domain: string | undefined;
  let prefix: string | undefined;
  try {
    const raw = await readBody(req);
    if (raw) {
      const parsed = JSON.parse(raw) as { domain?: string; prefix?: string };
      if (parsed.domain && typeof parsed.domain === 'string') domain = parsed.domain;
      if (parsed.prefix && typeof parsed.prefix === 'string') prefix = parsed.prefix;
    }
  } catch {
    // ignore malformed body, fall back to a fully random inbox
  }

  try {
    const body: Record<string, string> = {};
    if (domain) body.domain = domain;
    if (prefix) body.prefix = prefix;

    const upstream = await fetch(`${BASE}/inbox/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      return sendJson(res, 502, { error: `Upstream error ${upstream.status}` });
    }
    const data = (await upstream.json()) as { address: string; token: string };
    return sendJson(res, 200, { address: data.address, token: data.token });
  } catch {
    return sendJson(res, 500, { error: 'Failed to create inbox' });
  }
}

async function handleMessages(url: URL, res: ServerResponse) {
  const token = url.searchParams.get('token');
  if (!token) {
    return sendJson(res, 400, { error: 'token query param is required' });
  }
  try {
    const upstream = await fetch(`${BASE}/inbox?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!upstream.ok) {
      return sendJson(res, 502, { error: `Upstream error ${upstream.status}` });
    }
    const data = (await upstream.json()) as { emails: TempMailEmail[]; expired: boolean };
    const emails = Array.isArray(data.emails) ? data.emails : [];

    if (!emails.length) {
      return sendJson(res, 200, { code: null, count: 0, expired: !!data.expired });
    }
    for (const msg of emails) {
      const code =
        extractCode(msg.subject) ?? extractCode(msg.body) ?? extractCode(msg.html ?? '');
      if (code) {
        return sendJson(res, 200, {
          code,
          count: emails.length,
          subject: msg.subject,
          from: msg.from,
          expired: !!data.expired,
        });
      }
    }
    return sendJson(res, 200, {
      code: null,
      count: emails.length,
      subject: emails[0].subject,
      expired: !!data.expired,
    });
  } catch {
    return sendJson(res, 500, { error: 'Failed to fetch inbox' });
  }
}

const middleware: Connect.NextHandleFunction = (req, res, next) => {
  const url = new URL(req.url ?? '', 'http://localhost');
  const path = url.pathname;

  if (path === '/api/tempmail/create' && req.method === 'POST') {
    void handleCreate(req, res);
    return;
  }
  if (path === '/api/tempmail/messages' && req.method === 'GET') {
    void handleMessages(url, res);
    return;
  }
  next();
};

export function tempmailApiPlugin(): Plugin {
  return {
    name: 'tempmail-api-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
