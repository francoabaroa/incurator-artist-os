"use client";

import type { ComponentRenderProps } from "@json-render/react";
import type { ChartDatum, Format } from "../catalog";
import { chartPalette, formatValue, useOptionalDataArray } from "./shared";

export function BarChart({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    data?: ChartDatum[] | null;
    dataPath?: string | null;
    format?: Format | null;
    orientation?: "horizontal" | "vertical" | null;
    showValues?: boolean | null;
    height?: number | null;
  };
  const { title, data, dataPath, format, orientation, showValues, height } = props;

  const dataFromPath = useOptionalDataArray<ChartDatum>(dataPath);
  const chartData = data ?? dataFromPath ?? [];
  const maxValue = Math.max(1, ...chartData.map((item) => item.value));
  const isVertical = orientation === "vertical";

  return (
    <div className="jr-chart">
      {title && <h4>{title}</h4>}
      <div
        className={`jr-bar-chart ${isVertical ? "jr-bar-vertical" : ""}`}
        style={{ height: height ?? (isVertical ? 180 : undefined) }}
      >
        {chartData.map((item, index) => {
          const ratio = (item.value / maxValue) * 100;
          const color = chartPalette[index % chartPalette.length];
          return (
            <div key={item.label} className="jr-bar-row">
              <span className="jr-bar-label">{item.label}</span>
              <div className="jr-bar-track">
                <div
                  className="jr-bar-fill"
                  style={{
                    width: isVertical ? undefined : `${ratio}%`,
                    height: isVertical ? `${ratio}%` : undefined,
                    background: color,
                  }}
                />
              </div>
              {showValues && (
                <span className="jr-bar-value">
                  {formatValue(item.value, format)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineChart({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    data?: ChartDatum[] | null;
    dataPath?: string | null;
    format?: Format | null;
    showPoints?: boolean | null;
    height?: number | null;
  };
  const { title, data, dataPath, format, showPoints, height } = props;

  const dataFromPath = useOptionalDataArray<ChartDatum>(dataPath);
  const chartData = data ?? dataFromPath ?? [];
  const maxValue = Math.max(1, ...chartData.map((item) => item.value));
  const width = 240;
  const resolvedHeight = height ?? 140;

  const points = chartData
    .map((item, index) => {
      const x = (index / Math.max(1, chartData.length - 1)) * width;
      const y = resolvedHeight - (item.value / maxValue) * resolvedHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="jr-chart">
      {title && <h4>{title}</h4>}
      <svg
        className="jr-line-chart"
        width="100%"
        height={resolvedHeight}
        viewBox={`0 0 ${width} ${resolvedHeight}`}
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke="var(--jr-accent)"
          strokeWidth="2"
          points={points}
        />
        {showPoints
          ? chartData.map((item, index) => {
              const x =
                (index / Math.max(1, chartData.length - 1)) * width;
              const y =
                resolvedHeight - (item.value / maxValue) * resolvedHeight;
              return (
                <circle
                  key={item.label}
                  cx={x}
                  cy={y}
                  r={3}
                  fill="var(--jr-accent)"
                />
              );
            })
          : null}
      </svg>
      <div className="jr-chart-axis">
        {chartData.map((item) => (
          <div key={item.label} className="jr-chart-axis-item">
            <span>{item.label}</span>
            <strong>{formatValue(item.value, format)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PieChart({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    data?: ChartDatum[] | null;
    dataPath?: string | null;
    format?: Format | null;
    donut?: boolean | null;
    showLegend?: boolean | null;
  };
  const { title, data, dataPath, format, donut, showLegend } = props;

  const dataFromPath = useOptionalDataArray<ChartDatum>(dataPath);
  const chartData = data ?? dataFromPath ?? [];
  const total = chartData.reduce((sum, item) => sum + item.value, 0) || 1;

  const cumulativeTotals = chartData.reduce<number[]>((acc, item) => {
    const nextTotal = (acc[acc.length - 1] ?? 0) + item.value;
    return [...acc, nextTotal];
  }, []);

  const segments = chartData.map((item, index) => {
    const startTotal = cumulativeTotals[index - 1] ?? 0;
    const endTotal = cumulativeTotals[index] ?? item.value;
    const start = (startTotal / total) * 100;
    const end = (endTotal / total) * 100;
    const color = chartPalette[index % chartPalette.length];
    return `${color} ${start}% ${end}%`;
  });

  return (
    <div className="jr-chart">
      {title && <h4>{title}</h4>}
      <div className="jr-pie-layout">
        <div
          className={`jr-pie ${donut ? "jr-pie-donut" : ""}`}
          style={{ background: `conic-gradient(${segments.join(", ")})` }}
        />
        {showLegend && (
          <div className="jr-pie-legend">
            {chartData.map((item, index) => (
              <div key={item.label} className="jr-pie-legend-item">
                <span
                  className="jr-pie-swatch"
                  style={{ background: chartPalette[index % chartPalette.length] }}
                />
                <span>{item.label}</span>
                <strong>{formatValue(item.value, format)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
