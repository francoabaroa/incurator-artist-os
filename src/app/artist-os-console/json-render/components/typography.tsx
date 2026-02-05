"use client";

import { Streamdown } from "streamdown";
import type { ComponentRenderProps } from "@json-render/react";
import type { Align, Size, Tone } from "../catalog";
import { alignStyle, sizeClass, toneClass } from "./shared";

export function Heading({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    text?: string;
    level?: "h1" | "h2" | "h3" | "h4" | number | null;
    align?: Align | null;
    tone?: Tone | null;
  };
  const { text, level, align, tone } = props;

  // Normalize level - handle both string ("h1") and number (1) formats
  const normalizeLevel = (lvl: unknown): "h1" | "h2" | "h3" | "h4" => {
    if (typeof lvl === "number") {
      if (lvl >= 1 && lvl <= 4) return `h${lvl}` as "h1" | "h2" | "h3" | "h4";
      return "h2";
    }
    if (typeof lvl === "string") {
      if (["h1", "h2", "h3", "h4"].includes(lvl)) return lvl as "h1" | "h2" | "h3" | "h4";
      // Handle "1", "2", "3", "4" strings
      const num = parseInt(lvl, 10);
      if (num >= 1 && num <= 4) return `h${num}` as "h1" | "h2" | "h3" | "h4";
    }
    return "h2";
  };

  const Tag = normalizeLevel(level);
  return (
    <Tag
      className={`jr-heading ${toneClass(tone)} ${sizeClass(Tag, "jr-heading")}`}
      style={alignStyle(align)}
    >
      {text}
    </Tag>
  );
}

export function Text({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    content?: string;
    tone?: Tone | null;
    size?: Size | null;
    align?: Align | null;
  };
  const { content, tone, size, align } = props;

  return (
    <div
      className={`jr-text ${toneClass(tone)} ${sizeClass(size ?? "md", "jr-text")}`}
      style={alignStyle(align)}
    >
      <div className="jr-markdown">
        <Streamdown>{content}</Streamdown>
      </div>
    </div>
  );
}

export function Caption({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    content?: string;
    tone?: Tone | null;
  };
  const { content, tone } = props;
  return <p className={`jr-caption ${toneClass(tone)}`}>{content}</p>;
}

export function Quote({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    content?: string;
    attribution?: string | null;
    tone?: Tone | null;
  };
  const { content, attribution, tone } = props;
  return (
    <blockquote className={`jr-quote ${toneClass(tone)}`}>
      <p>{content}</p>
      {attribution && <footer>- {attribution}</footer>}
    </blockquote>
  );
}

export function Code({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    content?: string;
    inline?: boolean | null;
    language?: string | null;
  };
  const { content, inline, language } = props;

  if (inline) {
    return <code className="jr-code-inline">{content}</code>;
  }

  return (
    <pre className="jr-code-block">
      <code data-language={language ?? undefined}>{content}</code>
    </pre>
  );
}

export function BulletList({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    items?: string[];
    tone?: Tone | null;
    compact?: boolean | null;
  };
  const { items, tone, compact } = props;

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <ul className={`jr-list ${toneClass(tone)} ${compact ? "jr-list-compact" : ""}`}>
      {safeItems.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function NumberedList({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    items?: string[];
    tone?: Tone | null;
    startFrom?: number | null;
  };
  const { items, tone, startFrom } = props;

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <ol
      className={`jr-list ${toneClass(tone)}`}
      start={startFrom ?? undefined}
    >
      {safeItems.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  );
}
