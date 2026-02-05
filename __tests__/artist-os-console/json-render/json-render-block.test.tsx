import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JsonRenderBlock from "@/app/artist-os-console/components/JsonRenderBlock";

const validPayload = {
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
      props: { label: "Followers", value: 1200, format: "number" },
    },
  },
};

const unknownPayload = {
  root: "mystery",
  elements: {
    mystery: {
      key: "mystery",
      type: "UnknownWidget",
      props: { label: "Mystery" },
    },
  },
};

describe("JsonRenderBlock", () => {
  it("renders valid json-render content", () => {
    const markup = renderToStaticMarkup(
      <JsonRenderBlock content={JSON.stringify(validPayload)} />
    );

    expect(markup).toContain("Campaign Overview");
    expect(markup).toContain("Followers");
  });

  it("renders error state for invalid JSON", () => {
    const markup = renderToStaticMarkup(<JsonRenderBlock content="{bad" />);
    expect(markup).toContain("Invalid json-render payload");
  });

  it("renders fallback for unknown components", () => {
    const markup = renderToStaticMarkup(
      <JsonRenderBlock content={JSON.stringify(unknownPayload)} />
    );
    expect(markup).toContain("Unknown component type");
  });
});
