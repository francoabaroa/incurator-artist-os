import {
  createIncuratorMcpTools,
  type IncuratorBridgeConfig,
} from "./incurator-tools";

export type SessionMode = "artist_ops" | "feature_flow";
export interface IncuratorBridgeRuntimeConfig extends IncuratorBridgeConfig {
  enableRemoteTextTools: boolean;
}
export interface IncuratorMcpConfigResult {
  mcpServers: Record<string, unknown>;
  allowedTools?: string[];
  disabledNote?: string;
}

const REMOTE_OPERATION_TOOLS = [
  "mcp__incurator-tools__incurator_master_track",
];
const REMOTE_TEXT_TOOLS = ["mcp__incurator-tools__incurator_generate_bio"];
const LEGACY_REMOTE_BIO_FLAG = "ARTIST_OS_ENABLE_REMOTE_BIO_TOOL";
const ENCODED_BRIDGE_CONFIG_ENV = "INCURATOR_BRIDGE_CONFIG_B64";
const INCURATOR_BRIDGE_ENV_NAMES = [
  "INCURATOR_API_URL",
  "ARTIST_OS_SERVICE_TOKEN",
  "ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS",
  LEGACY_REMOTE_BIO_FLAG,
  ENCODED_BRIDGE_CONFIG_ENV,
] as const;

export const INCURATOR_TOOL_ALLOWLIST = [...REMOTE_OPERATION_TOOLS];

function areRemoteTextToolsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS === "true" ||
    env[LEGACY_REMOTE_BIO_FLAG] === "true"
  );
}

export function readIncuratorBridgeConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): IncuratorBridgeRuntimeConfig | null {
  const encodedConfig = env[ENCODED_BRIDGE_CONFIG_ENV]?.trim();
  if (encodedConfig) {
    try {
      const decoded = JSON.parse(
        Buffer.from(encodedConfig, "base64").toString("utf-8")
      ) as Partial<IncuratorBridgeRuntimeConfig>;

      if (
        typeof decoded.apiUrl === "string" &&
        decoded.apiUrl.trim().length > 0 &&
        typeof decoded.serviceToken === "string" &&
        decoded.serviceToken.trim().length > 0
      ) {
        return {
          apiUrl: decoded.apiUrl.trim(),
          serviceToken: decoded.serviceToken.trim(),
          enableRemoteTextTools: decoded.enableRemoteTextTools === true,
        };
      }
    } catch (error) {
      console.error("Failed to decode Incurator bridge config:", error);
    }
  }

  const apiUrl = env.INCURATOR_API_URL?.trim();
  const serviceToken = env.ARTIST_OS_SERVICE_TOKEN?.trim();
  if (!apiUrl || !serviceToken) {
    return null;
  }

  return {
    apiUrl,
    serviceToken,
    enableRemoteTextTools: areRemoteTextToolsEnabled(env),
  };
}

export function stripIncuratorBridgeEnv(env: NodeJS.ProcessEnv = process.env) {
  for (const envName of INCURATOR_BRIDGE_ENV_NAMES) {
    delete env[envName];
  }
}

export function resolveSessionMode(input: string | undefined): SessionMode {
  return input === "feature_flow" ? "feature_flow" : "artist_ops";
}

export function getSessionInstructions(mode: SessionMode): string {
  if (mode === "feature_flow") {
    return [
      "1. Work on ONE feature at a time",
      "2. Test the feature thoroughly before marking passes: true",
      "3. Update progress notes after each significant step",
      "4. Do NOT remove or edit feature descriptions - only change passes status",
    ].join("\n");
  }

  return [
    "1. Prioritize the artist's current request. Use available tools to complete their task.",
    "2. For text deliverables (bios, press releases, campaign plans, captions), draft/edit directly in workspace files using skills.",
    "3. Use remote Incurator tools for backend processing that cannot run locally (for example audio mastering).",
    "4. Update progress notes after each significant step.",
    "5. If no specific request is given, check tasks/backlog.json for pending work.",
  ].join("\n");
}

export function createIncuratorMcpConfig(
  bridgeConfig: IncuratorBridgeRuntimeConfig | null = readIncuratorBridgeConfigFromEnv(),
  incuratorUserId = process.env.AGENT_INCURATOR_USER_ID?.trim()
): IncuratorMcpConfigResult {
  const mcpServers: Record<string, unknown> = {};
  let allowedTools: string[] | undefined;
  let disabledNote: string | undefined;

  if (bridgeConfig) {
    if (!incuratorUserId) {
      disabledNote =
        "Backend app tools are disabled for this session because the operator did not provide x-incurator-user-id. Local workspace tools still work normally.";
    } else {
      try {
        const allowlist = [...INCURATOR_TOOL_ALLOWLIST];
        if (bridgeConfig.enableRemoteTextTools) {
          allowlist.push(...REMOTE_TEXT_TOOLS);
        }

        mcpServers["incurator-tools"] = createIncuratorMcpTools({
          bridgeConfig: {
            apiUrl: bridgeConfig.apiUrl,
            serviceToken: bridgeConfig.serviceToken,
          },
          enableRemoteTextTools: bridgeConfig.enableRemoteTextTools,
        });
        allowedTools = Array.from(new Set(allowlist));
      } catch (error) {
        console.error("Failed to initialize incurator MCP tools:", error);
      }
    }
  }

  return { mcpServers, allowedTools, disabledNote };
}
