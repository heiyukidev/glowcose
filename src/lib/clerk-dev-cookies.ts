import { filter, find, get, join, map, partition, split } from "lodash";

const CLERK_COOKIE_BASES = [
  "__session",
  "__client_uat",
  "__clerk_db_jwt",
  "__refresh",
  "__clerk_handshake",
  "__clerk_handshake_nonce",
];

export const CLERK_HANDSHAKE_PARAMS = [
  "__clerk_handshake",
  "__clerk_db_jwt",
  "__dev_session",
  "__clerk_hs_reason",
  "__clerk_handshake_nonce",
];

type CookiePair = {
  name: string;
  value: string;
};

type ClerkInstance = {
  suffix: string;
  frontendApi: string;
};

function parseCookies(header: string | null): CookiePair[] {
  if (!header) return [];
  return filter(
    map(split(header, ";"), (part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return { name: trimmed, value: "" };
      return { name: trimmed.slice(0, eq), value: trimmed.slice(eq + 1) };
    }),
    (pair): pair is CookiePair => pair !== null,
  );
}

function clerkBase(name: string): string | undefined {
  return find(CLERK_COOKIE_BASES, (base) => name === base || name.startsWith(`${base}_`));
}

export function clerkIssuer(token: string): string | null {
  const encoded = split(token, ".")[1];
  if (!encoded) return null;
  try {
    const pad = encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
    const json = atob(encoded.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const iss = get(JSON.parse(json) as { iss?: unknown }, "iss");
    if (typeof iss !== "string") return null;
    return iss.replace(/^https?:\/\//, "").replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isForeign(pair: CookiePair, instance: ClerkInstance, keepUnsuffixedSession: boolean): boolean {
  const base = clerkBase(pair.name);
  if (!base) return false;
  if (pair.name !== base) return pair.name !== `${base}_${instance.suffix}`;
  if (base === "__client_uat") {
    if (pair.value === "0" || pair.value === "") return false;
    return !keepUnsuffixedSession;
  }
  if (base === "__session") return !keepUnsuffixedSession;
  const iss = clerkIssuer(pair.value);
  if (!iss) return false;
  return iss !== instance.frontendApi;
}

export function selectClerkCookies(header: string | null, instance: ClerkInstance) {
  const pairs = parseCookies(header);
  const unsuffixedSession = find(pairs, (pair) => pair.name === "__session");
  const sessionIssuer = unsuffixedSession ? clerkIssuer(unsuffixedSession.value) : null;
  const keepUnsuffixedSession = Boolean(unsuffixedSession) && (sessionIssuer === null || sessionIssuer === instance.frontendApi);
  const [clear, keep] = partition(pairs, (pair) => isForeign(pair, instance, keepUnsuffixedSession));
  return {
    cookieHeader: join(
      map(keep, (pair) => `${pair.name}=${pair.value}`),
      "; ",
    ),
    clear: map(clear, "name"),
  };
}

export function handshakeIsForeign(url: URL, frontendApi: string): boolean {
  const token = url.searchParams.get("__clerk_handshake") || url.searchParams.get("__clerk_db_jwt");
  if (!token) return false;
  const iss = clerkIssuer(token);
  return Boolean(iss && iss !== frontendApi);
}
