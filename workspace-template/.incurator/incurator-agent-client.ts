import { z } from "zod";

const CAPABILITIES_PATH = "/api/agent/v1/capabilities";
const CANONICAL_ARTIST_HEADER = "x-agent-artist-id";
const CANONICAL_INCURATOR_USER_HEADER = "x-agent-incurator-user-id";

const AgentErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
      retryable: z.boolean().optional(),
    })
    .optional(),
  requestId: z.string().optional(),
});

const CapabilityManifestSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    version: z.literal("v1"),
    headers: z.object({
      artistId: z.string().min(1),
      incuratorUserId: z.string().min(1),
      deprecatedAliases: z.array(z.string()).optional().default([]),
    }),
    capabilities: z.object({
      uploadAudio: z.object({
        path: z.string().min(1),
        method: z.string().optional().default("POST"),
      }),
      mastering: z.object({
        path: z.string().min(1),
        method: z.string().optional().default("POST"),
      }),
      bioGeneration: z
        .object({
          path: z.string().min(1),
          method: z.string().optional().default("POST"),
        })
        .optional(),
    }),
  }),
  requestId: z.string().optional(),
});

const UploadInitSchema = z.object({
  uploadUrl: z.string().min(1),
  clientToken: z.string().min(1),
  pathname: z.string().min(1),
  method: z.string().optional().default("PUT"),
  expiresAt: z.string().optional(),
});

const MasteringResponseSchema = z.object({
  resultUrl: z.string().min(1),
  archiveFormat: z.string().min(1),
  containedAudioFormat: z.string().min(1),
  duration: z.number().optional(),
});

const BioGenerationSchema = z.object({
  bio: z.string().min(1),
  style: z.string().optional(),
});

interface AgentBridgeConfig {
  apiUrl: string;
  serviceToken: string;
}

interface RuntimeContext {
  apiUrl: string;
  serviceToken: string;
  artistId: string;
  incuratorUserId: string;
}

export interface IncuratorClientErrorShape {
  code: string;
  message: string;
  retryable: boolean;
  failedAtStep?: string;
}

export class IncuratorAgentClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly failedAtStep?: string;

  constructor(shape: IncuratorClientErrorShape) {
    super(shape.message);
    this.name = "IncuratorAgentClientError";
    this.code = shape.code;
    this.retryable = shape.retryable;
    this.failedAtStep = shape.failedAtStep;
  }

  toShape(overrides: Partial<IncuratorClientErrorShape> = {}): IncuratorClientErrorShape {
    return {
      code: overrides.code ?? this.code,
      message: overrides.message ?? this.message,
      retryable: overrides.retryable ?? this.retryable,
      failedAtStep: overrides.failedAtStep ?? this.failedAtStep,
    };
  }
}

export type UploadInitResponse = z.infer<typeof UploadInitSchema>;
export type MasteringResponse = z.infer<typeof MasteringResponseSchema>;
export type BioGenerationResponse = z.infer<typeof BioGenerationSchema>;

function successEnvelopeSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    ok: z.literal(true),
    data: schema,
    requestId: z.string().optional(),
  });
}

