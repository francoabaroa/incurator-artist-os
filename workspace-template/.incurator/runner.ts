import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { appendAuditLog, appendCommitLog, logTrajectoryStep, writeProgressHandover } from "./audit";
import { validateWorkspaceFiles } from "./validation";
import { safeWriteFile } from "./safe-fs";
import { updateManifestEntry } from "./manifest";
import { normalizeTaskStatuses } from "./normalization";
import {
  normalizeWorkspacePath as normalizeWorkspacePathBase,
  isProtectedPath,
  isAppendOnlyPath,
  checkBashRedirect,
  isDangerousCommand,
} from "./guardrails";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "/vercel/sandbox/workspace";
const FEATURES_PATH = "features.json";
const TASK_BACKLOG_PATH = "tasks/backlog.json";

// Type definitions for Claude Agent SDK hooks
// The SDK uses complex union types; we define interfaces for the specific hook inputs we use
interface ToolUseHookInput {
  tool_name: string;
  tool_input?: Record<string, unknown>;
}

interface ToolFailureHookInput {
  tool_name: string;
  error?: string;
}

interface CompactHookInput {
  transcript_path: string;
  trigger: "manual" | "auto";
}

// Wrapper to bind workspace root
function normalizeWorkspacePath(filePath: string) {
  return normalizeWorkspacePathBase(filePath, WORKSPACE_ROOT);
}

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  passes: boolean;
  notes?: string;
}

