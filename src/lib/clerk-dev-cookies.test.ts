import { describe, expect, it } from "vitest";

import { clerkIssuer, handshakeIsForeign, selectClerkCookies } from "./clerk-dev-cookies";

const frontendApi = "adapted-squid-4107.clerk.accounts.dev";
const instance = { suffix: "rw3uAy53", frontendApi };

function jwt(iss: string): string {
  const body = Buffer.from(JSON.stringify({ iss: `https://${iss}` })).toString("base64url");
  return `eyJhbGciOiJub25lIn0.${body}.sig`;
}

describe("selectClerkCookies", () => {
  it("drops localhost Clerk cookies from other apps and keeps this instance", () => {
    const header = [
      `theme=dark`,
      `__session=${jwt("other.clerk.accounts.dev")}`,
      `__client_uat=1710000000`,
      `__session_${instance.suffix}=${jwt(frontendApi)}`,
      `__client_uat_${instance.suffix}=1710000001`,
      `__clerk_db_jwt_other=${jwt("other.clerk.accounts.dev")}`,
      `__session_xC3wzrmF=${jwt("literate-kite-33.accounts.dev")}`,
    ].join("; ");

    const selected = selectClerkCookies(header, instance);

    expect(selected.cookieHeader).toContain("theme=dark");
    expect(selected.cookieHeader).toContain(`__session_${instance.suffix}=`);
    expect(selected.cookieHeader).toContain(`__client_uat_${instance.suffix}=`);
    expect(selected.cookieHeader).not.toContain("__client_uat=1710000000");
    expect(selected.clear).toEqual([
      "__session",
      "__client_uat",
      "__clerk_db_jwt_other",
      "__session_xC3wzrmF",
    ]);
  });

  it("keeps an unsuffixed session that belongs to this instance", () => {
    const header = `__session=${jwt(frontendApi)}; __client_uat=1710000000`;
    const selected = selectClerkCookies(header, instance);

    expect(selected.clear).toEqual([]);
    expect(selected.cookieHeader).toContain("__session=");
    expect(selected.cookieHeader).toContain("__client_uat=1710000000");
  });
});

describe("handshakeIsForeign", () => {
  it("reads the issuer from a handshake token", () => {
    expect(clerkIssuer(jwt(frontendApi))).toBe(frontendApi);
    const url = new URL(`http://localhost:3010/?__clerk_handshake=${jwt("other.clerk.accounts.dev")}`);
    expect(handshakeIsForeign(url, frontendApi)).toBe(true);
    const ours = new URL(`http://localhost:3010/?__clerk_handshake=${jwt(frontendApi)}`);
    expect(handshakeIsForeign(ours, frontendApi)).toBe(false);
  });
});
