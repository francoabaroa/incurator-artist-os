import * as fs from "fs/promises";
import * as path from "path";
import { SCHEMA_REGISTRY } from "./schemas";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "/vercel/sandbox/workspace";

type ValidationResult =
  | { success: true }
  | { success: false; error: string };

export async function validateWorkspaceFiles(
  relativePath: string
): Promise<ValidationResult> {
  const schema = SCHEMA_REGISTRY[relativePath];
  if (!schema) {
    return { success: true };
  }

  try {
    const fullPath = path.join(WORKSPACE_ROOT, relativePath);
    const content = await fs.readFile(fullPath, "utf-8");
    const data = JSON.parse(content);

    const result = schema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function validateAllWorkspaceFiles(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const relativePath of Object.keys(SCHEMA_REGISTRY)) {
    const fullPath = path.join(WORKSPACE_ROOT, relativePath);
    try {
      await fs.access(fullPath);
      results.push(await validateWorkspaceFiles(relativePath));
    } catch {
      // File missing is acceptable.
    }
  }

  return results;
}

/**
 * Helper for JSON rollback logic - validates and rolls back if invalid.
 * Returns true if rollback was performed, false otherwise.
 */
export async function validateAndRollbackIfInvalid(
  relativePath: string,
  backupContent: string | null,
  writeFileFn: (fullPath: string, content: string) => Promise<void>
): Promise<{ rolledBack: boolean; error?: string }> {
  const validationResult = await validateWorkspaceFiles(relativePath);

  if (!validationResult.success) {
    if (backupContent !== null) {
      const fullPath = path.join(WORKSPACE_ROOT, relativePath);
      await writeFileFn(fullPath, backupContent);
      return { rolledBack: true, error: validationResult.error };
    }
    return { rolledBack: false, error: validationResult.error };
  }

  return { rolledBack: false };
}