async function main() {
  console.log("Running session initialization...");
  try {
    execSync("./init.sh", { cwd: WORKSPACE_ROOT, stdio: "inherit" });
  } catch (error) {
    console.error("init.sh failed - environment may be corrupted");
    throw error;
  }

  const promptB64 = process.env.PROMPT_B64;
  if (!promptB64) {
    throw new Error("PROMPT_B64 not set");
  }
  const prompt = Buffer.from(promptB64, "base64").toString("utf-8");

  const claudeMd = await loadFile("CLAUDE.md");
  const artistProfile = await loadFile("profile/artist.json");
  const progress = await loadFile("progress/claude-progress.md");
  const featuresRaw = await loadFile(FEATURES_PATH);
  const skillSummaries = await loadSkillSummaries();

  const baselineFeatures = parseFeatures(featuresRaw);
  const nextFeature = baselineFeatures.find((feature) => !feature.passes);

  const featureContext = nextFeature
    ? `\n## Next Feature to Work On\n${JSON.stringify(nextFeature, null, 2)}`
    : "\n## All Features Complete!\nReview and verify all features are working correctly.";

  const systemContext = `
${claudeMd}

## Artist Profile
${artistProfile}

## Current Progress
${progress}

## Feature Status
Total: ${baselineFeatures.length}, Passing: ${baselineFeatures.filter((f) => f.passes).length}
${featureContext}

## Available Skills
${skillSummaries}

## Session Instructions
1. Work on ONE feature at a time
2. Test the feature thoroughly before marking passes: true
3. Update progress notes after each significant step
4. Do NOT remove or edit feature descriptions - only change passes status
  `.trim();

  const resumeSessionId = process.env.RESUME_SESSION_ID || undefined;
  if (resumeSessionId) {
    console.log(`Resuming session: ${resumeSessionId}`);
  }
  const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
  if (claudeConfigDir) {
    await fs.mkdir(claudeConfigDir, { recursive: true });
  }
  const recentFiles: string[] = [];
  const jsonBackups = new Map<string, string>();
  const preExistingFiles = new Map<string, boolean>();

  const response = query({
    prompt,
    options: {
      model: "claude-sonnet-4-5",
      systemPrompt: systemContext,
      cwd: WORKSPACE_ROOT,
      tools: ["Read", "Glob", "Grep", "Write", "Edit", "MultiEdit", "Bash"],
      disallowedTools: [],
      permissionMode: "acceptEdits",
      resume: resumeSessionId,
      canUseTool: async (toolName, input) => {
        if (toolName === "Bash") {
          const command = String(input?.command ?? "");

          // Block destructive commands
          if (isDangerousCommand(command)) {
            await appendAuditLog("guardrail_block", { toolName, command });
            return { behavior: "deny", message: "Dangerous command blocked" };
          }

          // Block file redirections that bypass safe-fs guardrails
          const redirectCheck = checkBashRedirect(command);
          if (redirectCheck.hasRedirect && !redirectCheck.isAllowed) {
            await appendAuditLog("guardrail_block", {
              toolName,
              command,
              reason: "File redirection outside safe paths blocked",
            });
            return {
              behavior: "deny",
              message:
                "File redirection blocked. Use Write/Edit tools for file modifications, or redirect only to logs/ or .trace/. For progress notes, append with: >> progress/claude-progress.md",
            };
          }
        }

        if (["Write", "Edit", "MultiEdit"].includes(toolName)) {
          const filePath = String(input?.file_path ?? "");
          const normalized = normalizeWorkspacePath(filePath);
          if (!normalized) {
            await appendAuditLog("guardrail_block", { toolName, filePath });
            return { behavior: "deny", message: "Path outside workspace blocked" };
          }

          const { relativePath, fullPath } = normalized;
          if (relativePath.includes("..")) {
            await appendAuditLog("guardrail_block", { toolName, filePath });
            return { behavior: "deny", message: "Path traversal blocked" };
          }

          if (isProtectedPath(relativePath)) {
            await appendAuditLog("guardrail_block", { toolName, filePath });
            return { behavior: "deny", message: "Protected path blocked" };
          }

          if (isAppendOnlyPath(relativePath)) {
            await appendAuditLog("guardrail_block", { toolName, filePath });
            return {
              behavior: "deny",
              message: "Append-only path blocked. Use append operations instead.",
            };
          }

          const exists = await fileExists(fullPath);
          if (toolName === "Write" && exists) {
            await appendAuditLog("guardrail_block", { toolName, filePath });
            return {
              behavior: "deny",
              message: "Overwrite blocked. Use Edit for modifications.",
            };
          }

          if ((toolName === "Edit" || toolName === "MultiEdit") && !exists) {
            await appendAuditLog("guardrail_block", { toolName, filePath });
            return {
              behavior: "deny",
              message: "Edit blocked. Use Write to create new files.",
            };
          }
        }

        return { behavior: "allow" as const, updatedInput: input ?? {} };
      },
      hooks: {
        PreToolUse: [
          {
            hooks: [
              async (rawInput) => {
                const input = rawInput as ToolUseHookInput;
                const toolName = input.tool_name;
                if (toolName) {
                  await appendAuditLog(toolName, input.tool_input);
                }

                if (input.tool_input && typeof input.tool_input === "object") {
                  const maybePath = String((input.tool_input as { file_path?: string }).file_path ?? "");
                  const normalized = normalizeWorkspacePath(maybePath);
                  if (normalized) {
                    recordRecentFile(recentFiles, normalized.relativePath);
                    // Track file existence for ALL files (for accurate create vs update in commit log)
                    preExistingFiles.set(normalized.relativePath, await fileExists(normalized.fullPath));
                    if (normalized.relativePath.endsWith(".json")) {
                      const existing = await safeReadFile(normalized.fullPath);
                      if (existing) {
                        jsonBackups.set(normalized.relativePath, existing);
                      }
                    }
                  }
                }

                await logTrajectoryStep({
                  timestamp: new Date().toISOString(),
                  hook: "PreToolUse",
                  tool: input.tool_name,
                });

                return { continue: true };
              },
            ],
          },
        ],
        PostToolUse: [
          {
            hooks: [
              async (rawInput) => {
                const input = rawInput as ToolUseHookInput;
                const toolName = input.tool_name;
                const toolInput = input.tool_input as { file_path?: string; command?: string } | undefined;

                // For Write/Edit/MultiEdit, enforce commit logging and manifest updates
                const writeTools = ["Write", "Edit", "MultiEdit"];
                if (writeTools.includes(toolName) && toolInput?.file_path) {
                  const normalized = normalizeWorkspacePath(toolInput.file_path);
                  if (normalized) {
                    try {
                      // Read the updated file content
                      let content = await fs.readFile(normalized.fullPath, "utf-8");

                      if (normalized.relativePath === TASK_BACKLOG_PATH) {
                        const normalizedResult = normalizeTaskStatuses(content);
                        if (normalizedResult.changed) {
                          await fs.writeFile(
                            normalized.fullPath,
                            normalizedResult.content,
                            "utf-8"
                          );
                          await appendAuditLog("task_status_normalized", {
                            path: normalized.relativePath,
                          });
                          content = normalizedResult.content;
                        }
                      }
                      // Use preExistingFiles (tracks ALL file types, not just JSON)
                      const existedBefore = preExistingFiles.get(normalized.relativePath) ?? false;

                      // Log structured commit
                      await appendCommitLog(
                        normalized.relativePath,
                        existedBefore ? "update" : "create",
                        content,
                        toolName
                      );

                      // Update manifest with new file hash/size
                      await updateManifestEntry(normalized.relativePath, content);
                    } catch (err) {
                      // File may not exist if tool failed; log but don't crash
                      await appendAuditLog("post_tool_read_error", String(err));
                    }
                  }
                }

                if (toolInput?.file_path) {
                  const normalized = normalizeWorkspacePath(toolInput.file_path);
                  if (normalized && normalized.relativePath.endsWith(".json")) {
                    const result = await validateWorkspaceFiles(normalized.relativePath);
                    if (!result.success) {
                      await appendCommitLog(
                        normalized.relativePath,
                        "update",
                        jsonBackups.get(normalized.relativePath) ?? "",
                        toolName,
                        result.error
                      );

                      const backup = jsonBackups.get(normalized.relativePath);
                      if (backup) {
                        await safeWriteFile(normalized.relativePath, backup, {
                          allowOverwrite: true,
                          forceWrite: true,
                        });
                      }
                    }
                  }

                  if (normalized?.relativePath === FEATURES_PATH) {
                    await enforceFeatureList(normalized.fullPath, baselineFeatures);
                  }
                }

                await logTrajectoryStep({
                  timestamp: new Date().toISOString(),
                  hook: "PostToolUse",
                  tool: input.tool_name,
                });

                return { continue: true };
              },
            ],
          },
        ],
        PostToolUseFailure: [
          {
            hooks: [
              async (rawInput) => {
                const input = rawInput as ToolFailureHookInput;
                await appendAuditLog("tool_failure", input.error);
                await logTrajectoryStep({
                  timestamp: new Date().toISOString(),
                  hook: "PostToolUseFailure",
                  tool: input.tool_name,
                  error: input.error,
                });
                return { continue: true };
              },
            ],
          },
        ],
        PreCompact: [
          {
            hooks: [
              async (rawInput) => {
                const input = rawInput as CompactHookInput;
                await writeCompactionSummary(input.transcript_path, input.trigger);
                return { continue: true };
              },
            ],
          },
        ],
      },
    },
  });

  const messages: unknown[] = [];
  let exitCode = 1;

  try {
    for await (const message of response) {
      messages.push(message);

      if (message.type === "system" && "subtype" in message && message.subtype === "init") {
        const initMessage = message as { session_id?: string };
        if (initMessage.session_id) {
          const sessionData = JSON.stringify({
            sessionId: initMessage.session_id,
            createdAt: new Date().toISOString(),
          });
          await fs.writeFile("/vercel/sandbox/_agent_session.json", sessionData, "utf-8");
        }
      }

      if (message.type === "assistant") {
        // Output as JSON so frontend can parse content blocks
        console.log(JSON.stringify(message.message.content));
        continue;
      }

      if (message.type === "result") {
        exitCode = message.is_error ? 1 : 0;
      }
    }
  } catch (error) {
    console.error("Agent stream error:", error);
    exitCode = 1;
  } finally {
    await writeProgressHandover({ messages, exitCode });
  }

  process.exit(exitCode);
}

