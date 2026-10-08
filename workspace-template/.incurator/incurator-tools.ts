import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { appendCommitLog } from "./audit";
import { extractSingleWavFromZip, ArchiveExtractionError } from "./archive";
import {
  normalizeWorkspacePath as normalizeWorkspacePathBase,
  isProtectedPath,
  isAppendOnlyPath,
} from "./guardrails";
import {
  type BioGenerationResponse,
  createIncuratorAgentClient,
  IncuratorAgentClientError,
  type MasteringResponse,
  type UploadInitResponse,
} from "./incurator-agent-client";
import { removeManifestEntry } from "./manifest";
import { normalizeTaskStatuses } from "./normalization";
import { safeReadFile, safeWriteFile } from "./safe-fs";
import { validateWorkspaceFiles } from "./validation";

function getWorkspaceRoot() {
  return process.env.WORKSPACE_ROOT ?? "/vercel/sandbox/workspace";
}

const TASK_BACKLOG_PATH = "tasks/backlog.json";
const RELEASES_DIRECTORY = "releases/";
const WAV_EXTENSION = ".wav";
const DEFAULT_MASTERING_BIT_DEPTH = "24";
const MASTERING_BIT_DEPTHS = new Set(["16", "24", "64"]);
type AudioFormat = "wav";

export interface IncuratorBridgeConfig {
  apiUrl: string;
  serviceToken: string;
}

export interface CreateIncuratorMcpToolsOptions {
  bridgeConfig?: IncuratorBridgeConfig;
  enableRemoteTextTools?: boolean;
}

type ToolErrorShape = {
  code: string;
  message: string;
  retryable: boolean;
  failedAtStep?: string;
  uploadCompleted?: boolean;
  savedArchivePath?: string;
};

function normalizeWorkspacePath(relativePath: string) {
  return normalizeWorkspacePathBase(relativePath, getWorkspaceRoot());
}

function toolResult(payload: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload),
      },
    ],
  };
}

function toolError(error: ToolErrorShape) {
  return {
    ...toolResult({
      ok: false,
      error,
    }),
    isError: true as const,
  };
}

function getAudioFormatFromPath(relativePath: string): AudioFormat | null {
  return path.extname(relativePath).toLowerCase() === WAV_EXTENSION ? "wav" : null;
}

function resolveAudioPathError(
  target: "Input" | "Output",
  filePath: string,
  failedAtStep: string
): ToolErrorShape {
  return {
    code: "INVALID_PATH",
    message: `${target} path must be a WAV file under releases/: ${filePath}`,
    retryable: false,
    failedAtStep,
  };
}

function resolveWritableOutputPath(
  outputPath: string,
  failedAtStep?: string
):
  | {
      ok: true;
      path: { fullPath: string; relativePath: string };
    }
  | {
      ok: false;
      error: ToolErrorShape;
    } {
  const outputNormalized = normalizeWorkspacePath(outputPath);
  if (!outputNormalized) {
    return {
      ok: false,
      error: {
        code: "INVALID_PATH",
        message: `Output path is outside the workspace: ${outputPath}`,
        retryable: false,
        failedAtStep,
      },
    };
  }

  if (isProtectedPath(outputNormalized.relativePath)) {
    return {
      ok: false,
      error: {
        code: "PROTECTED_PATH",
        message: `Path is protected and cannot be modified: ${outputNormalized.relativePath}`,
        retryable: false,
        failedAtStep,
      },
    };
  }

  if (isAppendOnlyPath(outputNormalized.relativePath)) {
    return {
      ok: false,
      error: {
        code: "APPEND_ONLY_PATH",
        message: `Path is append-only and cannot be overwritten: ${outputNormalized.relativePath}`,
        retryable: false,
        failedAtStep,
      },
    };
  }

  return { ok: true, path: outputNormalized };
}

function resolveMasteringInputPath(inputPath: string):
  | {
      ok: true;
      path: { fullPath: string; relativePath: string };
      format: AudioFormat;
    }
  | {
      ok: false;
      error: ToolErrorShape;
    } {
  const inputNormalized = normalizeWorkspacePath(inputPath);
  if (!inputNormalized) {
    return {
      ok: false,
      error: {
        code: "INVALID_PATH",
        message: `Input path is outside the workspace: ${inputPath}`,
        retryable: false,
        failedAtStep: "read_input",
      },
    };
  }

  const inputFormat = getAudioFormatFromPath(inputNormalized.relativePath);
  if (
    !inputNormalized.relativePath.startsWith(RELEASES_DIRECTORY) ||
    !inputFormat
  ) {
    return {
      ok: false,
      error: resolveAudioPathError("Input", inputPath, "read_input"),
    };
  }

  return { ok: true, path: inputNormalized, format: inputFormat };
}

