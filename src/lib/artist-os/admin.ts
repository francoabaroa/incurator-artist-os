export function requireAdmin(req: Request): Response | null {
  const expected = process.env.ARTIST_OS_ADMIN_TOKEN;
  if (!expected) {
    return Response.json(
      { error: "Admin token not configured" },
      { status: 500 }
    );
  }

  const headerToken = req.headers.get("x-admin-token");
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  const provided = headerToken?.trim() || bearer;
  if (!provided || provided !== expected) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
