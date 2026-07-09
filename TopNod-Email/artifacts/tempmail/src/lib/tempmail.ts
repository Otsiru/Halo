export const DOMAINS = [
  'Auto-Best',
  'nodkucluk.store',
  'nodkucluk.online',
  'nodkucluk.space',
  'nodkucluk.sbs',
  'nodkucluk.fun',
] as const;

export type Domain = typeof DOMAINS[number];

const REAL_DOMAINS = DOMAINS.slice(1) as readonly string[];

const NAME_WORDS = [
  'budi', 'adi', 'reza', 'fajar', 'dian', 'rian', 'eko', 'agus', 'hendra', 'toni',
  'yudi', 'andi', 'bayu', 'doni', 'gilang', 'hadi', 'ivan', 'joko', 'kevin', 'luki',
  'mario', 'nando', 'rafi', 'sandi', 'taruna', 'surya', 'rama', 'dewa', 'arya', 'yoga',
  'febri', 'rizki', 'fauzi', 'irfan', 'wahyu', 'galih', 'aziz', 'hamid', 'fikri', 'andra',
];

const NAME_SUFFIXES = [
  'ja', 'na', 'ta', 'ra', 'ka', 'sa', 'da', 'ma', 'wa', 'to',
  'no', 'di', 'wo', 'ri', 'ro', 'ni', 'nto', 'ndi', 'nta', 'wi',
];

const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const generateUsername = (): string => {
  const word = pick(NAME_WORDS);
  const suffix = Math.random() > 0.4 ? pick(NAME_SUFFIXES) : '';
  const digits = Math.floor(Math.random() * 9000) + 1000;
  return `${word}${suffix}${digits}`;
};

const randomDomain = () => pick(REAL_DOMAINS);

export const generateEmail = (domain: string = 'Auto-Best'): string => {
  const username = generateUsername();
  const resolved = domain === 'Auto-Best' ? randomDomain() : domain;
  return `${username}@${resolved}`;
};

// Fetch the latest verification code via the catchmail.io-backed proxy.
export const fetchVerificationCode = async (
  email: string
): Promise<{ code: string | null; count: number; subject?: string }> => {
  const url = `/api/inbox?address=${encodeURIComponent(email)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  return res.json();
};