function resolveMasteringOutputPath(
  outputPath: string
):
  | {
      ok: true;
      path: { fullPath: string; relativePath: string };
      format: AudioFormat;
    }
  | {
      ok: false;
      error: ToolErrorShape;
    } {
  const outputPathResult = resolveWritableOutputPath(outputPath, "write_output");
  if (!outputPathResult.ok) {
    return outputPathResult;
  }

  if (!outputPathResult.path.relativePath.startsWith(RELEASES_DIRECTORY)) {
    return {
      ok: false,
      error: resolveAudioPathError("Output", outputPath, "write_output"),
    };
  }

  const outputExtension = path.extname(outputPathResult.path.relativePath).toLowerCase();
  const outputFormat = getAudioFormatFromPath(outputPathResult.path.relativePath);
  if (outputFormat) {
    return {
      ok: true,
      path: outputPathResult.path,
      format: outputFormat,
    };
  }

  if (outputExtension.length > 0) {
    return {
      ok: false,
      error: resolveAudioPathError("Output", outputPath, "write_output"),
    };
  }

  const outputPathWithFormatResult = resolveWritableOutputPath(
    `${outputPathResult.path.relativePath}${WAV_EXTENSION}`,
    "write_output"
  );
  if (!outputPathWithFormatResult.ok) {
    return outputPathWithFormatResult;
  }

  return {
    ok: true,
    path: outputPathWithFormatResult.path,
    format: "wav",
  };
}

async function rollbackInvalidJsonWrite(
  relativePath: string,
  backupContent: string | null,
  toolName: string,
  validationError: string,
  failedAtStep?: string
): Promise<ToolErrorShape> {
  try {
    if (backupContent !== null) {
      await appendCommitLog(
        relativePath,
        "update",
        backupContent,
        toolName,
        validationError
      );
      await safeWriteFile(relativePath, backupContent, {
        allowOverwrite: true,
        forceWrite: true,
        toolName,
      });
    } else {
      await fs.rm(path.join(getWorkspaceRoot(), relativePath), { force: true });
      await appendCommitLog(relativePath, "delete", "", toolName, validationError);
      await removeManifestEntry(relativePath);
    }
  } catch (error) {
    return {
      ...toUnknownError(
        error,
        "ROLLBACK_FAILED",
        `Output failed workspace validation and rollback failed for ${relativePath}.`,
        false
      ),
      failedAtStep,
    };
  }

  return {
    code: "OUTPUT_VALIDATION_FAILED",
    message: `Output failed workspace validation and was rolled back: ${validationError}`,
    retryable: false,
    failedAtStep,
  };
}

async function writeWorkspaceOutput(params: {
  relativePath: string;
  content: string | Buffer;
  toolName: string;
  writeErrorMessage: string;
  failedAtStep?: string;
}): Promise<{ ok: true } | { ok: false; error: ToolErrorShape }> {
  const backupContent = params.relativePath.endsWith(".json")
    ? await safeReadFile(params.relativePath)
    : null;

  let content = params.content;
  if (params.relativePath === TASK_BACKLOG_PATH && typeof content === "string") {
    const normalized = normalizeTaskStatuses(content);
    content = normalized.content;
  }

  try {
    await safeWriteFile(params.relativePath, content, {
      allowOverwrite: true,
      toolName: params.toolName,
    });
  } catch (error) {
    return {
      ok: false,
      error: {
        ...toUnknownError(error, "WRITE_FAILED", params.writeErrorMessage, true),
        failedAtStep: params.failedAtStep,
      },
    };
  }

  if (!params.relativePath.endsWith(".json")) {
    return { ok: true };
  }

  const validationResult = await validateWorkspaceFiles(params.relativePath);
  if (validationResult.success) {
    return { ok: true };
  }

  return {
    ok: false,
    error: await rollbackInvalidJsonWrite(
      params.relativePath,
      backupContent,
      params.toolName,
      validationResult.error,
      params.failedAtStep
    ),
  };
}

function toUnknownError(error: unknown, fallbackCode: string, fallbackMessage: string, retryable = true) {
  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message || fallbackMessage,
      retryable,
    };
  }

  return {
    code: fallbackCode,
    message: fallbackMessage,
    retryable,
  };
}

function toToolErrorShape(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
  retryable = true
): ToolErrorShape {
  if (error instanceof IncuratorAgentClientError) {
    return error.toShape();
  }

  return toUnknownError(error, fallbackCode, fallbackMessage, retryable);
}

function normalizeBitDepths(
  bitDepths?: Array<string | number>
): string[] | null {
  if (!bitDepths || bitDepths.length === 0) {
    return [DEFAULT_MASTERING_BIT_DEPTH];
  }

  const normalized = Array.from(
    new Set(bitDepths.map((value) => String(value).trim()))
  );
  if (
    normalized.length === 0 ||
    normalized.some((value) => !MASTERING_BIT_DEPTHS.has(value))
  ) {
    return null;
  }

  return normalized;
}

