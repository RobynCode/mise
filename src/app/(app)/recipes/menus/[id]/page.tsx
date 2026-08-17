import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { menuGroups, recipes } from "@/lib/repo";
import MenuGroupPanel from "@/components/MenuGroupPanel";

export default async function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!;
  const { id } = await params;
  const menu = await menuGroups.byId(id);
  if (!menu || menu.householdId !== user.householdId) notFound();

  const [allRecipes, recipeIds] = await Promise.all([
    recipes.forHousehold(user.householdId, { orderBy: "title" }),
    menuGroups.recipeIds(id),
  ]);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <p style={{ margin: 0 }}>
        <Link href="/recipes/menus">← All menus</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{menu.name}</h1>
          <p>Configure this menu's name, theme, and which recipes appear on it.</p>
        </div>
      </div>
      <MenuGroupPanel
        menu={{ id: menu.id, name: menu.name, theme: menu.theme }}
        allRecipes={allRecipes.map((r) => ({
          id: r.id,
          title: r.title,
          menuCategory: r.menuCategory,
          caloriesPerServing: r.caloriesPerServing,
          prepMinutes: r.prepMinutes,
          cookMinutes: r.cookMinutes,
        }))}
        initialRecipeIds={recipeIds}
      />
    </div>
  );
}
