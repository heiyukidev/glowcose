import { clerkMiddleware } from "@clerk/nextjs/server";
import { getCookieSuffix, parsePublishableKey } from "@clerk/shared/keys";
import { forEach } from "lodash";
import { type NextFetchEvent, type NextMiddlewareResult, NextRequest, NextResponse } from "next/server";

import { CLERK_HANDSHAKE_PARAMS, handshakeIsForeign, selectClerkCookies } from "@/lib/clerk-dev-cookies";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerk = publishableKey ? clerkMiddleware() : null;

function expireClerkCookies(response: Response, names: string[]) {
  forEach(names, (name) => {
    response.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0`);
    response.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
    response.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; SameSite=Strict`);
    response.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; Secure; SameSite=None`);
  });
}

function requestWithoutCookies(request: NextRequest, cookieHeader: string): NextRequest {
  const headers = new Headers(request.headers);
  if (cookieHeader) headers.set("cookie", cookieHeader);
  else headers.delete("cookie");
  return new NextRequest(request.url, { headers, method: request.method });
}

export default async function middleware(request: NextRequest, event: NextFetchEvent): Promise<NextMiddlewareResult> {
  if (!clerk || !publishableKey) return NextResponse.next();

  const parsed = parsePublishableKey(publishableKey);
  if (!parsed) return clerk(request, event);

  const suffix = await getCookieSuffix(publishableKey);
  const instance = { suffix, frontendApi: parsed.frontendApi };
  const selected = selectClerkCookies(request.headers.get("cookie"), instance);

  if (handshakeIsForeign(request.nextUrl, parsed.frontendApi)) {
    const url = request.nextUrl.clone();
    forEach(CLERK_HANDSHAKE_PARAMS, (name) => {
      url.searchParams.delete(name);
    });
    const response = NextResponse.redirect(url);
    expireClerkCookies(response, selected.clear);
    return response;
  }

  const response = await clerk(requestWithoutCookies(request, selected.cookieHeader), event);
  if (selected.clear.length > 0 && response instanceof Response) {
    expireClerkCookies(response, selected.clear);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
