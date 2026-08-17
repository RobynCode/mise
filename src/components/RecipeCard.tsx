import Link from "next/link";

interface RecipeLike {
  id: string;
  title: string;
  imageUrl: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  sourceName: string | null;
  caloriesPerServing?: number | null;
}

export default function RecipeCard({ recipe }: { recipe: RecipeLike }) {
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return (
    <article className="card recipe-card">
      <Link href={`/recipes/${recipe.id}`}>
        {recipe.imageUrl ? (
          <div className="recipe-card-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="recipe-card-img" src={recipe.imageUrl} alt="" loading="lazy" />
          </div>
        ) : (
          <div className="recipe-card-placeholder" aria-hidden="true">
            {recipe.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="recipe-card-body">
          <h3>{recipe.title}</h3>
          <div className="recipe-card-meta">
            <span>Serves {recipe.servings}</span>
            {total > 0 && <span>{total} min</span>}
            {recipe.caloriesPerServing != null && <span>{Math.round(recipe.caloriesPerServing)} cal</span>}
            {recipe.sourceName && <span>{recipe.sourceName}</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
