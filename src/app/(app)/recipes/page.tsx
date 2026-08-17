import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { recipes } from "@/lib/repo";
import RecipeCard from "@/components/RecipeCard";
import ImportRecipeButton from "@/components/ImportRecipeButton";

export const metadata = { title: "Recipes" };

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; calMin?: string; calMax?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { q, calMin, calMax } = await searchParams;
  const query = (q ?? "").trim();
  const parseCal = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const minCal = parseCal(calMin);
  const maxCal = parseCal(calMax);
  const filtering = minCal != null || maxCal != null;

  const list = await recipes.forHousehold(user.householdId, {
    ...(query ? { query } : {}),
    ...(minCal != null ? { minCal } : {}),
    ...(maxCal != null ? { maxCal } : {}),
  });

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <h1>Recipes</h1>
          <p>
            {list.length} recipe{list.length === 1 ? "" : "s"} in {user.household.name}
          </p>
        </div>
        <div className="row">
          <Link href="/recipes/menus" className="btn btn-secondary">
            <UtensilsCrossed size={16} aria-hidden="true" /> Menus
          </Link>
          <ImportRecipeButton />
          <Link href="/recipes/new" className="btn btn-secondary">
            + New recipe
          </Link>
        </div>
      </div>

      <form action="/recipes" method="get" role="search" className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ marginBottom: 0, flex: "1 1 240px", maxWidth: 420 }}>
          <label htmlFor="q">Search</label>
          <input
            id="q"
            name="q"
            className="input"
            type="search"
            placeholder="Name, tag, or ingredient…"
            defaultValue={query}
          />
        </div>
        <div className="field" style={{ marginBottom: 0, width: 130 }}>
          <label htmlFor="calMin">Min cal/serving</label>
          <input id="calMin" name="calMin" className="input" type="number" min={0} defaultValue={calMin ?? ""} placeholder="e.g. 300" />
        </div>
        <div className="field" style={{ marginBottom: 0, width: 130 }}>
          <label htmlFor="calMax">Max cal/serving</label>
          <input id="calMax" name="calMax" className="input" type="number" min={0} defaultValue={calMax ?? ""} placeholder="e.g. 600" />
        </div>
        <button className="btn btn-secondary" type="submit">
          Filter
        </button>
        {(query || filtering) && (
          <Link href="/recipes" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {filtering && (
        <p className="hint" style={{ margin: "-10px 0 0" }}>
          Showing recipes with{" "}
          {minCal != null && maxCal != null
            ? `${minCal}–${maxCal}`
            : minCal != null
              ? `at least ${minCal}`
              : `at most ${maxCal}`}{" "}
          calories per serving. Recipes without nutrition data are hidden while filtering.
        </p>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <h3>{query || filtering ? "No recipes match those filters" : "Your recipe box is empty"}</h3>
          <p>{query || filtering ? "Try loosening the search or calorie range." : "Import a recipe from any cooking site, or write down a family favourite."}</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <ImportRecipeButton />
            <Link href="/recipes/new" className="btn btn-secondary">
              + New recipe
            </Link>
          </div>
        </div>
      ) : (
        <div className="recipe-grid">
          {list.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}
