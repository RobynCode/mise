import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { recipes } from "@/lib/repo";
import RecipeCard from "@/components/RecipeCard";
import ImportRecipeButton from "@/components/ImportRecipeButton";

export const metadata = { title: "Recipes" };

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const list = recipes.forHousehold(user.householdId, query ? { query } : undefined);

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
          <ImportRecipeButton />
          <Link href="/recipes/new" className="btn btn-secondary">
            + New recipe
          </Link>
        </div>
      </div>

      <form action="/recipes" method="get" role="search" className="row">
        <label htmlFor="q" className="visually-hidden">
          Search recipes
        </label>
        <input
          id="q"
          name="q"
          className="input"
          type="search"
          placeholder="Search by name, tag, or ingredient…"
          defaultValue={query}
          style={{ maxWidth: 420 }}
        />
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
        {query && (
          <Link href="/recipes" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {list.length === 0 ? (
        <div className="empty">
          <h3>{query ? `No recipes match “${query}”` : "Your recipe box is empty"}</h3>
          <p>{query ? "Try a different search, or add the recipe you're thinking of." : "Import a recipe from any cooking site, or write down a family favourite."}</p>
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
