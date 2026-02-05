"use client";

import type { ComponentRenderProps } from "@json-render/react";
import type { Format, Size, Tone, Trend } from "../catalog";
import { formatValue, sizeClass, toneClass, useOptionalDataValue, clamp } from "./shared";

export function Metric({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    label?: string;
    value?: string | number | null;
    valuePath?: string | null;
    format?: Format | null;
    trend?: Trend | null;
    trendValue?: string | null;
    benchmark?: string | null;
    subtitle?: string | null;
    size?: Size | null;
  };
  const {
    label,
    value,
    valuePath,
    format,
    trend,
    trendValue,
    benchmark,
    subtitle,
    size,
  } = props;

  const dataValue = useOptionalDataValue(valuePath);
  const resolved = value ?? dataValue ?? null;
  const formatted = formatValue(resolved, format);

  return (
    <div className={`jr-metric ${sizeClass(size ?? "md", "jr-metric")}`}>
      <span className="jr-metric-label">{label}</span>
      <span className="jr-metric-value">{formatted}</span>
      {subtitle && <span className="jr-metric-subtitle">{subtitle}</span>}
      {(trend || trendValue) && (
        <span className={`jr-metric-trend jr-trend-${trend ?? "neutral"}`}>
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "•"} {trendValue}
        </span>
      )}
      {benchmark && <span className="jr-metric-benchmark">{benchmark}</span>}
    </div>
  );
}

export function MetricGrid({ element, children }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    columns?: number | null;
  };
  const { title, columns } = props;

  return (
    <div className="jr-metric-grid">
      {title && <h4>{title}</h4>}
      <div
        className="jr-metric-grid-body"
        style={{ gridTemplateColumns: `repeat(${columns ?? 2}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    label?: string | null;
    value?: number;
    max?: number;
    tone?: Tone | null;
    format?: "percent" | "number" | null;
    showValue?: boolean | null;
  };
  const { label, value = 0, max = 100, tone, format, showValue } = props;

  const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const display =
    format === "percent"
      ? `${percent.toFixed(1)}%`
      : format === "number"
        ? `${value}/${max}`
        : `${Math.round(percent)}%`;

  return (
    <div className={`jr-progress ${toneClass(tone)}`}>
      <div className="jr-progress-header">
        {label && <span>{label}</span>}
        {showValue && <span>{display}</span>}
      </div>
      <div className="jr-progress-track">
        <div className="jr-progress-bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Benchmark({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    label?: string;
    current?: number;
    target?: number;
    format?: Format | null;
    stage?: string | null;
    description?: string | null;
  };
  const { label, current = 0, target = 0, format, stage, description } = props;

  const delta = current - target;
  const tone: Tone = delta >= 0 ? "success" : "warning";

  return (
    <div className={`jr-benchmark ${toneClass(tone)}`}>
      <div className="jr-benchmark-header">
        <span className="jr-benchmark-label">{label}</span>
        {stage && <span className="jr-benchmark-stage">{stage}</span>}
      </div>
      <div className="jr-benchmark-values">
        <span>{formatValue(current, format)}</span>
        <span className="jr-benchmark-target">Target {formatValue(target, format)}</span>
      </div>
      {description && <p className="jr-benchmark-description">{description}</p>}
      <span className="jr-benchmark-delta">
        {delta >= 0 ? "+" : ""}
        {formatValue(delta, format)} vs target
      </span>
    </div>
  );
}
