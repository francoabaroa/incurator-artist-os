import { describe, expect, it } from "vitest";

async function loadNormalization() {
  return await import("../../workspace-template/.incurator/normalization");
}

describe("normalizeTaskStatuses", () => {
  it("normalizes common synonyms to canonical values", async () => {
    const { normalizeTaskStatuses } = await loadNormalization();
    const input = JSON.stringify([
      { id: "t1", status: "todo" },
      { id: "t2", status: "working" },
      { id: "t3", status: "done" },
    ]);

    const result = normalizeTaskStatuses(input);
    expect(result.changed).toBe(true);

    const parsed = JSON.parse(result.content) as Array<{ status?: string }>;
    expect(parsed[0].status).toBe("pending");
    expect(parsed[1].status).toBe("in_progress");
    expect(parsed[2].status).toBe("done");
  });

  it("normalizes canonical values case-insensitively", async () => {
    const { normalizeTaskStatuses } = await loadNormalization();
    const input = JSON.stringify([{ id: "t1", status: "PENDING" }]);

    const result = normalizeTaskStatuses(input);
    expect(result.changed).toBe(true);

    const parsed = JSON.parse(result.content) as Array<{ status?: string }>;
    expect(parsed[0].status).toBe("pending");
  });

  it("leaves unknown statuses unchanged", async () => {
    const { normalizeTaskStatuses } = await loadNormalization();
    const input = JSON.stringify([{ id: "t1", status: "mystery" }]);

    const result = normalizeTaskStatuses(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("ignores non-array JSON", async () => {
    const { normalizeTaskStatuses } = await loadNormalization();
    const input = JSON.stringify({ status: "todo" });

    const result = normalizeTaskStatuses(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });
});
