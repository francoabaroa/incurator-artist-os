import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { zipSync } from "fflate";

const mockCreateSdkMcpServer = vi.fn((options) => options);
const mockTool = vi.fn((name, description, inputSchema, handler) => ({
  name,
  description,
  inputSchema,
  handler,
}));

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  createSdkMcpServer: (options: unknown) => mockCreateSdkMcpServer(options),
  tool: (
    name: string,
    description: string,
    inputSchema: unknown,
    handler: unknown
  ) => mockTool(name, description, inputSchema, handler),
}));

import { createIncuratorMcpTools } from "../../workspace-template/.incurator/incurator-tools";

function parseToolResponse(result: unknown) {
  const text = (result as { content: Array<{ text: string }> }).content[0]?.text;
  return JSON.parse(text) as Record<string, unknown>;
}

function getToolNames(serverConfig: unknown) {
  return (
    serverConfig as {
      tools: Array<{ name: string }>;
    }
  ).tools.map((entry) => entry.name);
}

function getToolHandler(serverConfig: unknown, toolName: string) {
  const tools = (
    serverConfig as {
      tools: Array<{ name: string; handler: (args: unknown, extra: unknown) => Promise<unknown> }>;
    }
  ).tools;
  const toolDef = tools.find((entry) => entry.name === toolName);
  if (!toolDef) {
    throw new Error(`Tool ${toolName} not found`);
  }
  return toolDef.handler;
}

function buildCapabilitiesResponse() {
  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        version: "v1",
        headers: {
          artistId: "x-agent-artist-id",
          incuratorUserId: "x-agent-incurator-user-id",
          deprecatedAliases: ["x-agent-user-id"],
        },
        capabilities: {
          uploadAudio: {
            path: "/api/agent/v1/files/upload-audio",
            method: "POST",
          },
          mastering: {
            path: "/api/agent/v1/tools/production/mastering",
            method: "POST",
          },
          bioGeneration: {
            path: "/api/agent/v1/tools/marketing/bio-generation",
            method: "POST",
          },
        },
      },
      requestId: "req_caps",
    }),
    { status: 200 }
  );
}

