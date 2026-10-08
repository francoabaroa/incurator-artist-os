import path from "path";
import { unzipSync } from "fflate";

export class ArchiveExtractionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ArchiveExtractionError";
    this.code = code;
  }
}

export function extractSingleWavFromZip(zipBytes: Uint8Array) {
  let files: Record<string, Uint8Array>;

  try {
    files = unzipSync(zipBytes);
  } catch {
    throw new ArchiveExtractionError(
      "INVALID_ARCHIVE",
      "Downloaded mastering result was not a valid ZIP archive."
    );
  }

  const wavEntries = Object.entries(files).filter(([fileName]) => {
    const normalized = fileName.replace(/\\/g, "/");
    return path.posix.extname(normalized).toLowerCase() === ".wav";
  });

  if (wavEntries.length === 0) {
    throw new ArchiveExtractionError(
      "ARCHIVE_WAV_NOT_FOUND",
      "Mastering archive did not contain a WAV file."
    );
  }

  if (wavEntries.length > 1) {
    throw new ArchiveExtractionError(
      "ARCHIVE_WAV_AMBIGUOUS",
      "Mastering archive contained multiple WAV files."
    );
  }

  const [entryName, data] = wavEntries[0];
  return {
    entryName,
    data: Buffer.from(data),
  };
}
