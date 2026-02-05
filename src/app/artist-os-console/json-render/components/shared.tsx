"use client";

import { useData } from "@json-render/react";
import type { Action } from "@json-render/core";
import type { CSSProperties } from "react";
import type { ActionRef, Format, Tone } from "../catalog";

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatValue(
  value: unknown,
  format?: Format | null,
  currency = "USD"
): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (format === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (format === "percent" && typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(value / 100);
  }

  if (format === "number" && typeof value === "number") {
    return numberFormatter.format(value);
  }

  if (format === "streams" && typeof value === "number") {
    return `${numberFormatter.format(value)} streams`;
  }

  if (format === "date" && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }

  return String(value);
}

export function toneClass(tone?: Tone | null) {
  return tone ? `jr-tone-${tone}` : "jr-tone-default";
}

export function sizeClass(size?: string | null, prefix = "jr-size") {
  return size ? `${prefix}-${size}` : `${prefix}-md`;
}

export function alignStyle(align?: string | null): CSSProperties {
  if (!align) return {};
  const textAlign: Record<string, CSSProperties["textAlign"]> = {
    start: "left",
    center: "center",
    end: "right",
    stretch: "left",
  };
  return { textAlign: textAlign[align] ?? "left" };
}

export function useOptionalDataValue(path?: string | null) {
  const { get } = useData();
  if (!path) return undefined;
  return get(path);
}

export function useOptionalDataArray<T>(path?: string | null) {
  const { get } = useData();
  if (!path) return undefined;
  const value = get(path);
  return Array.isArray(value) ? (value as T[]) : undefined;
}

export const chartPalette = [
  "#4f46e5",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
];

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAction(action: ActionRef): Action {
  const confirm = action.confirm
    ? {
        title: action.confirm.title,
        message: action.confirm.message,
        variant: action.confirm.variant ?? undefined,
      }
    : undefined;

  return {
    name: action.name,
    params: action.params ?? undefined,
    confirm,
  };
}
