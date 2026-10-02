export function hasSameOrigin(request: Request): boolean {
  try {
    const configured = new URL(process.env.APP_ORIGIN ?? "");
    if (configured.username || configured.password || configured.pathname !== "/" || configured.search || configured.hash) return false;
    const local = configured.hostname === "localhost" || configured.hostname === "127.0.0.1";
    const permitted = configured.protocol === "https:" ||
      (configured.protocol === "http:" && local && process.env.NODE_ENV !== "production");
    return permitted && request.headers.get("origin") === configured.origin;
  } catch {
    return false;
  }
}
