import { describe, expect, it } from "vitest";
import { streamSSE } from "@/app/artist-os-console/lib/stream-sse";

function createResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

async function collectEvents(response: Response) {
  const events: Array<{ event: string; data: unknown }> = [];
  for await (const event of streamSSE(response)) {
    events.push(event);
  }
  return events;
}

describe("streamSSE", () => {
  it("parses a single event chunk", async () => {
    const response = createResponse([
      "event: status\n",
      "data: {\"phase\":\"sandbox_create\"}\n\n",
    ]);

    const events = await collectEvents(response);

    expect(events).toEqual([
      { event: "status", data: { phase: "sandbox_create" } },
    ]);
  });

  it("handles CRLF delimiters and multiple events", async () => {
    const response = createResponse([
      "event: status\r\n",
      "data: {\"phase\":\"restore_base\"}\r\n\r\n",
      "event: log\r\n",
      "data: {\"stream\":\"stdout\",\"chunk\":\"Hello\"}\r\n\r\n",
    ]);

    const events = await collectEvents(response);

    expect(events).toEqual([
      { event: "status", data: { phase: "restore_base" } },
      { event: "log", data: { stream: "stdout", chunk: "Hello" } },
    ]);
  });

  it("parses events split across chunks", async () => {
    const response = createResponse([
      "event: status\n",
      "data: {\"phase\":\"agent_run_start\"}\n",
      "\n",
    ]);

    const events = await collectEvents(response);

    expect(events).toEqual([
      { event: "status", data: { phase: "agent_run_start" } },
    ]);
  });

  it("skips invalid JSON payloads", async () => {
    const response = createResponse([
      "event: status\n",
      "data: not-json\n\n",
    ]);

    const events = await collectEvents(response);

    expect(events).toEqual([]);
  });
});
