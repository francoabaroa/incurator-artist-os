export function getAuthUserId(req: Request): string | null {
  const headerUser = req.headers.get("x-user-id") ?? req.headers.get("x-incurator-user");
  if (headerUser) {
    const trimmed = headerUser.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

export function userOwnsArtist(req: Request, userId: string, artistId: string): boolean {
  const ownedHeader = req.headers.get("x-artist-ids");
  if (ownedHeader) {
    const owned = ownedHeader
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (owned.includes(artistId)) {
      return true;
    }
  }

  return artistId === userId || artistId.startsWith(`${userId}_`);
}
