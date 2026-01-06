import * as path from "path";

/**
 * Guardrail utilities for the agent runner.
 * These are extracted for testability - the runner imports and uses them,
 * and tests can verify behavior directly.
 */

export const PROTECTED_PATHS = [
  "CLAUDE.md",
  ".incurator/",
  ".index/",
];

export const APPEND_ONLY_PATHS = [
  ".trace/commits.jsonl",
  "logs/",
  "progress/claude-progress.md",
];

export const ALLOW_ANY_REDIRECT_PREFIXES = ["logs/", ".trace/"];
export const ALLOW_APPEND_ONLY_TARGETS = ["progress/claude-progress.md"];

/**
 * Normalizes a file path to be relative to the workspace root.
 * Returns null if the path escapes the workspace.
 */
export function normalizeWorkspacePath(
  filePath: string,
  workspaceRoot: string
): { fullPath: string; relativePath: string } | null {
  if (!filePath) {
    return null;
  }

  // Resolve relative paths against WORKSPACE_ROOT, not process.cwd()
  // This is critical because runner executes from .incurator/ directory
  const resolved = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(workspaceRoot, filePath);

  if (!resolved.startsWith(workspaceRoot)) {
    return null;
  }

  const relativePath = path.relative(workspaceRoot, resolved);
  return { fullPath: resolved, relativePath };
}

/**
 * Checks if a path is protected (cannot be modified by the agent).
 */
export function isProtectedPath(relativePath: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => relativePath === p || relativePath.startsWith(p)
  );
}

/**
 * Checks if a path is append-only (cannot be overwritten, only appended).
 */
export function isAppendOnlyPath(relativePath: string): boolean {
  return APPEND_ONLY_PATHS.some(
    (p) => relativePath === p || relativePath.startsWith(p)
  );
}

export interface RedirectCheckResult {
  hasRedirect: boolean;
  hasOverwriteRedirect: boolean;
  hasAppendRedirect: boolean;
  hasTee: boolean;
  redirectTarget: string | null;
  isAllowed: boolean;
}

/**
 * Checks if a bash command contains file redirections and whether they're allowed.
 */
export function checkBashRedirect(command: string): RedirectCheckResult {
  // Check append first, then overwrite (if no append) - order matters to avoid
  // the regex matching within >> as a single >
  const hasAppendRedirect = /\s*>>\s*/.test(command);
  const hasOverwriteRedirect = !hasAppendRedirect && /\s*>\s*[^>|&]/.test(command);
  const hasTee = /\|\s*tee\s+/.test(command);
  const hasRedirect = hasOverwriteRedirect || hasAppendRedirect || hasTee;

  if (!hasRedirect) {
    return {
      hasRedirect: false,
      hasOverwriteRedirect: false,
      hasAppendRedirect: false,
      hasTee: false,
      redirectTarget: null,
      isAllowed: true,
    };
  }

  const redirectTarget = command.match(/(?:>>?\s*|tee\s+)([^\s|&;]+)/)?.[1] ?? "";

  const isAllowAny =
    ALLOW_ANY_REDIRECT_PREFIXES.some((p) => redirectTarget.startsWith(p)) ||
    ALLOW_ANY_REDIRECT_PREFIXES.some((p) => redirectTarget.includes(`/${p}`));

  const isAllowAppendOnly =
    ALLOW_APPEND_ONLY_TARGETS.includes(redirectTarget) ||
    ALLOW_APPEND_ONLY_TARGETS.some((p) => redirectTarget.endsWith(`/${p}`));

  // Allow:
  // - logs/ and .trace/ redirects (>, >>, tee)
  // - progress/claude-progress.md ONLY for append (>>)
  const isAllowed =
    isAllowAny ||
    (isAllowAppendOnly && hasAppendRedirect && !hasOverwriteRedirect && !hasTee);

  return {
    hasRedirect: true,
    hasOverwriteRedirect,
    hasAppendRedirect,
    hasTee,
    redirectTarget,
    isAllowed,
  };
}

/**
 * Checks if a bash command contains dangerous patterns.
 */
export function isDangerousCommand(command: string): boolean {
  const dangerous = [
    "rm -rf",
    "mkfs",
    "dd if=",
    "curl | bash",
    "wget | bash",
    "chmod 777",
    "sudo rm",
    ":(){ :|:& };:",
  ];
  return dangerous.some((pattern) => command.includes(pattern));
}
