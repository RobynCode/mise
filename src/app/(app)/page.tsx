import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { planEntries, recipes, groceryItems } from "@/lib/repo";
import { addDays, friendlyDate, todayStr, MEAL_ORDER } from "@/lib/dates";
import RecipeCard from "@/components/RecipeCard";
import ImportRecipeButton from "@/components/ImportRecipeButton";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const start = todayStr();
  const end = addDays(start, 6);

  const entries = await planEntries.inRange(user.householdId, start, end);
  const recentRecipes = await recipes.forHousehold(user.householdId, { limit: 4 });
  const uncheckedCount = await groceryItems.countUnchecked(user.householdId);

  const byDate = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="stack" style={{ gap: 32 }}>
      <div className="page-head">
        <div>
          <h1>Hi, {user.name.split(" ")[0]} 👋</h1>
          <p>
            {user.household.name} · {entries.length} meal{entries.length === 1 ? "" : "s"} planned this week ·{" "}
            <Link href="/groceries">{uncheckedCount} item{uncheckedCount === 1 ? "" : "s"} to buy</Link>
          </p>
        </div>
        <div className="row">
          <ImportRecipeButton />
          <Link href="/recipes/new" className="btn btn-secondary">
            + New recipe
          </Link>
        </div>
      </div>

      <section aria-labelledby="week-heading">
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 id="week-heading" style={{ margin: 0 }}>
            This week
          </h2>
          <Link href="/plan">Open meal plan →</Link>
        </div>
        <div className="card">
          {days.map((d, i) => {
            const dayEntries = (byDate.get(d) ?? []).sort((a, b) => MEAL_ORDER[a.meal] - MEAL_ORDER[b.meal]);
            return (
              <div
                key={d}
                className="spread"
                style={{
                  padding: "12px 18px",
                  borderBottom: i < days.length - 1 ? "1px solid var(--border)" : undefined,
                }}
              >
                <span style={{ fontWeight: 650, minWidth: 120 }}>
                  {i === 0 ? "Today" : i === 1 ? "Tomorrow" : friendlyDate(d)}
                </span>
                <span className="row" style={{ justifyContent: "flex-end", flex: 1 }}>
                  {dayEntries.length === 0 ? (
                    <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Nothing planned</span>
                  ) : (
                    dayEntries.map((e) => (
                      <Link key={e.id} href={`/recipes/${e.recipe.id}`} className={`meal-chip meal-${e.meal}`} style={{ maxWidth: 220 }}>
                        {e.meal} · {e.recipe.title}
                      </Link>
                    ))
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 id="recent-heading" style={{ margin: 0 }}>
            Recent recipes
          </h2>
          <Link href="/recipes">All recipes →</Link>
        </div>
        {recentRecipes.length === 0 ? (
          <div className="empty">
            <h3>Your recipe box is empty</h3>
            <p>Import a recipe from any cooking site, or write down a family favourite.</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <ImportRecipeButton />
              <Link href="/recipes/new" className="btn btn-secondary">
                + New recipe
              </Link>
            </div>
          </div>
        ) : (
          <div className="recipe-grid">
            {recentRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
