"use client";

import type { ComponentRenderProps } from "@json-render/react";
import type { Severity, Tone } from "../catalog";
import { toneClass } from "./shared";

export function RedFlagList({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string;
    items?: {
      clause: string;
      severity: Severity;
      summary: string;
      recommendation?: string | null;
      section?: string | null;
    }[];
    showSeverityLegend?: boolean | null;
  };
  const { title, items, showSeverityLegend } = props;

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="jr-red-flags">
      <h4>{title}</h4>
      {showSeverityLegend && (
        <div className="jr-severity-legend">
          {(["low", "medium", "high", "critical"] as Severity[]).map((level) => (
            <span key={level} className={`jr-severity-${level}`}>
              {level}
            </span>
          ))}
        </div>
      )}
      <ul>
        {safeItems.map((item) => (
          <li key={item.clause} className={`jr-severity-${item.severity}`}>
            <div>
              <strong>{item.clause}</strong>
              {item.section && <span className="jr-section-tag">Section {item.section}</span>}
            </div>
            <p>{item.summary}</p>
            {item.recommendation && (
              <p className="jr-recommendation">{item.recommendation}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TermsComparison({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string;
    dealType?:
      | "recording"
      | "distribution"
      | "management"
      | "publishing"
      | "sync"
      | "360";
    terms?: {
      name: string;
      artistFriendly: string;
      industryStandard: string;
      redFlag: string;
      yourDeal?: string | null;
      assessment?: Tone | null;
    }[];
  };
  const { title, dealType, terms } = props;

  const safeTerms = Array.isArray(terms) ? terms : [];

  return (
    <div className="jr-terms">
      <div className="jr-terms-header">
        <h4>{title}</h4>
        <span className="jr-terms-type">{dealType}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Artist Friendly</th>
            <th>Industry Standard</th>
            <th>Red Flag</th>
            <th>Your Deal</th>
          </tr>
        </thead>
        <tbody>
          {safeTerms.map((term) => (
            <tr key={term.name} className={toneClass(term.assessment)}>
              <td>{term.name}</td>
              <td>{term.artistFriendly}</td>
              <td>{term.industryStandard}</td>
              <td>{term.redFlag}</td>
              <td>{term.yourDeal ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProConList({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string;
    pros?: string[];
    cons?: string[];
    verdict?: string | null;
  };
  const { title, pros, cons, verdict } = props;

  const safePros = Array.isArray(pros) ? pros : [];
  const safeCons = Array.isArray(cons) ? cons : [];

  return (
    <div className="jr-procon">
      <h4>{title ?? "Comparison"}</h4>
      <div className="jr-procon-grid">
        <div>
          <h5>Pros</h5>
          <ul>
            {safePros.map((item, index) => (
              <li key={`pro-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h5>Cons</h5>
          <ul>
            {safeCons.map((item, index) => (
              <li key={`con-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {verdict && <p className="jr-procon-verdict">{verdict}</p>}
    </div>
  );
}