async function loadFile(relativePath: string): Promise<string> {
  const fullPath = path.join(WORKSPACE_ROOT, relativePath);
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    return `(File not found: ${relativePath})`;
  }
}

async function loadSkillSummaries(): Promise<string> {
  const skillsDir = path.join(WORKSPACE_ROOT, ".claude", "skills");
  const summaries: string[] = [];

  try {
    const skills = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const skill of skills) {
      if (!skill.isDirectory()) {
        continue;
      }

      const skillMdPath = path.join(skillsDir, skill.name, "SKILL.md");
      try {
        const content = await fs.readFile(skillMdPath, "utf-8");
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const yaml = match[1];
          const name = yaml.match(/name:\s*(.+)/)?.[1] || skill.name;
          const desc = yaml.match(/description:\s*(.+)/)?.[1] || "";
          summaries.push(
            `- **${name}**: ${desc} (load with: Read .claude/skills/${skill.name}/SKILL.md)`
          );
        }
      } catch {
        // Skip invalid skill entries.
      }
    }
  } catch {
    return "(No skills directory found)";
  }

  return summaries.length > 0 ? summaries.join("\n") : "(No skills installed)";
}

function parseFeatures(raw: string): FeatureItem[] {
  try {
    const data = JSON.parse(raw) as FeatureItem[];
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter((feature) => feature && typeof feature.id === "string");
  } catch {
    return [];
  }
}

