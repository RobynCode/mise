"use client";

import { useState } from "react";
import { MENU_CATEGORIES, isMenuCategory } from "@/lib/menus";

const CUSTOM = "__custom__";

/** Menu category picker shared by the recipe form and the menu configuration panel. */
export default function MenuCategoryField({
  id,
  value,
  onChange,
  label = "Menu category",
  hint,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string | false;
  hint?: string;
}) {
  const [mode, setMode] = useState<"preset" | "custom">(value && !isMenuCategory(value) ? "custom" : "preset");

  function handleSelect(v: string) {
    if (v === CUSTOM) {
      setMode("custom");
      onChange("");
    } else {
      setMode("preset");
      onChange(v);
    }
  }

  return (
    <div className="field" style={label === false ? { marginBottom: 0 } : undefined}>
      {label !== false && <label htmlFor={id}>{label}</label>}
      <select id={id} className="select" value={mode === "custom" ? CUSTOM : value} onChange={(e) => handleSelect(e.target.value)}>
        <option value="">Uncategorized</option>
        {MENU_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {mode === "custom" && (
        <input
          className="input"
          style={{ marginTop: 8 }}
          placeholder="Name this category…"
          value={value}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
