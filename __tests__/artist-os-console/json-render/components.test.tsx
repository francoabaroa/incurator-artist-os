import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DataProvider } from "@json-render/react";
import type { UIElement } from "@json-render/core";
import { Metric } from "@/app/artist-os-console/json-render/components/metrics";
import { RedFlagList } from "@/app/artist-os-console/json-render/components/contracts";
import { Checklist } from "@/app/artist-os-console/json-render/components/planning";

const metricElement: UIElement = {
  key: "metric-1",
  type: "Metric",
  props: {
    label: "Followers",
    value: 1200,
    format: "number",
    trend: "up",
    trendValue: "+12%",
  },
};

const redFlagElement: UIElement = {
  key: "flags",
  type: "RedFlagList",
  props: {
    title: "Issues",
    items: [
      {
        clause: "Section 4.2",
        severity: "critical",
        summary: "Rights in perpetuity",
        recommendation: "Request reversion",
        section: "4.2",
      },
    ],
    showSeverityLegend: true,
  },
};

const checklistElement: UIElement = {
  key: "checklist",
  type: "Checklist",
  props: {
    title: "Checklist",
  },
};

describe("json-render components", () => {
  it("renders Metric with formatted value", () => {
    const markup = renderToStaticMarkup(
      <DataProvider initialData={{}}>
        <Metric element={metricElement} />
      </DataProvider>
    );

    expect(markup).toContain("Followers");
    expect(markup).toContain("1,200");
    expect(markup).toContain("+12%");
  });

  it("renders RedFlagList with severity", () => {
    const markup = renderToStaticMarkup(
      <RedFlagList element={redFlagElement} />
    );

    expect(markup).toContain("Issues");
    expect(markup).toContain("Section 4.2");
    expect(markup).toContain("critical");
  });

  it("renders Checklist when items are missing", () => {
    const markup = renderToStaticMarkup(
      <Checklist element={checklistElement} />
    );

    expect(markup).toContain("Checklist");
  });
});
