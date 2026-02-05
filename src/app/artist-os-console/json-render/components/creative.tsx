"use client";

import type { ComponentRenderProps } from "@json-render/react";
import { chartPalette } from "./shared";

export function ChordProgression({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    key?: string;
    progression?: string[];
    tempo?: number | null;
    mood?: string | null;
    examples?: string[] | null;
    notes?: string | null;
  };
  const { key, progression, tempo, mood, examples, notes } = props;

  const safeProgression = Array.isArray(progression) ? progression : [];
  const safeExamples = Array.isArray(examples) ? examples : [];

  return (
    <div className="jr-chords">
      <h4>{key}</h4>
      <div className="jr-chord-row">
        {safeProgression.map((chord, index) => (
          <span key={`${chord}-${index}`} className="jr-chord">
            {chord}
          </span>
        ))}
      </div>
      <div className="jr-chord-meta">
        {tempo && <span>{tempo} BPM</span>}
        {mood && <span>{mood}</span>}
      </div>
      {safeExamples.length > 0 && (
        <ul>
          {safeExamples.map((item, index) => (
            <li key={`example-${index}`}>{item}</li>
          ))}
        </ul>
      )}
      {notes && <p className="jr-chord-notes">{notes}</p>}
    </div>
  );
}

export function RhymeScheme({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    scheme?: string;
    lines?: { text: string; group: string }[];
    description?: string | null;
  };
  const { scheme, lines, description } = props;

  const safeLines = Array.isArray(lines) ? lines : [];

  const groupColors = Object.fromEntries(
    Array.from(new Set(safeLines.map((line) => line.group))).map((group, index) => [
      group,
      chartPalette[index % chartPalette.length],
    ])
  );

  return (
    <div className="jr-rhyme">
      <h4>Scheme: {scheme}</h4>
      {description && <p>{description}</p>}
      <ul>
        {safeLines.map((line, index) => (
          <li key={`line-${index}`}>
            <span
              className="jr-rhyme-group"
              style={{ background: groupColors[line.group] }}
            />
            <span>{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SongStructure({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    sections?: { name: string; bars?: number | null; notes?: string | null; active?: boolean | null }[];
    totalBars?: number | null;
    showBars?: boolean | null;
  };
  const { sections, totalBars, showBars } = props;

  const safeSections = Array.isArray(sections) ? sections : [];

  return (
    <div className="jr-structure">
      <h4>Song Structure</h4>
      {totalBars && <p>Total bars: {totalBars}</p>}
      <ul>
        {safeSections.map((section, index) => (
          <li key={`section-${index}`} className={section.active ? "active" : ""}>
            <div>
              <strong>{section.name}</strong>
              {showBars && section.bars != null && (
                <span className="jr-structure-bars">{section.bars} bars</span>
              )}
            </div>
            {section.notes && <p>{section.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CreativePrompt({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    type?: string;
    prompt?: string;
    timer?: number | null;
    example?: string | null;
    tips?: string[] | null;
  };
  const { type, prompt, timer, example, tips } = props;

  const safeTips = Array.isArray(tips) ? tips : [];

  return (
    <div className="jr-creative">
      <h4>{(type ?? "prompt").replace("_", " ")}</h4>
      <p className="jr-creative-prompt">{prompt}</p>
      {timer && <p className="jr-creative-timer">Timer: {timer} minutes</p>}
      {example && (
        <blockquote>
          <p>{example}</p>
        </blockquote>
      )}
      {safeTips.length > 0 && (
        <ul>
          {safeTips.map((tip, index) => (
            <li key={`tip-${index}`}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
