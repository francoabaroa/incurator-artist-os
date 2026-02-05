"use client";

import type { ComponentRenderProps } from "@json-render/react";
import type { ReactNode } from "react";
import type { ActionRef, Align, Size, Tone } from "../catalog";
import { alignStyle, normalizeAction, sanitizeHref, sizeClass, toneClass } from "./shared";

const iconMap: Record<string, ReactNode> = {
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5A2.25 2.25 0 0 1 10.5 2.25h4.5A2.25 2.25 0 0 1 17.25 4.5v9A2.25 2.25 0 0 1 15 15.75H10.5A2.25 2.25 0 0 1 8.25 13.5v-9Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 6.75H6A2.25 2.25 0 0 0 3.75 9v10.5A2.25 2.25 0 0 0 6 21.75h7.5A2.25 2.25 0 0 0 15.75 19.5v-.75"
      />
    </svg>
  ),
  "external-link": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6.75H18m0 0v4.5m0-4.5L10.5 14.25"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 14.25V18A2.25 2.25 0 0 1 15.75 20.25H6A2.25 2.25 0 0 1 3.75 18V8.25A2.25 2.25 0 0 1 6 6h3.75"
      />
    </svg>
  ),
};

export function Button({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    label?: string;
    variant?: Tone | null;
    size?: Size | null;
    action?: ActionRef;
    disabled?: boolean | null;
    icon?: string | null;
  };
  const { label, variant, size, action, disabled, icon } = props;

  return (
    <button
      className={`jr-button ${toneClass(variant)} ${sizeClass(size ?? "md", "jr-button")}`}
      type="button"
      onClick={() => action && onAction?.(normalizeAction(action))}
      disabled={Boolean(disabled) || !action}
    >
      {icon && <span className="jr-button-icon">{iconMap[icon] ?? icon}</span>}
      {label}
    </button>
  );
}

export function ButtonGroup({ element, children }: ComponentRenderProps) {
  const props = (element.props ?? {}) as { alignment?: Align | null };
  const { alignment } = props;
  return (
    <div className="jr-button-group" style={alignStyle(alignment)}>
      {children}
    </div>
  );
}

export function Link({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    label?: string;
    href?: string;
    tone?: Tone | null;
    external?: boolean | null;
  };
  const { label, href, tone, external } = props;

  return (
    <a
      className={`jr-link ${toneClass(tone)}`}
      href={sanitizeHref(href)}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {label}
    </a>
  );
}
