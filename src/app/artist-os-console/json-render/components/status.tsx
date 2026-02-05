"use client";

import { useState } from "react";
import type { ComponentRenderProps } from "@json-render/react";
import type { ReactNode } from "react";
import type { ActionRef, Size, Tone } from "../catalog";
import { normalizeAction, sizeClass, toneClass } from "./shared";

const iconMap: Record<string, ReactNode> = {
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25h1.5v5.25m-.75-9h.008" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86 1.82 18a2.25 2.25 0 0 0 1.93 3.38h16.5a2.25 2.25 0 0 0 1.93-3.38L13.71 3.86a2.25 2.25 0 0 0-3.42 0Z" />
    </svg>
  ),
  lightbulb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 0 0-3.6 10.8c.6.45 1.1 1.1 1.3 1.85l.3 1.35h4l.3-1.35c.2-.75.7-1.4 1.3-1.85A6 6 0 0 0 12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21h6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
};

export function Alert({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    tone?: Tone;
    title?: string;
    message?: string | null;
    dismissible?: boolean | null;
    action?: ActionRef | null;
  };
  const { tone, title, message, dismissible, action } = props;

  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className={`jr-alert ${toneClass(tone)}`}>
      <div>
        <div className="jr-alert-title">{title}</div>
        {message && <p className="jr-alert-message">{message}</p>}
      </div>
      <div className="jr-alert-actions">
        {action && (
          <button
            type="button"
            className="jr-alert-button"
            onClick={() => onAction?.(normalizeAction(action))}
          >
            Action
          </button>
        )}
        {dismissible && (
          <button
            type="button"
            className="jr-alert-dismiss"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export function Badge({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    text?: string;
    tone?: Tone | null;
    size?: Size | null;
  };
  const { text, tone, size } = props;

  return (
    <span className={`jr-badge ${toneClass(tone)} ${sizeClass(size ?? "sm", "jr-badge")}`}>
      {text}
    </span>
  );
}

export function Callout({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    body?: string;
    tone?: Tone | null;
    icon?: string | null;
    action?: ActionRef | null;
  };
  const { title, body, tone, icon, action } = props;

  return (
    <div className={`jr-callout ${toneClass(tone)}`}>
      {icon && <span className="jr-callout-icon">{iconMap[icon] ?? icon}</span>}
      <div className="jr-callout-body">
        {title && <h4>{title}</h4>}
        <p>{body}</p>
        {action && (
          <button
            type="button"
            className="jr-callout-button"
            onClick={() => onAction?.(normalizeAction(action))}
          >
            Take action
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string;
    message?: string | null;
    icon?: string | null;
    action?: ActionRef | null;
    actionLabel?: string | null;
  };
  const { title, message, icon, action, actionLabel } = props;

  return (
    <div className="jr-empty">
      {icon && <div className="jr-empty-icon">{iconMap[icon] ?? icon}</div>}
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action && (
        <button
          type="button"
          className="jr-empty-button"
          onClick={() => onAction?.(normalizeAction(action))}
        >
          {actionLabel ?? "Act"}
        </button>
      )}
    </div>
  );
}
