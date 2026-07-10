import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { recipes } from "@/lib/repo";
import RecipeForm from "@/components/RecipeForm";
import type { Ingredient } from "@/lib/units";

export const metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!;
  const { id } = await params;
  const recipe = recipes.byId(id);
  if (!recipe || recipe.householdId !== user.householdId) notFound();

  let ingredients: Ingredient[] = [];
  let steps: string[] = [];
  try { ingredients = JSON.parse(recipe.ingredients); } catch {}
  try { steps = JSON.parse(recipe.steps); } catch {}

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>Edit recipe</h1>
          <p>{recipe.title}</p>
        </div>
      </div>
      <RecipeForm
        initial={{
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
          ingredients,
          steps: steps.length ? steps : [""],
        }}
      />
    </div>
  );
}