function getRuntimeContext(bridgeConfig: AgentBridgeConfig): RuntimeContext {
  const apiUrl = bridgeConfig.apiUrl?.trim();
  const serviceToken = bridgeConfig.serviceToken?.trim();
  const artistId = process.env.AGENT_ARTIST_ID?.trim();
  const incuratorUserId = process.env.AGENT_INCURATOR_USER_ID?.trim();

  if (!apiUrl || !serviceToken) {
    throw new IncuratorAgentClientError({
      code: "MISSING_CONFIGURATION",
      message: "INCURATOR_API_URL and ARTIST_OS_SERVICE_TOKEN are required.",
      retryable: false,
    });
  }

  if (!artistId) {
    throw new IncuratorAgentClientError({
      code: "MISSING_CONTEXT",
      message: "AGENT_ARTIST_ID is required.",
      retryable: false,
    });
  }

  if (!incuratorUserId) {
    throw new IncuratorAgentClientError({
      code: "MISSING_CONTEXT",
      message: "AGENT_INCURATOR_USER_ID is required for app-backed tools.",
      retryable: false,
    });
  }

  return {
    apiUrl: apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`,
    serviceToken,
    artistId,
    incuratorUserId,
  };
}

function buildAgentHeaders(config: RuntimeContext) {
  return {
    Authorization: `Bearer ${config.serviceToken}`,
    [CANONICAL_ARTIST_HEADER]: config.artistId,
    [CANONICAL_INCURATOR_USER_HEADER]: config.incuratorUserId,
  };
}

function resolveEndpointUrl(baseUrl: string, endpointPath: string) {
  return new URL(endpointPath, baseUrl).toString();
}

function assertVersionedCapabilityPath(pathname: string, capabilityName: string) {
  if (!pathname.startsWith("/api/agent/v1/")) {
    throw new IncuratorAgentClientError({
      code: "UNSUPPORTED_BACKEND_CONTRACT",
      message: `Capability manifest reported a non-v1 ${capabilityName} path: ${pathname}`,
      retryable: false,
    });
  }
}

function parseAgentFailure(
  payload: unknown,
  response: Response,
  fallbackCode: string
): IncuratorAgentClientError {
  const parsed = AgentErrorEnvelopeSchema.safeParse(payload);
  if (parsed.success) {
    return new IncuratorAgentClientError({
      code: parsed.data.error?.code ?? fallbackCode,
      message:
        parsed.data.error?.message ??
        `Incurator API request failed with status ${response.status}.`,
      retryable:
        parsed.data.error?.retryable !== undefined
          ? parsed.data.error.retryable
          : response.status >= 500,
    });
  }

  return new IncuratorAgentClientError({
    code: fallbackCode,
    message: `Incurator API request failed with status ${response.status}.`,
    retryable: response.status >= 500,
  });
}

async function parseJsonResponse(response: Response, fallbackCode: string) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new IncuratorAgentClientError({
      code: fallbackCode,
      message: "Incurator API returned a non-JSON response.",
      retryable: true,
    });
  }
}

async function callAgentJson<T extends z.ZodTypeAny>(
  config: RuntimeContext,
  endpointPath: string,
  init: RequestInit,
  schema: T,
  failureCode: string
): Promise<z.infer<T>> {
  const endpointUrl = resolveEndpointUrl(config.apiUrl, endpointPath);
  let response: Response;

  try {
    response = await fetch(endpointUrl, {
      ...init,
      headers: {
        ...buildAgentHeaders(config),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new IncuratorAgentClientError({
      code: "SERVICE_UNREACHABLE",
      message: `Could not connect to Incurator API at ${config.apiUrl.replace(/\/$/, "")}. Confirm the URL is reachable from the sandbox runtime.`,
      retryable: true,
    });
  }

  const payload = await parseJsonResponse(response, "INVALID_RESPONSE");
  if (!response.ok) {
    throw parseAgentFailure(payload, response, failureCode);
  }

  const parsed = successEnvelopeSchema(schema).safeParse(payload);
  if (!parsed.success) {
    const failure = AgentErrorEnvelopeSchema.safeParse(payload);
    if (failure.success) {
      throw new IncuratorAgentClientError({
        code: failure.data.error?.code ?? failureCode,
        message: failure.data.error?.message ?? "Incurator API returned an error.",
        retryable: failure.data.error?.retryable ?? false,
      });
    }

    throw new IncuratorAgentClientError({
      code: "INVALID_RESPONSE",
      message: "Incurator API response did not match the expected schema.",
      retryable: true,
    });
  }

  return (parsed.data as { data: z.infer<T> }).data;
}

function validateCapabilityManifest(
  manifest: z.infer<typeof CapabilityManifestSchema>["data"]
) {
  if (manifest.headers.artistId !== CANONICAL_ARTIST_HEADER) {
    throw new IncuratorAgentClientError({
      code: "UNSUPPORTED_BACKEND_CONTRACT",
      message: `Capability manifest reported unsupported artist header ${manifest.headers.artistId}.`,
      retryable: false,
    });
  }

  if (manifest.headers.incuratorUserId !== CANONICAL_INCURATOR_USER_HEADER) {
    throw new IncuratorAgentClientError({
      code: "UNSUPPORTED_BACKEND_CONTRACT",
      message:
        "Capability manifest did not advertise x-agent-incurator-user-id as the canonical internal-user header.",
      retryable: false,
    });
  }

  assertVersionedCapabilityPath(manifest.capabilities.uploadAudio.path, "uploadAudio");
  assertVersionedCapabilityPath(manifest.capabilities.mastering.path, "mastering");
  if (manifest.capabilities.bioGeneration) {
    assertVersionedCapabilityPath(
      manifest.capabilities.bioGeneration.path,
      "bioGeneration"
    );
  }
}

export function createIncuratorAgentClient(bridgeConfig: AgentBridgeConfig) {
  let capabilitiesPromise:
    | Promise<z.infer<typeof CapabilityManifestSchema>["data"]>
    | null = null;

  async function getCapabilities() {
    if (!capabilitiesPromise) {
      const config = getRuntimeContext(bridgeConfig);
      capabilitiesPromise = callAgentJson(
        config,
        CAPABILITIES_PATH,
        {
          method: "GET",
        },
        CapabilityManifestSchema.shape.data,
        "CAPABILITIES_FAILED"
      )
        .then((manifest) => {
          validateCapabilityManifest(manifest);
          return manifest;
        })
        .catch((error) => {
          capabilitiesPromise = null;
          throw error;
        });
    }

    return capabilitiesPromise;
  }

  return {
    async initializeAudioUpload(input: {
      filename: string;
      contentType: string;
      fileSizeBytes: number;
    }): Promise<UploadInitResponse> {
      const config = getRuntimeContext(bridgeConfig);
      const capabilities = await getCapabilities();
      return callAgentJson(
        config,
        capabilities.capabilities.uploadAudio.path,
        {
          method: capabilities.capabilities.uploadAudio.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        },
        UploadInitSchema,
        "UPLOAD_FAILED"
      );
    },

    async uploadAudioBytes(input: {
      uploadUrl: string;
      clientToken: string;
      method?: string;
      contentType: string;
      bytes: Uint8Array;
    }): Promise<void> {
      const method = (input.method ?? "PUT").toUpperCase();
      if (method !== "PUT") {
        throw new IncuratorAgentClientError({
          code: "UNSUPPORTED_BACKEND_CONTRACT",
          message: `Upload target must use PUT, received ${method}.`,
          retryable: false,
        });
      }

      let response: Response;
      try {
        response = await fetch(input.uploadUrl, {
          method,
          headers: {
            Authorization: `Bearer ${input.clientToken}`,
            "Content-Type": input.contentType,
            "x-content-type": input.contentType,
          },
          body: Buffer.from(input.bytes),
        });
      } catch (error) {
        throw new IncuratorAgentClientError({
          code: "UPLOAD_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Direct audio upload failed.",
          retryable: true,
        });
      }

      if (!response.ok) {
        throw new IncuratorAgentClientError({
          code: "UPLOAD_FAILED",
          message: `Direct audio upload failed with status ${response.status}.`,
          retryable: response.status >= 500,
        });
      }
    },

    async runMastering(input: {
      pathname: string;
      format: "wav";
      bitDepths: string[];
    }): Promise<MasteringResponse> {
      const config = getRuntimeContext(bridgeConfig);
      const capabilities = await getCapabilities();
      const response = await callAgentJson(
        config,
        capabilities.capabilities.mastering.path,
        {
          method: capabilities.capabilities.mastering.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        },
        MasteringResponseSchema,
        "MASTERING_FAILED"
      );

      if (
        response.archiveFormat.toLowerCase() !== "zip" ||
        response.containedAudioFormat.toLowerCase() !== "wav"
      ) {
        throw new IncuratorAgentClientError({
          code: "UNSUPPORTED_BACKEND_CONTRACT",
          message:
            "Mastering response must describe a ZIP archive containing WAV output.",
          retryable: false,
        });
      }

      return response;
    },

    async generateBio(input: {
      style: string;
      length?: string;
      artistProfile: Record<string, unknown>;
    }): Promise<BioGenerationResponse> {
      const config = getRuntimeContext(bridgeConfig);
      const capabilities = await getCapabilities();
      if (!capabilities.capabilities.bioGeneration) {
        throw new IncuratorAgentClientError({
          code: "UNSUPPORTED_BACKEND_CONTRACT",
          message: "Capability manifest did not advertise a bio generation route.",
          retryable: false,
        });
      }

      return callAgentJson(
        config,
        capabilities.capabilities.bioGeneration.path,
        {
          method: capabilities.capabilities.bioGeneration.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        },
        BioGenerationSchema,
        "BIO_GENERATION_FAILED"
      );
    },
  };
}
