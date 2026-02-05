"use client";

import type { ComponentRenderProps } from "@json-render/react";

export function PressRelease({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    headline?: string;
    subhead?: string | null;
    dateline?: string;
    body?: string[];
    quote?: { text: string; attribution: string } | null;
    quote2?: { text: string; attribution: string } | null;
    boilerplate?: string;
    links?: { label: string; url: string }[] | null;
    copyable?: boolean | null;
  };
  const {
    headline,
    subhead,
    dateline,
    body,
    quote,
    quote2,
    boilerplate,
    links,
    copyable,
  } = props;

  const safeBody = Array.isArray(body) ? body : [];
  const safeLinks = Array.isArray(links) ? links : [];
  const textToCopy = [
    headline,
    subhead ?? "",
    dateline,
    ...safeBody,
    quote ? `"${quote.text}" - ${quote.attribution}` : "",
    quote2 ? `"${quote2.text}" - ${quote2.attribution}` : "",
    boilerplate,
    safeLinks.map((link) => `${link.label}: ${link.url}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <article className="jr-press-release">
      <header>
        <h2>{headline}</h2>
        {subhead && <h3>{subhead}</h3>}
        <p className="jr-dateline">{dateline}</p>
      </header>
      <section className="jr-press-body">
        {safeBody.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        {quote && (
          <blockquote>
            <p>{`\"${quote.text}\"`}</p>
            <footer>- {quote.attribution}</footer>
          </blockquote>
        )}
        {quote2 && (
          <blockquote>
            <p>{`\"${quote2.text}\"`}</p>
            <footer>- {quote2.attribution}</footer>
          </blockquote>
        )}
      </section>
      <section className="jr-boilerplate">
        <h4>Boilerplate</h4>
        <p>{boilerplate}</p>
      </section>
      {safeLinks.length > 0 && (
        <ul className="jr-press-links">
          {safeLinks.map((link, index) => (
            <li key={`link-${index}`}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {copyable && (
        <button
          type="button"
          className="jr-copy-button"
          onClick={() =>
            onAction?.({
              name: "copy_to_clipboard",
              params: { text: textToCopy },
            })
          }
        >
          Copy press release
        </button>
      )}
    </article>
  );
}

export function Bio({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    length?: "one_liner" | "short" | "medium" | "long";
    content?: string;
    highlights?: string[] | null;
    wordCount?: number | null;
    copyable?: boolean | null;
  };
  const { length, content, highlights, wordCount, copyable } = props;

  const safeHighlights = Array.isArray(highlights) ? highlights : [];

  return (
    <div className="jr-bio">
      <div className="jr-bio-header">
        <h4>Bio ({(length ?? "short").replace("_", " ")})</h4>
        {wordCount && <span>{wordCount} words</span>}
      </div>
      <p>{content}</p>
      {safeHighlights.length > 0 && (
        <ul>
          {safeHighlights.map((item, index) => (
            <li key={`highlight-${index}`}>{item}</li>
          ))}
        </ul>
      )}
      {copyable && (
        <button
          type="button"
          className="jr-copy-button"
          onClick={() =>
            onAction?.({
              name: "copy_to_clipboard",
              params: { text: content },
            })
          }
        >
          Copy bio
        </button>
      )}
    </div>
  );
}

export function EmailTemplate({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    type?:
      | "booking"
      | "press"
      | "sync"
      | "collaboration"
      | "newsletter"
      | "other";
    subject?: string;
    greeting?: string | null;
    body?: string;
    cta?: string | null;
    signature?: string | null;
    placeholders?: string[] | null;
    copyable?: boolean | null;
  };
  const {
    type,
    subject,
    greeting,
    body,
    cta,
    signature,
    placeholders,
    copyable,
  } = props;

  const emailText = [
    `Subject: ${subject}`,
    greeting ?? "",
    body,
    cta ?? "",
    signature ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="jr-email">
      <header>
        <h4>{(type ?? "other").replace("_", " ")} template</h4>
        <p className="jr-email-subject">{subject}</p>
      </header>
      <div className="jr-email-body">
        {greeting && <p>{greeting}</p>}
        <p>{body}</p>
        {cta && <p>{cta}</p>}
        {signature && <p>{signature}</p>}
      </div>
      {Array.isArray(placeholders) && placeholders.length > 0 && (
        <div className="jr-email-placeholders">
          {placeholders.map((placeholder, index) => (
            <span key={`placeholder-${index}`}>{placeholder}</span>
          ))}
        </div>
      )}
      {copyable && (
        <button
          type="button"
          className="jr-copy-button"
          onClick={() =>
            onAction?.({
              name: "copy_to_clipboard",
              params: { text: emailText },
            })
          }
        >
          Copy email
        </button>
      )}
    </div>
  );
}
