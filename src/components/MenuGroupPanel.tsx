"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { MENU_CATEGORIES, MENU_THEMES, menuCategoryLabel, themeById } from "@/lib/menus";

interface RecipeOption {
  id: string;
  title: string;
  menuCategory: string;
  caloriesPerServing: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
}

interface MenuGroupData {
  id: string;
  name: string;
  theme: string;
}

export default function MenuGroupPanel({
  menu,
  allRecipes,
  initialRecipeIds,
}: {
  menu: MenuGroupData;
  allRecipes: RecipeOption[];
  initialRecipeIds: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(menu.name);
  const [theme, setTheme] = useState(menu.theme);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialRecipeIds));
  const [search, setSearch] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRecipes;
    return allRecipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [allRecipes, search]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, RecipeOption[]>();
    for (const r of allRecipes) {
      if (!selected.has(r.id)) continue;
      const key = r.menuCategory || "uncategorized";
      const list = byCategory.get(key) ?? [];
      list.push(r);
      byCategory.set(key, list);
    }
    const order = [...MENU_CATEGORIES.map((c) => c.value), "uncategorized"];
    return order
      .map((key) => ({ key, label: menuCategoryLabel(key), items: byCategory.get(key) ?? [] }))
      .filter((section) => section.items.length > 0);
  }, [allRecipes, selected]);

  const accent = themeById(theme).primaryColor;

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setNotice(null);
    const res = await fetch(`/api/menus/${menu.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, theme }),
    });
    setSavingDetails(false);
    if (res.ok) {
      setNotice({ kind: "ok", text: "Menu details saved." });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setNotice({ kind: "err", text: data.error ?? "Couldn't save the menu." });
    }
  }

  async function toggleRecipe(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    const res = await fetch(`/api/menus/${menu.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeIds: Array.from(next) }),
    });
    if (!res.ok) {
      setSelected(selected); // roll back on failure
      setNotice({ kind: "err", text: "Couldn't update the recipe list." });
    }
  }

  async function deleteMenu() {
    if (!confirm(`Delete “${menu.name}”? This won't delete the recipes themselves.`)) return;
    const res = await fetch(`/api/menus/${menu.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/recipes/menus");
      router.refresh();
    }
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      {notice && (
        <p className={`alert ${notice.kind === "ok" ? "alert-success" : "alert-error"}`} role="status">
          {notice.text}
        </p>
      )}

      <div className="grid-2">
        <form className="card card-pad" onSubmit={saveDetails}>
          <h2 style={{ marginTop: 0 }}>Menu details</h2>
          <div className="field">
            <label htmlFor="menu-name">Name</label>
            <input id="menu-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Theme</label>
            <div className="theme-picker" role="radiogroup" aria-label="Menu theme">
              {MENU_THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.value}
                  className={`theme-swatch${theme === t.value ? " is-selected" : ""}`}
                  onClick={() => setTheme(t.value)}
                  style={{ "--swatch-a": t.primaryColor, "--swatch-b": t.secondaryColor } as React.CSSProperties}
                >
                  <span className="theme-swatch-preview" aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button type="button" className="btn btn-ghost" onClick={deleteMenu}>
              <Trash2 size={15} aria-hidden="true" /> Delete menu
            </button>
            <button type="submit" className="btn" disabled={savingDetails || !name.trim()}>
              {savingDetails ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>

        <section className="card card-pad" aria-labelledby="pick-heading">
          <h2 id="pick-heading" style={{ marginTop: 0 }}>
            Recipes on this menu
          </h2>
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor="recipe-search" className="visually-hidden">
              Search recipes
            </label>
            <input
              id="recipe-search"
              className="input"
              type="search"
              placeholder="Search your recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {allRecipes.length === 0 ? (
            <p className="hint">No recipes yet — add some from the recipe box first.</p>
          ) : (
            <ul className="recipe-pick-list">
              {filteredOptions.map((r) => (
                <li key={r.id} className="recipe-pick-item">
                  <input
                    type="checkbox"
                    className="grocery-check"
                    id={`pick-${r.id}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggleRecipe(r.id)}
                  />
                  <label htmlFor={`pick-${r.id}`} style={{ flex: 1, cursor: "pointer" }}>
                    {r.title}
                  </label>
                  <span className="grocery-detail">{menuCategoryLabel(r.menuCategory || "uncategorized")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="preview-heading">
        <h2 id="preview-heading">Menu preview</h2>
        {grouped.length === 0 ? (
          <div className="empty">
            <h3>Nothing on this menu yet</h3>
            <p>Check off recipes on the left to build it out.</p>
          </div>
        ) : (
          <div
            className={`card card-pad menu-theme-${theme}`}
            style={{ "--menu-accent": accent } as React.CSSProperties}
          >
            {grouped.map((section) => (
              <div key={section.key} className="menu-section">
                <h3 className="menu-section-title">{section.label}</h3>
                <ul className="menu-item-list">
                  {section.items.map((r) => {
                    const time = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
                    return (
                      <li key={r.id} className="menu-item">
                        <Link href={`/recipes/${r.id}`} className="menu-item-name">
                          {r.title}
                        </Link>
                        <span className="menu-item-meta">
                          {r.caloriesPerServing != null && `${Math.round(r.caloriesPerServing)} cal`}
                          {r.caloriesPerServing != null && time > 0 && " · "}
                          {time > 0 && `${time} min`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
