"use client";

import { useMemo, useState } from "react";
import type { ComponentRenderProps } from "@json-render/react";
import type { Format, TableColumn, Tone } from "../catalog";
import { formatValue, toneClass, useOptionalDataArray } from "./shared";

export function Table({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    columns?: TableColumn[];
    rows?: Record<string, unknown>[] | null;
    dataPath?: string | null;
    striped?: boolean | null;
    compact?: boolean | null;
    sortable?: boolean | null;
  };
  const { title, columns, rows, dataPath, striped, compact, sortable } = props;

  const safeColumns = Array.isArray(columns) ? columns : [];
  const dataFromPath = useOptionalDataArray<Record<string, unknown>>(dataPath);
  const tableRows = useMemo(
    () => (Array.isArray(rows) ? rows : dataFromPath ?? []),
    [rows, dataFromPath]
  );

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    if (!sortable || !sortKey) return tableRows;
    const copy = [...tableRows];
    copy.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === "number" && typeof right === "number") {
        return sortDirection === "asc" ? left - right : right - left;
      }
      return sortDirection === "asc"
        ? String(left ?? "").localeCompare(String(right ?? ""))
        : String(right ?? "").localeCompare(String(left ?? ""));
    });
    return copy;
  }, [sortable, sortKey, sortDirection, tableRows]);

  const handleSort = (key: string) => {
    if (!sortable) return;
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortDirection("asc");
      return key;
    });
  };

  return (
    <div className="jr-table">
      {title && <h4>{title}</h4>}
      <table className={compact ? "jr-table-compact" : ""}>
        <thead>
          <tr>
            {safeColumns.map((column) => (
              <th
                key={column.key}
                className={toneClass(column.tone)}
                onClick={() => handleSort(column.key)}
                style={{
                  textAlign: column.align ?? "left",
                  cursor: sortable ? "pointer" : "default",
                }}
              >
                {column.label}
                {sortable && sortKey === column.key && (
                  <span className="jr-table-sort">
                    {sortDirection === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={index} className={striped && index % 2 === 1 ? "jr-table-striped" : ""}>
              {safeColumns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align ?? "left" }}>
                  {renderCell(row[column.key], column.format ?? null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ComparisonTable({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    headers?: string[];
    // Also accept "columns" format like regular Table uses
    columns?: (string | { key?: string; label?: string })[];
    rows?: (
      | { label: string; values: { text: string; tone?: Tone | null }[] }
      | Record<string, unknown>
      | unknown[]
    )[];
  };
  const { title, headers, columns, rows } = props;

  // Normalize headers - accept both "headers" (string[]) and "columns" (array of strings or objects)
  const safeHeaders: string[] = (() => {
    if (Array.isArray(headers) && headers.length > 0) {
      return headers;
    }
    if (Array.isArray(columns) && columns.length > 0) {
      return columns.map((col) => {
        if (typeof col === "string") return col;
        if (typeof col === "object" && col !== null) {
          return (col as { label?: string; key?: string }).label ?? 
                 (col as { key?: string }).key ?? 
                 "";
        }
        return String(col ?? "");
      });
    }
    return [];
  })();

  // Also extract column keys for matching row data
  const columnKeys: string[] = (() => {
    if (Array.isArray(columns) && columns.length > 0) {
      return columns.map((col) => {
        if (typeof col === "string") return col.toLowerCase().replace(/\s+/g, "_");
        if (typeof col === "object" && col !== null) {
          return (col as { key?: string }).key ?? 
                 (col as { label?: string }).label?.toLowerCase().replace(/\s+/g, "_") ?? 
                 "";
        }
        return "";
      });
    }
    return safeHeaders.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  })();

  const safeRows = Array.isArray(rows) ? rows : [];

  // Normalize rows - handle multiple formats
  const normalizedRows = safeRows.map((row) => {
    if (!row) return { label: "", values: [] as { text: string; tone?: Tone | null }[] };

    // Format 1: Array format ["Label", "Value1", "Value2", ...]
    if (Array.isArray(row)) {
      const [label, ...rest] = row;
      const values = rest.map((v) => ({
        text: String(v ?? ""),
        tone: null as Tone | null,
      }));
      return { label: String(label ?? ""), values };
    }

    // Format 2: Structured format { label: "...", values: [{ text: "..." }] }
    if (Array.isArray((row as { values?: unknown }).values)) {
      return row as { label: string; values: { text: string; tone?: Tone | null }[] };
    }

    // Format 3: Dynamic key format { factor: "...", singles: "...", ep: "..." }
    // or { situation: "...", choice: "..." } when using columns prop
    const rowRecord = row as Record<string, unknown>;
    const allKeys = Object.keys(rowRecord);

    // Find label: first key not matching any header/column key
    const labelKey = allKeys.find(
      (k) => 
        !columnKeys.includes(k.toLowerCase()) && 
        !safeHeaders.some((h) => h.toLowerCase() === k.toLowerCase())
    );
    const label = labelKey ? String(rowRecord[labelKey] ?? "") : "";

    // Build values from header/column keys
    const values = columnKeys.map((colKey, idx) => {
      const header = safeHeaders[idx] ?? colKey;
      const headerLower = header.toLowerCase();
      const headerSnake = header.toLowerCase().replace(/\s+/g, "_");
      const matchedKey = allKeys.find(
        (k) =>
          k === colKey ||
          k.toLowerCase() === colKey.toLowerCase() ||
          k === header ||
          k.toLowerCase() === headerLower ||
          k.toLowerCase() === headerSnake
      );
      const text = matchedKey ? String(rowRecord[matchedKey] ?? "") : "";
      return { text, tone: null as Tone | null };
    });

    return { label, values };
  });

  return (
    <div className="jr-table">
      {title && <h4>{title}</h4>}
      <table>
        <thead>
          <tr>
            <th>Category</th>
            {safeHeaders.map((header, idx) => (
              <th key={`header-${idx}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {normalizedRows.map((row, rowIdx) => {
            const safeValues = Array.isArray(row?.values) ? row.values : [];
            return (
              <tr key={`row-${rowIdx}`}>
                <td className="jr-table-row-label">{row?.label ?? ""}</td>
                {safeValues.map((value, index) => (
                  <td key={index} className={toneClass(value?.tone)}>
                    {value?.text ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function KeyValueList({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    items?: {
      label: string;
      value: string | number;
      tone?: Tone | null;
      format?: Format | null;
    }[];
    compact?: boolean | null;
  };
  const { title, items, compact } = props;

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className={`jr-kv ${compact ? "jr-kv-compact" : ""}`}>
      {title && <h4>{title}</h4>}
      <ul>
        {safeItems.map((item, index) => (
          <li key={`kv-${index}`} className={toneClass(item.tone)}>
            <span>{item.label}</span>
            <strong>{formatValue(item.value, item.format ?? null)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderCell(value: unknown, format?: string | null) {
  if (format === "badge") {
    return <span className="jr-table-badge">{String(value ?? "-")}</span>;
  }

  if (
    format === "currency" ||
    format === "percent" ||
    format === "number" ||
    format === "date"
  ) {
    return formatValue(value, format as Format);
  }

  return value === null || value === undefined ? "-" : String(value);
}
