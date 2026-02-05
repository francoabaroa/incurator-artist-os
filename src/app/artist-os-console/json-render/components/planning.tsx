"use client";

import type { ComponentRenderProps } from "@json-render/react";
import type { Status, Tone } from "../catalog";
import { toneClass } from "./shared";

export function Checklist({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    items?: {
      id: string;
      label: string;
      done: boolean;
      note?: string | null;
      required?: boolean | null;
    }[];
    showProgress?: boolean | null;
  };
  const { title, items, showProgress } = props;

  const safeItems = Array.isArray(items) ? items : [];
  const doneCount = safeItems.filter((item) => item.done).length;

  return (
    <div className="jr-checklist">
      {title && <h4>{title}</h4>}
      {showProgress && (
        <p className="jr-checklist-progress">
          {doneCount}/{safeItems.length} complete
        </p>
      )}
      <ul>
        {safeItems.map((item) => (
          <li key={item.id} className={item.done ? "done" : ""}>
            <span className="jr-checkmark">{item.done ? "✓" : "○"}</span>
            <div>
              <span className="jr-checklist-label">
                {item.label}
                {item.required && <span className="jr-required">Required</span>}
              </span>
              {item.note && <span className="jr-checklist-note">{item.note}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Timeline({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    items?: {
      label: string;
      date?: string | null;
      description?: string | null;
      status?: Status | null;
      icon?: string | null;
    }[];
    showConnectors?: boolean | null;
  };
  const { title, items, showConnectors } = props;

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="jr-timeline">
      {title && <h4>{title}</h4>}
      <ul>
        {safeItems.map((item, index) => (
          <li key={item.label} className={toneClass(statusTone(item.status))}>
            <div className="jr-timeline-marker">
              <span>{item.icon ?? "•"}</span>
              {showConnectors && index < safeItems.length - 1 && (
                <span className="jr-timeline-connector" />
              )}
            </div>
            <div className="jr-timeline-content">
              <div className="jr-timeline-title">
                <strong>{item.label}</strong>
                {item.date && <span>{formatDate(item.date)}</span>}
              </div>
              {item.description && <p>{item.description}</p>}
              {item.status && (
                <span className="jr-timeline-status">{formatStatus(item.status)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReleaseTimeline({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    releaseDate?: string;
    phases?: {
      name: string;
      startOffset: number;
      endOffset: number;
      tasks: string[];
      status?: Status | null;
    }[];
  };
  const { title, releaseDate, phases } = props;

  const release = releaseDate ? new Date(releaseDate) : new Date("2025-01-01");
  const safePhases = Array.isArray(phases) ? phases : [];

  return (
    <div className="jr-release">
      {title && <h4>{title}</h4>}
      <p className="jr-release-date">Release date: {formatDate(releaseDate ?? "")}</p>
      <div className="jr-release-grid">
        {safePhases.map((phase) => {
          const start = addDays(release, phase.startOffset);
          const end = addDays(release, phase.endOffset);
          const safeTasks = Array.isArray(phase.tasks) ? phase.tasks : [];
          return (
            <div key={phase.name} className={toneClass(statusTone(phase.status))}>
              <h5>{phase.name}</h5>
              <p>
                {formatDate(start.toISOString())} - {formatDate(end.toISOString())}
              </p>
              <ul>
                {safeTasks.map((task, idx) => (
                  <li key={`task-${idx}`}>{task}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ContentCalendar({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    startDate?: string;
    items?: {
      date: string;
      channel: string;
      content: string;
      status?: Status | null;
      tone?: Tone | null;
    }[];
    showChannelIcons?: boolean | null;
  };
  const { title, items, showChannelIcons } = props;

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="jr-calendar">
      {title && <h4>{title}</h4>}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Channel</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          {safeItems.map((item, index) => (
            <tr key={`${item.date}-${index}`} className={toneClass(item.tone)}>
              <td>{formatDate(item.date)}</td>
              <td>
                {showChannelIcons && <span className="jr-channel-icon">@</span>}
                {item.channel}
              </td>
              <td>
                {item.content}
                {item.status && (
                  <span className="jr-calendar-status">{formatStatus(item.status)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MilestoneTracker({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    items?: {
      label: string;
      dueDate?: string | null;
      completed: boolean;
      description?: string | null;
      priority?: "low" | "medium" | "high" | null;
    }[];
    showDates?: boolean | null;
  };
  const { title, items, showDates } = props;

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="jr-milestones">
      {title && <h4>{title}</h4>}
      <ul>
        {safeItems.map((item, index) => (
          <li key={`milestone-${index}`} className={item.completed ? "done" : ""}>
            <div>
              <strong>{item.label}</strong>
              {item.description && <p>{item.description}</p>}
              {showDates && item.dueDate && (
                <span className="jr-milestone-date">Due {formatDate(item.dueDate)}</span>
              )}
            </div>
            {item.priority && (
              <span className={`jr-milestone-priority ${item.priority}`}>
                {item.priority}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function addDays(date: Date, offset: number) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + offset);
  return next;
}

function statusTone(status?: Status | null): Tone {
  switch (status) {
    case "completed":
      return "success";
    case "blocked":
      return "danger";
    case "in_progress":
      return "info";
    case "skipped":
      return "muted";
    case "pending":
    default:
      return "default";
  }
}

function formatStatus(status: Status) {
  return status.replace(/_/g, " ");
}
