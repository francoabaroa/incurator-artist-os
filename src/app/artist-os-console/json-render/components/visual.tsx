"use client";

import type { ComponentRenderProps } from "@json-render/react";

export function Palette({ element, onAction }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string | null;
    swatches?: { name: string; hex: string; description?: string | null }[];
    showHex?: boolean | null;
    copyable?: boolean | null;
  };
  const { title, swatches, showHex, copyable } = props;

  const safeSwatches = Array.isArray(swatches) ? swatches : [];

  return (
    <div className="jr-palette">
      {title && <h4>{title}</h4>}
      <div className="jr-palette-grid">
        {safeSwatches.map((swatch, index) => (
          <button
            key={`swatch-${index}`}
            type="button"
            className="jr-palette-swatch"
            onClick={() =>
              copyable
                ? onAction?.({
                    name: "copy_to_clipboard",
                    params: { text: swatch.hex },
                  })
                : undefined
            }
          >
            <span
              className="jr-palette-color"
              style={{ background: swatch.hex }}
            />
            <span className="jr-palette-label">{swatch.name}</span>
            {showHex && <span className="jr-palette-hex">{swatch.hex}</span>}
            {swatch.description && (
              <span className="jr-palette-description">{swatch.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ImagePlaceholder({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    alt?: string;
    aspectRatio?: "square" | "portrait" | "landscape" | "wide" | null;
    caption?: string | null;
  };
  const { alt, aspectRatio, caption } = props;

  const ratioClass = aspectRatio ? `jr-image-${aspectRatio}` : "jr-image-square";

  return (
    <div className="jr-image">
      <div className={`jr-image-box ${ratioClass}`}>
        <span>{alt}</span>
      </div>
      {caption && <p className="jr-image-caption">{caption}</p>}
    </div>
  );
}
