"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** A swatch button that opens a popover with a modern color picker (react-colorful) + hex input. */
export default function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHexDraft(value), [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commitHex(v: string) {
    setHexDraft(v);
    if (HEX_COLOR.test(v)) onChange(v);
  }

  return (
    <div className="color-picker" ref={rootRef}>
      <button
        type="button"
        className="color-swatch-btn"
        style={{ "--swatch-color": value } as React.CSSProperties}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="color-swatch-btn-fill" aria-hidden="true" />
      </button>
      <span className="color-picker-label">{label}</span>
      {open && (
        <div className="color-popover" role="dialog" aria-label={`${label} picker`}>
          <HexColorPicker color={value} onChange={onChange} />
          <input
            className="input color-hex-input"
            value={hexDraft}
            maxLength={7}
            onChange={(e) => commitHex(e.target.value)}
            onBlur={() => setHexDraft(value)}
          />
        </div>
      )}
    </div>
  );
}