async function enforceFeatureList(
  filePath: string,
  baselineFeatures: FeatureItem[]
) {
  if (baselineFeatures.length === 0) {
    return;
  }

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const current = parseFeatures(raw);
    const currentMap = new Map(current.map((feature) => [feature.id, feature]));

    const reconciled = baselineFeatures.map((feature) => {
      const updated = currentMap.get(feature.id);
      if (!updated) {
        return feature;
      }

      return {
        ...feature,
        passes: updated.passes,
        notes: updated.notes ?? feature.notes,
      };
    });

    const reconciledRaw = JSON.stringify(reconciled, null, 2);
    if (reconciledRaw !== raw) {
      await safeWriteFile(FEATURES_PATH, reconciledRaw, {
        allowOverwrite: true,
        forceWrite: true,
      });
    }
  } catch (error) {
    await appendAuditLog("features_guard_error", String(error));
  }
}

function recordRecentFile(list: string[], entry: string) {
  const existingIndex = list.indexOf(entry);
  if (existingIndex !== -1) {
    list.splice(existingIndex, 1);
  }
  list.unshift(entry);
  if (list.length > 5) {
    list.pop();
  }
}

async function fileExists(fullPath: string) {
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function safeReadFile(fullPath: string): Promise<string | null> {
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }
}

async function writeCompactionSummary(
  transcriptPath: string,
  trigger: "manual" | "auto"
) {
  try {
    const transcript = await fs.readFile(transcriptPath, "utf-8");
    const lines = transcript.split("\n");
    const snippet = lines.slice(-200).join("\n");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const summaryPath = path.join(
      WORKSPACE_ROOT,
      "progress",
      `session-${timestamp}.md`
    );

    const content = [
      `# Compaction Summary (${trigger})`,
      "",
      `Transcript path: ${transcriptPath}`,
      "",
      "## Recent transcript excerpt",
      "",
      snippet,
    ].join("\n");

    await fs.writeFile(summaryPath, content, "utf-8");
    await appendCommitLog(summaryPath, "create", content, "compaction");
    // Update manifest for compaction summary
    const relativePath = `progress/session-${timestamp}.md`;
    await updateManifestEntry(relativePath, content);
  } catch (error) {
    await appendAuditLog("compaction_summary_error", String(error));
  }
}

main().catch((error) => {
  console.error("Runner error:", error);
  process.exit(1);
});
