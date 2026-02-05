import { describe, expect, it } from "vitest";
import {
  parseJsonRenderContent,
  splitJsonRenderFences,
} from "@/app/artist-os-console/json-render/parse";

const keyedTree = {
  root: "card-1",
  elements: {
    "card-1": {
      key: "card-1",
      type: "Card",
      props: { title: "Campaign Overview" },
      children: ["metric-1"],
    },
    "metric-1": {
      key: "metric-1",
      type: "Metric",
      props: { label: "Followers", value: 1200 },
    },
  },
};

describe("splitJsonRenderFences", () => {
  it("returns text-only when no fences", () => {
    const segments = splitJsonRenderFences("Just markdown text");
    expect(segments).toEqual([{ type: "text", content: "Just markdown text" }]);
  });

  it("extracts a single fence", () => {
    const content =
      "Before\n```json-render\n{\"root\":\"x\",\"elements\":{}}\n```\nAfter";
    const segments = splitJsonRenderFences(content);
    expect(segments).toHaveLength(3);
    expect(segments[1]?.type).toBe("json-render");
    expect(segments[1]?.content).toContain("root");
  });

  it("handles multiple fences", () => {
    const content =
      "A\n```json-render\n{}\n```\nB\n```json-render\n{}\n```\nC";
    const segments = splitJsonRenderFences(content);
    expect(segments.filter((seg) => seg.type === "json-render")).toHaveLength(2);
  });

  it("handles fence at start and end", () => {
    const content = "```json-render\n{}\n```middle```json-render\n{}\n```";
    const segments = splitJsonRenderFences(content);
    expect(segments[0]?.type).toBe("json-render");
    expect(segments[segments.length - 1]?.type).toBe("json-render");
  });
});

describe("parseJsonRenderContent", () => {
  it("parses full keyed tree JSON", () => {
    const tree = parseJsonRenderContent(JSON.stringify(keyedTree));
    expect(tree.root).toBe("card-1");
    expect(Object.keys(tree.elements)).toHaveLength(2);
  });

  it("applies JSONL patches", () => {
    const jsonl = [
      "{\"op\":\"set\",\"path\":\"/root\",\"value\":\"root\"}",
      "{\"op\":\"add\",\"path\":\"/elements/root\",\"value\":{\"key\":\"root\",\"type\":\"Card\",\"props\":{\"title\":\"Test\"},\"children\":[\"child\"]}}",
      "{\"op\":\"add\",\"path\":\"/elements/child\",\"value\":{\"key\":\"child\",\"type\":\"Metric\",\"props\":{\"label\":\"Streams\",\"value\":500}}}",
    ].join("\n");

    const tree = parseJsonRenderContent(jsonl);
    expect(tree.root).toBe("root");
    expect(tree.elements["child"]).toBeTruthy();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJsonRenderContent("{oops"))
      .toThrowError(/Invalid JSON/);
  });

  it("throws on missing root/elements", () => {
    expect(() => parseJsonRenderContent("{}"))
      .toThrowError(/Invalid keyed tree/);
  });

  it("respects element cap", () => {
    const elements: Record<string, unknown> = {};
    for (let i = 0; i < 201; i += 1) {
      elements[`k-${i}`] = { key: `k-${i}`, type: "Text", props: { content: "x" } };
    }
    const payload = { root: "k-0", elements };
    expect(() => parseJsonRenderContent(JSON.stringify(payload)))
      .toThrowError(/element limit/);
  });

  it("respects size cap", () => {
    const payload = {
      root: "card-1",
      elements: {
        "card-1": {
          key: "card-1",
          type: "Text",
          props: { content: "a".repeat(60 * 1024) },
        },
      },
    };
    const large = JSON.stringify(payload);
    expect(() => parseJsonRenderContent(large))
      .toThrowError(/size limit/);
  });
});
