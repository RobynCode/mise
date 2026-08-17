import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { menuGroups } from "@/lib/repo";
import { themeById } from "@/lib/menus";
import NewMenuButton from "@/components/NewMenuButton";

export const metadata = { title: "Menus" };

export default async function MenusPage() {
  const user = (await getCurrentUser())!;
  const groups = await menuGroups.forHousehold(user.householdId);
  const withCounts = await Promise.all(
    groups.map(async (g) => ({ ...g, recipeCount: await menuGroups.countRecipes(g.id) })),
  );

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <h1>Menus</h1>
          <p>Group recipes into restaurant-style menus to make picking what to eat easier.</p>
        </div>
        <div className="row">
          <NewMenuButton />
          <Link href="/recipes" className="btn btn-secondary">
            ← Back to recipes
          </Link>
        </div>
      </div>

      {withCounts.length === 0 ? (
        <div className="empty">
          <UtensilsCrossed size={28} aria-hidden="true" style={{ marginBottom: 10, color: "var(--muted)" }} />
          <h3>No menus yet</h3>
          <p>Create one to present a set of recipes the way a restaurant would.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <NewMenuButton />
          </div>
        </div>
      ) : (
        <div className="menu-grid">
          {withCounts.map((g) => {
            const preset = themeById(g.theme);
            return (
              <Link key={g.id} href={`/recipes/menus/${g.id}`} className="card menu-card">
                <span
                  className="menu-card-swatch"
                  aria-hidden="true"
                  style={{ background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})` }}
                />
                <div className="menu-card-body">
                  <h3>{g.name}</h3>
                  <p className="recipe-card-meta" style={{ margin: 0 }}>
                    {g.recipeCount} recipe{g.recipeCount === 1 ? "" : "s"} · {preset.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
