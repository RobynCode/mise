import RecipeForm from "@/components/RecipeForm";

export const metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1>New recipe</h1>
          <p>Write it once, cook it forever. Use quick paste to drop in a whole ingredient list at once.</p>
        </div>
      </div>
      <RecipeForm />
    </div>
  );
}
