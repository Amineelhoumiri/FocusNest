/**
 * Attach double-submit CSRF header for mutating same-origin /api calls.
 * Better Auth routes under /api/auth/* are skipped (except /api/auth/consent).
 */
let cachedToken: string | null = null;

async function refreshCsrfToken(): Promise<string> {
  const r = await fetch("/api/csrf-token", { credentials: "include" });
  if (!r.ok) throw new Error(`CSRF token request failed (${r.status})`);
  const j = (await r.json()) as { csrfToken?: string };
  if (!j.csrfToken) throw new Error("CSRF token missing in response");
  cachedToken = j.csrfToken;
  return j.csrfToken;
}

function shouldAttachCsrf(url: string, method: string): boolean {
  const m = method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(m)) return false;
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(url, window.location.origin);
    if (!u.pathname.startsWith("/api")) return false;
    if (u.pathname.startsWith("/api/auth/") && u.pathname !== "/api/auth/consent") return false;
    return true;
  } catch {
    return false;
  }
}

/** Call once at startup (before React tree). */
export function installCsrfFetch(): void {
  if (typeof window === "undefined") return;
  const orig = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = init?.method || "GET";
    if (!shouldAttachCsrf(url, method)) {
      return orig(input, init);
    }
    let token = cachedToken;
    if (!token) {
      token = await refreshCsrfToken();
    }
    const headers = new Headers(init?.headers);
    headers.set("x-csrf-token", token);
    let res = await orig(input, { ...init, headers });
    if (res.status === 403) {
      cachedToken = null;
      try {
        token = await refreshCsrfToken();
        headers.set("x-csrf-token", token);
        res = await orig(input, { ...init, headers });
      } catch {
        /* keep first 403 */
      }
    }
    return res;
  };
}
