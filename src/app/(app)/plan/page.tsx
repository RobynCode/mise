import { getCurrentUser } from "@/lib/auth";
import { planEntries, recipes } from "@/lib/repo";
import PlanCalendar from "@/components/PlanCalendar";

export const metadata = { title: "Meal plan" };

function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  // Include spillover weeks from adjacent months shown in the grid.
  const first = new Date(y, m - 1, 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // back to Monday
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(gridStart), end: fmt(gridEnd) };
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { month } = await searchParams;
  const now = new Date();
  const ym =
    month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { start, end } = monthRange(ym);

  const entries = planEntries.inRange(user.householdId, start, end);
  const recipeOptions = recipes.forHousehold(user.householdId, { orderBy: "title" });

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>Meal plan</h1>
          <p>Everyone in {user.household.name} sees the same plan. Tap a day to add a meal.</p>
        </div>
      </div>
      <PlanCalendar
        month={ym}
        entries={entries.map((e) => ({
          id: e.id,
          date: e.date,
          meal: e.meal,
          servings: e.servings,
          recipe: { id: e.recipe.id, title: e.recipe.title, servings: e.recipe.servings },
        }))}
        recipes={recipeOptions.map((r) => ({ id: r.id, title: r.title, servings: r.servings }))}
      />
    </div>
  );
}
