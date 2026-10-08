import { beforeEach, describe, expect, it } from "vitest";
import {
  createIncuratorMcpConfig,
  getSessionInstructions,
  readIncuratorBridgeConfigFromEnv,
  resolveSessionMode,
  stripIncuratorBridgeEnv,
} from "../../workspace-template/.incurator/runner-config";

describe("runner-config", () => {
  const originalApiUrl = process.env.INCURATOR_API_URL;
  const originalServiceToken = process.env.ARTIST_OS_SERVICE_TOKEN;
  const originalIncuratorUserId = process.env.AGENT_INCURATOR_USER_ID;
  const originalRemoteTextFlag = process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS;
  const originalLegacyBioFlag = process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL;
  const originalEncodedBridgeConfig = process.env.INCURATOR_BRIDGE_CONFIG_B64;

  beforeEach(() => {
    if (originalApiUrl !== undefined) {
      process.env.INCURATOR_API_URL = originalApiUrl;
    } else {
      delete process.env.INCURATOR_API_URL;
    }

    if (originalServiceToken !== undefined) {
      process.env.ARTIST_OS_SERVICE_TOKEN = originalServiceToken;
    } else {
      delete process.env.ARTIST_OS_SERVICE_TOKEN;
    }

    if (originalIncuratorUserId !== undefined) {
      process.env.AGENT_INCURATOR_USER_ID = originalIncuratorUserId;
    } else {
      delete process.env.AGENT_INCURATOR_USER_ID;
    }

    if (originalRemoteTextFlag !== undefined) {
      process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS = originalRemoteTextFlag;
    } else {
      delete process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS;
    }

    if (originalLegacyBioFlag !== undefined) {
      process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL = originalLegacyBioFlag;
    } else {
      delete process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL;
    }

    if (originalEncodedBridgeConfig !== undefined) {
      process.env.INCURATOR_BRIDGE_CONFIG_B64 = originalEncodedBridgeConfig;
    } else {
      delete process.env.INCURATOR_BRIDGE_CONFIG_B64;
    }
  });

  it("defaults to artist_ops mode for invalid or missing values", () => {
    expect(resolveSessionMode(undefined)).toBe("artist_ops");
    expect(resolveSessionMode("unknown")).toBe("artist_ops");
    expect(resolveSessionMode("artist_ops")).toBe("artist_ops");
  });

  it("returns feature_flow mode when explicitly requested", () => {
    expect(resolveSessionMode("feature_flow")).toBe("feature_flow");
  });

  it("returns mode-specific session instruction text", () => {
    const artistOpsInstructions = getSessionInstructions("artist_ops");
    const featureFlowInstructions = getSessionInstructions("feature_flow");

    expect(artistOpsInstructions).toContain("Prioritize the artist's current request");
    expect(artistOpsInstructions).toContain("text deliverables");
    expect(artistOpsInstructions).toContain("audio mastering");
    expect(featureFlowInstructions).toContain("Work on ONE feature at a time");
    expect(featureFlowInstructions).toContain("passes: true");
  });

  it("skips MCP registration when required env vars are missing", () => {
    delete process.env.INCURATOR_API_URL;
    delete process.env.ARTIST_OS_SERVICE_TOKEN;

    const config = createIncuratorMcpConfig();
    expect(config.mcpServers).toEqual({});
    expect(config.allowedTools).toBeUndefined();
  });

  it("registers Incurator MCP tools with mastering enabled by default", () => {
    process.env.INCURATOR_API_URL = "http://localhost:3001";
    process.env.ARTIST_OS_SERVICE_TOKEN = "test-service-token";
    process.env.AGENT_INCURATOR_USER_ID = "123";

    const config = createIncuratorMcpConfig();
    expect(Object.keys(config.mcpServers)).toContain("incurator-tools");
    expect(config.allowedTools).toContain("mcp__incurator-tools__incurator_master_track");
    expect(config.allowedTools).not.toContain("mcp__incurator-tools__incurator_generate_bio");
  });

  it("does not register app-backed tools when the incurator user id is missing", () => {
    process.env.INCURATOR_API_URL = "http://localhost:3001";
    process.env.ARTIST_OS_SERVICE_TOKEN = "test-service-token";
    delete process.env.AGENT_INCURATOR_USER_ID;

    const config = createIncuratorMcpConfig();
    expect(config.mcpServers).toEqual({});
    expect(config.allowedTools).toBeUndefined();
    expect(config.disabledNote).toContain("x-incurator-user-id");
  });

  it("enables remote text tools when ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS is true", () => {
    process.env.INCURATOR_API_URL = "http://localhost:3001";
    process.env.ARTIST_OS_SERVICE_TOKEN = "test-service-token";
    process.env.AGENT_INCURATOR_USER_ID = "123";
    process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS = "true";

    const config = createIncuratorMcpConfig();
    expect(config.allowedTools).toContain("mcp__incurator-tools__incurator_master_track");
    expect(config.allowedTools).toContain("mcp__incurator-tools__incurator_generate_bio");
  });

  it("supports legacy ARTIST_OS_ENABLE_REMOTE_BIO_TOOL flag", () => {
    process.env.INCURATOR_API_URL = "http://localhost:3001";
    process.env.ARTIST_OS_SERVICE_TOKEN = "test-service-token";
    process.env.AGENT_INCURATOR_USER_ID = "123";
    process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL = "true";

    const config = createIncuratorMcpConfig();
    expect(config.allowedTools).toContain("mcp__incurator-tools__incurator_generate_bio");
  });

  it("reads encoded bridge config for MCP setup", () => {
    delete process.env.INCURATOR_API_URL;
    delete process.env.ARTIST_OS_SERVICE_TOKEN;
    process.env.AGENT_INCURATOR_USER_ID = "123";
    delete process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS;
    delete process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL;
    process.env.INCURATOR_BRIDGE_CONFIG_B64 = Buffer.from(
      JSON.stringify({
        apiUrl: "http://localhost:3001",
        serviceToken: "encoded-token",
        enableRemoteTextTools: true,
      }),
      "utf-8"
    ).toString("base64");

    const bridgeConfig = readIncuratorBridgeConfigFromEnv();
    expect(bridgeConfig).toEqual({
      apiUrl: "http://localhost:3001",
      serviceToken: "encoded-token",
      enableRemoteTextTools: true,
    });

    const config = createIncuratorMcpConfig(bridgeConfig);
    expect(config.allowedTools).toContain("mcp__incurator-tools__incurator_master_track");
    expect(config.allowedTools).toContain("mcp__incurator-tools__incurator_generate_bio");
  });

  it("strips bridge env vars after bootstrapping the MCP server", () => {
    process.env.INCURATOR_API_URL = "http://localhost:3001";
    process.env.ARTIST_OS_SERVICE_TOKEN = "test-service-token";
    process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS = "true";
    process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL = "true";
    process.env.INCURATOR_BRIDGE_CONFIG_B64 = "bridge-config";

    stripIncuratorBridgeEnv();

    expect(process.env.INCURATOR_API_URL).toBeUndefined();
    expect(process.env.ARTIST_OS_SERVICE_TOKEN).toBeUndefined();
    expect(process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS).toBeUndefined();
    expect(process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL).toBeUndefined();
    expect(process.env.INCURATOR_BRIDGE_CONFIG_B64).toBeUndefined();
  });
});
