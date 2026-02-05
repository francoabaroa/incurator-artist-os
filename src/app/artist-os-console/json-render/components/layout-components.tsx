"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { ComponentRenderProps } from "@json-render/react";
import type { Align, Direction, Size, Tone } from "../catalog";
import { toneClass } from "./shared";

const sizeSpacing: Record<Size, string> = {
  xs: "6px",
  sm: "10px",
  md: "16px",
  lg: "24px",
  xl: "32px",
};

export function Card({ element, children }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    subtitle?: string | null;
    description?: string | null;
    tone?: Tone | null;
    padding?: Size | null;
    collapsible?: boolean | null;
    defaultCollapsed?: boolean | null;
  };
  const {
    title,
    subtitle,
    description,
    tone,
    padding,
    collapsible,
    defaultCollapsed,
  } = props;

  // Treat defaultCollapsed as implicitly enabling collapse behavior
  // This prevents cards from being stuck collapsed with no toggle
  const isCollapsible = Boolean(collapsible) || Boolean(defaultCollapsed);
  const [collapsed, setCollapsed] = useState(isCollapsible && Boolean(defaultCollapsed));
  const paddingValue = sizeSpacing[padding ?? "md"];

  return (
    <div className={`jr-card ${toneClass(tone)}`} style={{ padding: paddingValue }}>
      {(title || subtitle || description || isCollapsible) && (
        <div className="jr-card-header">
          <div>
            {title && <h3 className="jr-card-title">{title}</h3>}
            {subtitle && <p className="jr-card-subtitle">{subtitle}</p>}
            {description && <p className="jr-card-description">{description}</p>}
          </div>
          {isCollapsible && (
            <button
              className="jr-card-toggle"
              type="button"
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
          )}
        </div>
      )}
      {!collapsed && <div className="jr-card-body">{children}</div>}
    </div>
  );
}

export function Section({ element, children }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    description?: string | null;
    tone?: Tone | null;
  };
  const { title, description, tone } = props;

  return (
    <section className={`jr-section ${toneClass(tone)}`}>
      {title && <h4 className="jr-section-title">{title}</h4>}
      {description && <p className="jr-section-description">{description}</p>}
      <div className="jr-section-body">{children}</div>
    </section>
  );
}

export function Stack({ element, children }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    direction?: Direction | null;
    gap?: Size | null;
    align?: Align | null;
    justify?: Align | null;
    wrap?: boolean | null;
  };
  const { direction, gap, align, justify, wrap } = props;

  const style = useMemo<CSSProperties>(
    () => ({
      display: "flex",
      flexDirection: direction === "horizontal" ? "row" : "column",
      gap: sizeSpacing[gap ?? "md"],
      alignItems: mapAlign(align),
      justifyContent: mapAlign(justify),
      flexWrap: wrap ? "wrap" : "nowrap",
    }),
    [direction, gap, align, justify, wrap]
  );

  return (
    <div className="jr-stack" style={style}>
      {children}
    </div>
  );
}

export function Grid({ element, children }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    columns?: number | null;
    gap?: Size | null;
    minColumnWidth?: number | null;
  };
  const { columns, gap, minColumnWidth } = props;

  const style = useMemo<CSSProperties>(() => {
    const resolvedGap = sizeSpacing[gap ?? "md"];
    if (minColumnWidth) {
      return {
        display: "grid",
        gap: resolvedGap,
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
      };
    }
    return {
      display: "grid",
      gap: resolvedGap,
      gridTemplateColumns: `repeat(${columns ?? 2}, minmax(0, 1fr))`,
    };
  }, [columns, gap, minColumnWidth]);

  return (
    <div className="jr-grid" style={style}>
      {children}
    </div>
  );
}

export function Divider({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    label?: string | null;
    tone?: Tone | null;
    orientation?: "horizontal" | "vertical" | null;
  };
  const { label, tone, orientation } = props;

  if (orientation === "vertical") {
    return <div className={`jr-divider-vertical ${toneClass(tone)}`} />;
  }

  return (
    <div className={`jr-divider ${toneClass(tone)}`}>
      {label && <span className="jr-divider-label">{label}</span>}
    </div>
  );
}

export function Spacer({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as { size?: Size };
  const { size } = props;
  const value = sizeSpacing[size ?? "md"];
  return <div style={{ height: value, width: value }} aria-hidden="true" />;
}

function mapAlign(align?: Align | null): CSSProperties["alignItems"] {
  if (!align) return "stretch";
  const mapping: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };
  return (mapping[align] ?? "stretch") as CSSProperties["alignItems"];
}
