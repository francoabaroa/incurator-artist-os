export interface SSEEvent<T = unknown> {
  event: string;
  data: T;
}

export async function* streamSSE<T>(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent<T>> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let dataLines: string[] = [];

  const commitEvent = (): SSEEvent<T> | null => {
    if (!currentEvent || dataLines.length === 0) {
      dataLines = [];
      currentEvent = "";
      return null;
    }

    const dataText = dataLines.join("\n");
    dataLines = [];
    const eventName = currentEvent;
    currentEvent = "";

    try {
      const data = JSON.parse(dataText) as T;
      return { event: eventName, data };
    } catch {
      return null;
    }
  };

  const processLine = (line: string): SSEEvent<T> | null => {
    if (line === "") {
      return commitEvent();
    }

    if (line.startsWith("event:")) {
      currentEvent = line.slice("event:".length).trim();
      return null;
    }

    if (line.startsWith("data:")) {
      const raw = line.slice("data:".length);
      dataLines.push(raw.startsWith(" ") ? raw.slice(1) : raw);
    }

    return null;
  };

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = processLine(line);
        if (event) {
          yield event;
        }
      }
    }

    if (buffer) {
      const event = processLine(buffer);
      if (event) {
        yield event;
      }
    }

    const finalEvent = commitEvent();
    if (finalEvent) {
      yield finalEvent;
    }
  } finally {
    reader.releaseLock();
  }
}