describe("incurator MCP tools", () => {
  const originalWorkspaceRoot = process.env.WORKSPACE_ROOT;
  const originalArtistId = process.env.AGENT_ARTIST_ID;
  const originalIncuratorUserId = process.env.AGENT_INCURATOR_USER_ID;
  const bridgeConfig = {
    apiUrl: "http://localhost:3001",
    serviceToken: "test-service-token",
  };
  let workspaceRoot: string;

  beforeEach(async () => {
    mockCreateSdkMcpServer.mockClear();
    mockTool.mockClear();
    workspaceRoot = await fs.mkdtemp(path.join(tmpdir(), "incurator-tools-test-"));
    await fs.mkdir(path.join(workspaceRoot, "profile"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, "profile", "artist.json"),
      JSON.stringify({
        id: "artist_001",
        stageName: "Nova",
      })
    );

    process.env.WORKSPACE_ROOT = workspaceRoot;
    process.env.AGENT_ARTIST_ID = "artist_001";
    process.env.AGENT_INCURATOR_USER_ID = "123";
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await fs.rm(workspaceRoot, { recursive: true, force: true });

    if (originalWorkspaceRoot !== undefined) {
      process.env.WORKSPACE_ROOT = originalWorkspaceRoot;
    } else {
      delete process.env.WORKSPACE_ROOT;
    }

    if (originalArtistId !== undefined) {
      process.env.AGENT_ARTIST_ID = originalArtistId;
    } else {
      delete process.env.AGENT_ARTIST_ID;
    }

    if (originalIncuratorUserId !== undefined) {
      process.env.AGENT_INCURATOR_USER_ID = originalIncuratorUserId;
    } else {
      delete process.env.AGENT_INCURATOR_USER_ID;
    }
  });

  it("generates a bio via the versioned agent API and saves it to the workspace", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildCapabilitiesResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              bio: "# Nova\n\n**Generated bio**",
              style: "professional",
            },
            requestId: "req_bio",
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({
      bridgeConfig,
      enableRemoteTextTools: true,
    });
    const handler = getToolHandler(serverConfig, "incurator_generate_bio");

    const result = await handler(
      {
        style: "professional",
        length: "medium",
        outputPath: "brand/bio.md",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(true);
    expect(payload.savedTo).toBe("brand/bio.md");

    const savedBio = await fs.readFile(path.join(workspaceRoot, "brand", "bio.md"), "utf-8");
    expect(savedBio).toContain("Generated bio");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/agent/v1/capabilities");
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      "/api/agent/v1/tools/marketing/bio-generation"
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        "x-agent-artist-id": "artist_001",
        "x-agent-incurator-user-id": "123",
      }),
    });

    const commitLog = await fs.readFile(
      path.join(workspaceRoot, ".trace", "commits.jsonl"),
      "utf-8"
    );
    expect(commitLog).toContain('"path":"brand/bio.md"');
    expect(commitLog).toContain('"tool":"incurator_generate_bio"');

    const manifest = JSON.parse(
      await fs.readFile(path.join(workspaceRoot, ".index", "manifest.json"), "utf-8")
    ) as {
      files: Record<string, { size: number }>;
    };
    expect(manifest.files["brand/bio.md"]).toBeDefined();
  });

  it("runs capability preflight, direct upload, mastering, and ZIP extraction", async () => {
    await fs.mkdir(path.join(workspaceRoot, "releases"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "releases", "demo.wav"), Buffer.from([1, 2, 3]));

    const archivedResult = Buffer.from(
      zipSync({
        "demo-mastered.wav": Uint8Array.from([9, 8, 7]),
      })
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildCapabilitiesResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              uploadUrl: "https://blob.example.com/upload/demo.wav",
              clientToken: "blob-client-token",
              pathname: "agent-audio/artist_001/request/demo.wav",
              method: "PUT",
              expiresAt: "2026-03-09T18:00:00.000Z",
            },
            requestId: "req_upload",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              resultUrl: "https://cdn.example.com/mastered.zip",
              archiveFormat: "zip",
              containedAudioFormat: "wav",
              duration: 42,
            },
            requestId: "req_master",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(archivedResult, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({ bridgeConfig });
    const handler = getToolHandler(serverConfig, "incurator_master_track");

    const result = await handler(
      {
        inputPath: "releases/demo.wav",
        outputPath: "releases/demo-mastered",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(true);
    expect(payload.outputPath).toBe("releases/demo-mastered.wav");
    expect(payload.format).toBe("wav");
    expect(payload.sourcePathname).toBe("agent-audio/artist_001/request/demo.wav");
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/agent/v1/capabilities");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/agent/v1/files/upload-audio");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://blob.example.com/upload/demo.wav");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "PUT",
      headers: expect.objectContaining({
        Authorization: "Bearer blob-client-token",
        "x-content-type": "audio/wav",
      }),
    });
    expect(fetchMock.mock.calls[3]?.[0]).toContain(
      "/api/agent/v1/tools/production/mastering"
    );
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      body: JSON.stringify({
        pathname: "agent-audio/artist_001/request/demo.wav",
        format: "wav",
        bitDepths: ["24"],
      }),
    });
    expect(fetchMock.mock.calls[4]?.[0]).toBe("https://cdn.example.com/mastered.zip");

    const output = await fs.readFile(path.join(workspaceRoot, "releases", "demo-mastered.wav"));
    expect(Array.from(output)).toEqual([9, 8, 7]);

    const manifest = JSON.parse(
      await fs.readFile(path.join(workspaceRoot, ".index", "manifest.json"), "utf-8")
    ) as {
      files: Record<string, { size: number }>;
    };
    expect(manifest.files["releases/demo-mastered.wav"]?.size).toBe(3);
  });

  it("preserves the raw archive when ZIP extraction fails", async () => {
    await fs.mkdir(path.join(workspaceRoot, "releases"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "releases", "demo.wav"), Buffer.from([1, 2, 3]));

    const invalidArchive = Buffer.from([9, 8, 7]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildCapabilitiesResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              uploadUrl: "https://blob.example.com/upload/demo.wav",
              clientToken: "blob-client-token",
              pathname: "agent-audio/artist_001/request/demo.wav",
              method: "PUT",
              expiresAt: "2026-03-09T18:00:00.000Z",
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              resultUrl: "https://cdn.example.com/mastered.zip",
              archiveFormat: "zip",
              containedAudioFormat: "wav",
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(invalidArchive, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({ bridgeConfig });
    const handler = getToolHandler(serverConfig, "incurator_master_track");

    const result = await handler(
      {
        inputPath: "releases/demo.wav",
        outputPath: "releases/demo-mastered.wav",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatchObject({
      failedAtStep: "extract_archive",
      savedArchivePath: "releases/demo-mastered.wav.zip",
    });
    expect(result).toMatchObject({ isError: true });

    const savedArchive = await fs.readFile(
      path.join(workspaceRoot, "releases", "demo-mastered.wav.zip")
    );
    expect(Array.from(savedArchive)).toEqual(Array.from(invalidArchive));
  });

  it("returns structured errors when the backend is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({
      bridgeConfig,
      enableRemoteTextTools: true,
    });
    const handler = getToolHandler(serverConfig, "incurator_generate_bio");

    const result = await handler(
      {
        style: "professional",
        outputPath: "brand/bio.md",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatchObject({
      code: "SERVICE_UNREACHABLE",
      retryable: true,
    });
    expect(result).toMatchObject({ isError: true });
  });

  it("registers remote bio generation only when explicitly enabled", async () => {
    const disabledConfig = createIncuratorMcpTools({ bridgeConfig });
    expect(getToolNames(disabledConfig)).toEqual(["incurator_master_track"]);

    const enabledConfig = createIncuratorMcpTools({
      bridgeConfig,
      enableRemoteTextTools: true,
    });
    expect(getToolNames(enabledConfig)).toContain("incurator_generate_bio");
  });

  it("rejects append-only output paths for bio generation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({
      bridgeConfig,
      enableRemoteTextTools: true,
    });
    const handler = getToolHandler(serverConfig, "incurator_generate_bio");

    const result = await handler(
      {
        style: "professional",
        outputPath: "progress/claude-progress.md",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatchObject({
      code: "APPEND_ONLY_PATH",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ isError: true });
  });

  it("rejects append-only output paths for mastering output", async () => {
    await fs.mkdir(path.join(workspaceRoot, "releases"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "releases", "demo.wav"), Buffer.from([1, 2, 3]));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({ bridgeConfig });
    const handler = getToolHandler(serverConfig, "incurator_master_track");

    const result = await handler(
      {
        inputPath: "releases/demo.wav",
        outputPath: "logs/audit.log",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatchObject({
      code: "APPEND_ONLY_PATH",
      failedAtStep: "write_output",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ isError: true });
  });

  it("rejects mastering inputs outside releases/", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({ bridgeConfig });
    const handler = getToolHandler(serverConfig, "incurator_master_track");

    const result = await handler(
      {
        inputPath: "profile/artist.json",
        outputPath: "releases/demo-mastered.wav",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatchObject({
      code: "INVALID_PATH",
      failedAtStep: "read_input",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mastering outputs outside releases WAV files", async () => {
    await fs.mkdir(path.join(workspaceRoot, "releases"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "releases", "demo.wav"), Buffer.from([1, 2, 3]));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({ bridgeConfig });
    const handler = getToolHandler(serverConfig, "incurator_master_track");

    const result = await handler(
      {
        inputPath: "releases/demo.wav",
        outputPath: "tasks/backlog.json",
      },
      {}
    );

    const payload = parseToolResponse(result);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatchObject({
      code: "INVALID_PATH",
      failedAtStep: "write_output",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mastering when output path matches the input file", async () => {
    await fs.mkdir(path.join(workspaceRoot, "releases"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "releases", "demo.wav"), Buffer.from([1, 2, 3]));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const serverConfig = createIncuratorMcpTools({ bridgeConfig });
    const handler = getToolHandler(serverConfig, "incurator_master_track");

    const exactMatchResult = await handler(
      {
        inputPath: "releases/demo.wav",
        outputPath: "releases/demo.wav",
      },
      {}
    );

    expect(parseToolResponse(exactMatchResult)).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        failedAtStep: "write_output",
      },
    });

    const normalizedMatchResult = await handler(
      {
        inputPath: "releases/demo.wav",
        outputPath: "releases/demo",
      },
      {}
    );

    expect(parseToolResponse(normalizedMatchResult)).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        failedAtStep: "write_output",
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