async function preserveMasteringArchive(
  outputRelativePath: string,
  archiveBytes: Buffer
): Promise<
  | {
      ok: true;
      archivePath: string;
    }
  | {
      ok: false;
      error: ToolErrorShape;
    }
> {
  const archivePath = `${outputRelativePath}.zip`;
  const writeResult = await writeWorkspaceOutput({
    relativePath: archivePath,
    content: archiveBytes,
    toolName: "incurator_master_track",
    writeErrorMessage: `Failed to save mastering archive to ${archivePath}.`,
    failedAtStep: "extract_archive",
  });
  if (!writeResult.ok) {
    return writeResult;
  }

  return {
    ok: true,
    archivePath,
  };
}

export function createIncuratorMcpTools(
  options: CreateIncuratorMcpToolsOptions = {}
) {
  const bridgeConfig = options.bridgeConfig;
  const incuratorClient = bridgeConfig
    ? createIncuratorAgentClient(bridgeConfig)
    : null;
  const tools = [];

  if (options.enableRemoteTextTools) {
    tools.push(
      tool(
        "incurator_generate_bio",
        "Generate a professional artist bio using the Incurator backend service. Returns the generated bio text. The bio is also saved to the specified workspace file path. Example: generate a 'professional' style bio and save to 'brand/bio-professional.md'.",
        {
          style: z
            .enum(["professional", "casual", "press", "social"])
            .describe("Bio style/tone"),
          length: z
            .enum(["short", "medium", "long"])
            .optional()
            .describe("Bio length, defaults to medium"),
          outputPath: z
            .string()
            .describe("Workspace-relative path to save the bio, e.g. 'brand/bio.md'"),
        },
        async (args) => {
          if (!incuratorClient) {
            return toolError({
              code: "MISSING_CONFIGURATION",
              message: "INCURATOR_API_URL and ARTIST_OS_SERVICE_TOKEN are required.",
              retryable: false,
            });
          }

          const outputPathResult = resolveWritableOutputPath(args.outputPath);
          if (!outputPathResult.ok) {
            return toolError(outputPathResult.error);
          }
          const outputNormalized = outputPathResult.path;

          let artistProfile: Record<string, unknown>;
          try {
            const profilePath = path.join(getWorkspaceRoot(), "profile", "artist.json");
            const profileRaw = await fs.readFile(profilePath, "utf-8");
            artistProfile = JSON.parse(profileRaw) as Record<string, unknown>;
          } catch (error) {
            return toolError({
              ...toUnknownError(
                error,
                "PROFILE_READ_FAILED",
                "Failed to read profile/artist.json.",
                false
              ),
            });
          }

          let bioResponse: BioGenerationResponse;
          try {
            bioResponse = await incuratorClient.generateBio({
              style: args.style,
              length: args.length,
              artistProfile,
            });
          } catch (error) {
            return toolError(
              toToolErrorShape(
                error,
                "BIO_GENERATION_FAILED",
                "Bio generation failed.",
                true
              )
            );
          }

          const writeResult = await writeWorkspaceOutput({
            relativePath: outputNormalized.relativePath,
            content: bioResponse.bio,
            toolName: "incurator_generate_bio",
            writeErrorMessage: `Failed to save bio to ${args.outputPath}.`,
          });
          if (!writeResult.ok) {
            return toolError(writeResult.error);
          }

          return toolResult({
            ok: true,
            bio: bioResponse.bio,
            savedTo: outputNormalized.relativePath,
          });
        }
      )
    );
  }

  tools.push(
    tool(
      "incurator_master_track",
      "Send a WAV file from releases/ to the Incurator mastering service. The tool initializes a direct upload, sends the WAV bytes to Blob storage, requests mastering, unpacks the returned ZIP archive, and saves the mastered WAV back into the workspace.",
      {
        inputPath: z
          .string()
          .describe("Workspace-relative path to the WAV file to master"),
        outputPath: z
          .string()
          .describe("Workspace-relative path to save the mastered WAV file"),
        bitDepths: z
          .array(
            z.union([
              z.literal(16),
              z.literal(24),
              z.literal(64),
              z.literal("16"),
              z.literal("24"),
              z.literal("64"),
            ])
          )
          .optional()
          .describe("Optional mastering bit depths. Defaults to [24]."),
      },
      async (args) => {
        if (!incuratorClient) {
          return toolError({
            code: "MISSING_CONFIGURATION",
            message: "INCURATOR_API_URL and ARTIST_OS_SERVICE_TOKEN are required.",
            retryable: false,
          });
        }

        const inputPathResult = resolveMasteringInputPath(args.inputPath);
        if (!inputPathResult.ok) {
          return toolError(inputPathResult.error);
        }
        const inputNormalized = inputPathResult.path;

        const outputPathResult = resolveMasteringOutputPath(args.outputPath);
        if (!outputPathResult.ok) {
          return toolError(outputPathResult.error);
        }
        const outputNormalized = outputPathResult.path;

        if (inputNormalized.relativePath === outputNormalized.relativePath) {
          return toolError({
            code: "INVALID_REQUEST",
            message: "Output path must differ from input path for mastering.",
            retryable: false,
            failedAtStep: "write_output",
          });
        }

        const normalizedBitDepths = normalizeBitDepths(
          args.bitDepths as Array<string | number> | undefined
        );
        if (!normalizedBitDepths) {
          return toolError({
            code: "INVALID_REQUEST",
            message: "bitDepths must be a subset of 16, 24, or 64.",
            retryable: false,
            failedAtStep: "mastering",
          });
        }

        let inputBytes: Buffer;
        try {
          inputBytes = await fs.readFile(inputNormalized.fullPath);
        } catch (error) {
          return toolError({
            ...toUnknownError(
              error,
              "INPUT_READ_FAILED",
              `Could not read input file: ${args.inputPath}`,
              false
            ),
            failedAtStep: "read_input",
          });
        }

        const fileName = path.basename(inputNormalized.relativePath);

        let uploadInit: UploadInitResponse;
        try {
          uploadInit = await incuratorClient.initializeAudioUpload({
            filename: fileName,
            contentType: "audio/wav",
            fileSizeBytes: inputBytes.byteLength,
          });
          await incuratorClient.uploadAudioBytes({
            uploadUrl: uploadInit.uploadUrl,
            clientToken: uploadInit.clientToken,
            method: uploadInit.method,
            contentType: "audio/wav",
            bytes: inputBytes,
          });
        } catch (error) {
          return toolError({
            ...toToolErrorShape(
              error,
              "UPLOAD_FAILED",
              "Failed to upload source audio for mastering.",
              true
            ),
            failedAtStep: "upload",
          });
        }

        let masteringResponse: MasteringResponse;
        try {
          masteringResponse = await incuratorClient.runMastering({
            pathname: uploadInit.pathname,
            format: "wav",
            bitDepths: normalizedBitDepths,
          });
        } catch (error) {
          return toolError({
            ...toToolErrorShape(
              error,
              "MASTERING_FAILED",
              "Mastering request failed.",
              true
            ),
            failedAtStep: "mastering",
            uploadCompleted: true,
          });
        }

        let archiveBytes: Buffer;
        try {
          const resultResponse = await fetch(masteringResponse.resultUrl);
          if (!resultResponse.ok) {
            return toolError({
              code: "RESULT_DOWNLOAD_FAILED",
              message: `Failed to download mastering archive (${resultResponse.status}).`,
              retryable: resultResponse.status >= 500,
              failedAtStep: "download_result",
              uploadCompleted: true,
            });
          }
          archiveBytes = Buffer.from(await resultResponse.arrayBuffer());
        } catch (error) {
          return toolError({
            ...toUnknownError(
              error,
              "RESULT_DOWNLOAD_FAILED",
              "Failed to download mastering archive.",
              true
            ),
            failedAtStep: "download_result",
            uploadCompleted: true,
          });
        }

        let masteredBytes: Buffer;
        try {
          masteredBytes = extractSingleWavFromZip(archiveBytes).data;
        } catch (error) {
          const archiveResult = await preserveMasteringArchive(
            outputNormalized.relativePath,
            archiveBytes
          );
          if (!archiveResult.ok) {
            return toolError(archiveResult.error);
          }

          const extractionError =
            error instanceof ArchiveExtractionError
              ? error
              : new ArchiveExtractionError(
                  "ARCHIVE_EXTRACTION_FAILED",
                  "Failed to extract the mastering archive."
                );

          return toolError({
            code: extractionError.code,
            message: `${extractionError.message} Saved raw archive to ${archiveResult.archivePath}.`,
            retryable: false,
            failedAtStep: "extract_archive",
            uploadCompleted: true,
            savedArchivePath: archiveResult.archivePath,
          });
        }

        const writeResult = await writeWorkspaceOutput({
          relativePath: outputNormalized.relativePath,
          content: masteredBytes,
          toolName: "incurator_master_track",
          writeErrorMessage: `Failed to save mastered WAV to ${args.outputPath}.`,
          failedAtStep: "write_output",
        });
        if (!writeResult.ok) {
          return toolError(writeResult.error);
        }

        return toolResult({
          ok: true,
          outputPath: outputNormalized.relativePath,
          format: "wav",
          archiveFormat: masteringResponse.archiveFormat,
          duration: masteringResponse.duration,
          sourcePathname: uploadInit.pathname,
        });
      }
    )
  );

  return createSdkMcpServer({
    name: "incurator-tools",
    version: "1.0.0",
    tools,
  });
}
