/**
 * This browser's guest id: the owner of saves played without an account. It lives in
 * localStorage and is mirrored in a long-lived cookie, so clearing site storage (or a test driver
 * that wipes localStorage on every start) no longer orphans the guest's saved games (F-02-6:
 * Marcus's month-11 game vanished from Saved games after a restart).
 */

const KEY = 'worldconflict.guest';
const COOKIE = 'wc_guest';
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export interface GuestStores {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  readCookie(): string;
  writeCookie(cookie: string): void;
}

const valid = (id: string | null | undefined): id is string => !!id && /^guest-[\w-]{4,80}$/.test(id);

function fromCookie(cookie: string): string | null {
  const hit = cookie
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE}=`));
  const id = hit ? decodeURIComponent(hit.slice(COOKIE.length + 1)) : null;
  return valid(id) ? id : null;
}

function newId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `guest-${uuid ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`}`;
}

/** The guest id: localStorage first, the cookie when storage was cleared, else a new one; both kept in step. */
export function resolveGuestId(stores: GuestStores, make: () => string = newId): string {
  let stored: string | null = null;
  try {
    stored = stores.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  let cookie: string | null = null;
  try {
    cookie = fromCookie(stores.readCookie());
  } catch {
    /* no cookies */
  }
  const id = valid(stored) ? stored : (cookie ?? make());
  try {
    if (stored !== id) stores.setItem(KEY, id);
  } catch {
    /* storage blocked: the cookie still holds it */
  }
  try {
    if (cookie !== id) stores.writeCookie(`${COOKIE}=${encodeURIComponent(id)}; max-age=${TEN_YEARS}; path=/; SameSite=Lax`);
  } catch {
    /* no cookies */
  }
  return id;
}

/** The browser's stores (localStorage and document.cookie). */
export function browserGuestStores(): GuestStores {
  return {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
    readCookie: () => (typeof document === 'undefined' ? '' : document.cookie),
    writeCookie: (c) => {
      if (typeof document !== 'undefined') document.cookie = c;
    },
  };
}
