const INCURATOR_USER_ID_PATTERN = /^\d+$/;

export class InvalidIncuratorUserIdError extends Error {
  constructor(message = "x-incurator-user-id must be a numeric internal user id") {
    super(message);
    this.name = "InvalidIncuratorUserIdError";
  }
}

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

export function getIncuratorUserId(req: Request): string | null {
  const headerUser = req.headers.get("x-incurator-user-id");
  if (!headerUser) {
    return null;
  }

  const trimmed = headerUser.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (!INCURATOR_USER_ID_PATTERN.test(trimmed)) {
    throw new InvalidIncuratorUserIdError();
  }

  return trimmed;
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
