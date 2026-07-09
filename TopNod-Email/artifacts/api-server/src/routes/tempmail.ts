import { Router } from "express";

const router = Router();

const BASE = "https://api.tempmail.lol/v2";

interface TempMailInbox {
  address: string;
  token: string;
}

interface TempMailEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  html: string | null;
  date: number;
}

interface TempMailInboxResponse {
  emails: TempMailEmail[];
  expired: boolean;
}

function extractCode(text: string): string | null {
  if (!text) return null;
  const matches = text.match(/\b\d{4,8}\b/g);
  if (!matches) return null;
  // Skip years (2000–2100) which are common false positives
  const filtered = matches.filter(
    (m) => !(m.length === 4 && Number(m) >= 2000 && Number(m) <= 2100)
  );
  return filtered[0] ?? null;
}

// POST /api/tempmail/create -> creates a new inbox via tempmail.lol (random domain)
router.post("/tempmail/create", async (req, res) => {
  const { prefix } = (req.body ?? {}) as { prefix?: string };

  try {
    const body: Record<string, string> = {};
    if (prefix && typeof prefix === "string") body.prefix = prefix;

    const upstream = await fetch(`${BASE}/inbox/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      return res
        .status(502)
        .json({ error: `Upstream error ${upstream.status}` });
    }

    const data = (await upstream.json()) as TempMailInbox;
    return res.json({ address: data.address, token: data.token });
  } catch {
    return res.status(500).json({ error: "Failed to create inbox" });
  }
});

// GET /api/tempmail/messages?token=xxx
router.get("/tempmail/messages", async (req, res) => {
  const { token } = req.query as { token?: string };

  if (!token) {
    return res.status(400).json({ error: "token query param is required" });
  }

  try {
    const upstream = await fetch(
      `${BASE}/inbox?token=${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" } }
    );

    if (!upstream.ok) {
      return res
        .status(502)
        .json({ error: `Upstream error ${upstream.status}` });
    }

    const data = (await upstream.json()) as TempMailInboxResponse;
    const emails = Array.isArray(data.emails) ? data.emails : [];

    if (!emails.length) {
      return res.json({ code: null, count: 0, expired: !!data.expired });
    }

    // Scan the most recent messages for a verification code
    for (const msg of emails) {
      const code =
        extractCode(msg.subject) ??
        extractCode(msg.body) ??
        extractCode(msg.html ?? "");
      if (code) {
        return res.json({
          code,
          count: emails.length,
          subject: msg.subject,
          from: msg.from,
          expired: !!data.expired,
        });
      }
    }

    return res.json({
      code: null,
      count: emails.length,
      subject: emails[0].subject,
      expired: !!data.expired,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

export default router;
