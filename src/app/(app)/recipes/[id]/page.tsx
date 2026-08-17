import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { recipes } from "@/lib/repo";
import RecipeView from "@/components/RecipeView";
import type { Ingredient, System } from "@/lib/units";
import type { RecipeNutrition } from "@/lib/nutrition";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!;
  const { id } = await params;
  const recipe = await recipes.byId(id);
  if (!recipe || recipe.householdId !== user.householdId) notFound();

  let ingredients: Ingredient[] = [];
  let steps: string[] = [];
  let nutrition: RecipeNutrition | null = null;
  try {
    nutrition = recipe.nutrition ? JSON.parse(recipe.nutrition) : null;
  } catch {}
  try {
    ingredients = JSON.parse(recipe.ingredients);
  } catch {}
  try {
    steps = JSON.parse(recipe.steps);
  } catch {}

  return (
    <div className="stack" style={{ gap: 8 }}>
      <p style={{ margin: 0 }}>
        <Link href="/recipes">← All recipes</Link>
      </p>
      <RecipeView
        recipe={{
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          imageUrl: recipe.imageUrl,
          sourceUrl: recipe.sourceUrl,
          sourceName: recipe.sourceName,
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          tags: recipe.tags,
          createdByName: await recipes.creatorName(recipe),
        }}
        ingredients={ingredients}
        steps={steps}
        nutrition={nutrition}
        prefs={{ wet: user.wetUnits as System, dry: user.dryUnits as System }}
      />
    </div>
  );
}
