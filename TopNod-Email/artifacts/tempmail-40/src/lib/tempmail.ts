// TempMail.lol API (via the api-server proxy).
// The free tier does NOT let you choose the address/domain — the server
// returns a random address plus an access token used to read the inbox.

export interface CreatedInbox {
  address: string;
  token: string;
}

// Create a new random inbox. Returns the address and its access token.
export const createInbox = async (): Promise<CreatedInbox> => {
  const res = await fetch('/api/tempmail/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Create error ${res.status}`);
  return res.json();
};

// Fetch the latest verification code for an inbox using its token.
export const fetchVerificationCode = async (
  token: string
): Promise<{ code: string | null; count: number; subject?: string; expired?: boolean }> => {
  const url = `/api/tempmail/messages?token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  return res.json();
};
