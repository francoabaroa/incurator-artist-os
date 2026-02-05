import { getByPath, setByPath, type UIElement, type UITree } from "@json-render/core";
import type { JsonRenderSegment } from "./types";

// Closing fence must be at start of line (with optional leading whitespace)
// to avoid matching triple backticks inside JSON strings
const JSON_RENDER_FENCE_REGEX = /```json-render\s*\n([\s\S]*?)\n\s*```/g;
const MAX_JSON_RENDER_BYTES = 50 * 1024;
const MAX_JSON_RENDER_ELEMENTS = 200;

interface JsonPatch {
  op: "add" | "remove" | "replace" | "set" | string;
  path: string;
  value?: unknown;
}

interface RawElement {
  key?: string;
  type?: string;
  props?: Record<string, unknown>;
  children?: Array<string | RawElement>;
  visible?: UIElement["visible"];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isElement(value: unknown): value is RawElement {
  return isPlainObject(value) && typeof value.type === "string";
}

function isPatch(value: unknown): value is JsonPatch {
  return isPlainObject(value) && typeof value.op === "string" && typeof value.path === "string";
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function splitJsonRenderFences(text: string): JsonRenderSegment[] {
  const normalized = normalizeNewlines(text);
  const segments: JsonRenderSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  JSON_RENDER_FENCE_REGEX.lastIndex = 0;

  while ((match = JSON_RENDER_FENCE_REGEX.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: normalized.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "json-render",
      content: match[1] ?? "",
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    segments.push({
      type: "text",
      content: normalized.slice(lastIndex),
    });
  }

  if (segments.length === 0) {
    return [{ type: "text", content: normalized }];
  }

  return segments;
}

export function parseJsonRenderContent(content: string): UITree {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("Empty json-render payload");
  }

  if (trimmed.length > MAX_JSON_RENDER_BYTES) {
    throw new Error("json-render payload exceeds size limit");
  }

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Detect JSONL by checking if all lines start with { and at least one looks like a patch
  if (lines.every((line) => line.startsWith("{"))) {
    // Parse the first line to check if it's a JSONL patch
    const firstParsed = safeJsonParse(lines[0]);
    if (isPatch(firstParsed)) {
      return parseJsonLines(lines);
    }
  }

  const parsed = safeJsonParse(trimmed);
  return normalizeTree(parsed);
}

function parseJsonLines(lines: string[]): UITree {
  const tree: Record<string, unknown> = {};

  for (const line of lines) {
    const patch = safeJsonParse(line) as JsonPatch;
    if (!patch || typeof patch.path !== "string") {
      throw new Error("Invalid JSONL patch format");
    }
    applyPatch(tree, patch);
  }

  return normalizeTree(tree);
}

function applyPatch(tree: Record<string, unknown>, patch: JsonPatch) {
  const rawPath = patch.path ?? "";
  const normalizedPath = rawPath.replace(/\/-$/, "");

  switch (patch.op) {
    case "set":
    case "replace": {
      setByPath(tree, normalizedPath, patch.value);
      return;
    }
    case "add": {
      const parentPath = normalizedPath.split("/").slice(0, -1).join("/") || "/";
      const key = normalizedPath.split("/").pop() ?? "";
      const parent = getByPath(tree, parentPath);

      if (Array.isArray(parent)) {
        if (key === "" || key === "-") {
          parent.push(patch.value);
          return;
        }
        const index = Number.parseInt(key, 10);
        if (Number.isFinite(index)) {
          parent.splice(index, 0, patch.value);
          return;
        }
        parent.push(patch.value);
        return;
      }

      if (isPlainObject(parent)) {
        const existing = parent[key];
        if (Array.isArray(existing)) {
          existing.push(patch.value);
          return;
        }
        if (existing === undefined && key === "children") {
          parent[key] = [patch.value];
          return;
        }
        parent[key] = patch.value;
        return;
      }

      if (key === "children") {
        setByPath(tree, normalizedPath, [patch.value]);
        return;
      }

      setByPath(tree, normalizedPath, patch.value);
      return;
    }
    case "remove": {
      removeByPath(tree, normalizedPath);
      return;
    }
    default: {
      throw new Error(`Unsupported JSONL patch op: ${patch.op}`);
    }
  }
}

function removeByPath(tree: Record<string, unknown>, path: string) {
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  if (segments.length === 0) return;
  const last = segments.pop();
  if (!last) return;
  const parentPath = `/${segments.join("/")}`;
  const parent = getByPath(tree, parentPath);
  if (Array.isArray(parent)) {
    const index = Number.parseInt(last, 10);
    if (Number.isFinite(index)) {
      parent.splice(index, 1);
    }
    return;
  }
  if (isPlainObject(parent)) {
    delete parent[last];
  }
}

function normalizeTree(raw: unknown): UITree {
  if (!isPlainObject(raw)) {
    if (isElement(raw)) {
      return flattenToKeyedTree(raw);
    }
    throw new Error("Invalid json-render payload");
  }

  if (typeof raw.root === "string" && isPlainObject(raw.elements)) {
    const tree = {
      root: raw.root,
      elements: raw.elements as Record<string, UIElement>,
    };
    validateTree(tree);
    return tree;
  }

  if (isElement(raw.root)) {
    const tree = flattenToKeyedTree(raw.root as RawElement);
    if (isPlainObject(raw.elements)) {
      for (const [key, element] of Object.entries(raw.elements)) {
        if (isElement(element)) {
          tree.elements[key] = {
            key,
            type: element.type ?? "Text",
            props: element.props ?? {},
            children: (element.children as string[]) ?? [],
            visible: element.visible,
          };
        }
      }
    }
    validateTree(tree);
    return tree;
  }

  if (isElement(raw)) {
    const tree = flattenToKeyedTree(raw);
    validateTree(tree);
    return tree;
  }

  throw new Error("Invalid keyed tree: missing root or elements");
}

function flattenToKeyedTree(root: RawElement): UITree {
  const elements: Record<string, UIElement> = {};
  let keyCounter = 0;

  const ensureKey = (element: RawElement) => {
    if (element.key && typeof element.key === "string") {
      return element.key;
    }
    keyCounter += 1;
    return `generated-${keyCounter}`;
  };

  const flatten = (element: RawElement): string => {
    const key = ensureKey(element);
    const children: string[] = [];

    if (Array.isArray(element.children)) {
      for (const child of element.children) {
        if (typeof child === "string") {
          children.push(child);
        } else if (isElement(child)) {
          const childKey = flatten(child);
          children.push(childKey);
        }
      }
    }

    elements[key] = {
      key,
      type: element.type ?? "Text",
      props: element.props ?? {},
      children,
      visible: element.visible,
    };

    return key;
  };

  const rootKey = flatten(root);
  return { root: rootKey, elements };
}

function validateTree(tree: UITree) {
  if (!tree.root || typeof tree.root !== "string") {
    throw new Error("Invalid keyed tree: missing root");
  }

  if (!isPlainObject(tree.elements)) {
    throw new Error("Invalid keyed tree: missing elements");
  }

  const elementKeys = Object.keys(tree.elements);
  if (elementKeys.length > MAX_JSON_RENDER_ELEMENTS) {
    throw new Error("json-render payload exceeds element limit");
  }

  if (!tree.elements[tree.root]) {
    throw new Error("Invalid keyed tree: root element not found");
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON: ${String(error)}`);
  }
}
