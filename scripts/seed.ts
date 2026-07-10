/**
 * Seeds the database with a demo household, two users, three recipes,
 * and a few planned meals. Run with: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { sqlite } from "../src/lib/db";
import { users, households, recipes, planEntries } from "../src/lib/repo";

function ing(name: string, amount: number | null, unit: string | null, kind: "wet" | "dry" | "count") {
  return { id: `seed_${Math.random().toString(36).slice(2, 9)}`, name, amount, unit, kind };
}

function dateStr(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function main() {
  if (users.byEmail("demo@mise.local")) {
    console.log("Seed data already present — skipping.");
    return;
  }

  const household = households.create({ name: "Demo Kitchen", inviteCode: "DEMO42" });
  const passwordHash = bcrypt.hashSync("letmecook", 10);
  const demo = users.create({ name: "Demo Cook", email: "demo@mise.local", passwordHash, householdId: household.id });
  users.create({ name: "Sous Chef", email: "sous@mise.local", passwordHash, householdId: household.id });

  const dal = recipes.create({
    title: "Weeknight Red Lentil Dal",
    description: "A cozy, pantry-friendly dal that comes together in one pot. Great over rice with a squeeze of lime.",
    imageUrl: null, sourceUrl: null, sourceName: null,
    servings: 4, prepMinutes: 10, cookMinutes: 30,
    tags: "vegan, weeknight, one-pot",
    householdId: household.id, createdById: demo.id,
    ingredients: JSON.stringify([
      ing("red lentils, rinsed", 1.5, "cup", "wet"),
      ing("coconut milk", 400, "ml", "wet"),
      ing("crushed tomatoes", 400, "g", "dry"),
      ing("yellow onion, diced", 1, null, "count"),
      ing("garlic cloves, minced", 3, null, "count"),
      ing("fresh ginger, grated", 1, "tbsp", "wet"),
      ing("curry powder", 2, "tbsp", "wet"),
      ing("vegetable oil", 2, "tbsp", "wet"),
      ing("salt", 1, "tsp", "wet"),
      ing("water or vegetable stock", 500, "ml", "wet"),
    ]),
    steps: JSON.stringify([
      "Heat the oil in a large pot over medium heat. Cook the onion until soft and golden, about 6 minutes.",
      "Add the garlic, ginger, and curry powder. Stir for 1 minute until fragrant.",
      "Add the lentils, tomatoes, coconut milk, and water. Bring to a simmer.",
      "Simmer uncovered for 20–25 minutes, stirring occasionally, until the lentils are soft and the dal is thick.",
      "Season with salt, taste, and serve over rice with lime wedges.",
    ]),
  });

  const cookies = recipes.create({
    title: "Brown Butter Chocolate Chip Cookies",
    description: "Chewy centres, crisp edges, and that nutty brown-butter depth. Chill the dough if you can wait.",
    imageUrl: null, sourceUrl: null, sourceName: null,
    servings: 24, prepMinutes: 20, cookMinutes: 12,
    tags: "dessert, baking",
    householdId: household.id, createdById: demo.id,
    ingredients: JSON.stringify([
      ing("unsalted butter", 225, "g", "dry"),
      ing("all-purpose flour", 280, "g", "dry"),
      ing("brown sugar", 200, "g", "dry"),
      ing("granulated sugar", 100, "g", "dry"),
      ing("large eggs", 2, null, "count"),
      ing("vanilla extract", 2, "tsp", "wet"),
      ing("baking soda", 1, "tsp", "wet"),
      ing("fine salt", 0.75, "tsp", "wet"),
      ing("dark chocolate, chopped", 250, "g", "dry"),
    ]),
    steps: JSON.stringify([
      "Brown the butter in a saucepan over medium heat until golden and nutty. Cool for 15 minutes.",
      "Whisk the brown butter with both sugars, then beat in the eggs and vanilla until glossy.",
      "Fold in the flour, baking soda, and salt, then the chocolate. Chill 30 minutes (or overnight).",
      "Scoop onto lined trays and bake at 180°C / 350°F for 10–12 minutes until the edges are set.",
      "Cool on the tray for 5 minutes — they finish setting as they cool.",
    ]),
  });

  const stirfry = recipes.create({
    title: "Crispy Tofu & Broccoli Stir-Fry",
    description: "Fast, glossy, and better than takeout. Press the tofu well for maximum crisp.",
    imageUrl: null, sourceUrl: null, sourceName: null,
    servings: 2, prepMinutes: 15, cookMinutes: 15,
    tags: "vegan, weeknight, fast",
    householdId: household.id, createdById: demo.id,
    ingredients: JSON.stringify([
      ing("extra-firm tofu, pressed and cubed", 350, "g", "dry"),
      ing("broccoli florets", 300, "g", "dry"),
      ing("cornstarch", 3, "tbsp", "wet"),
      ing("soy sauce", 3, "tbsp", "wet"),
      ing("maple syrup", 1, "tbsp", "wet"),
      ing("rice vinegar", 1, "tbsp", "wet"),
      ing("garlic cloves, minced", 2, null, "count"),
      ing("neutral oil", 2, "tbsp", "wet"),
      ing("cooked rice, to serve", 2, "cup", "wet"),
    ]),
    steps: JSON.stringify([
      "Toss the tofu cubes in cornstarch until evenly coated.",
      "Heat the oil in a wide pan over medium-high. Fry the tofu until golden on all sides, about 8 minutes. Set aside.",
      "Stir-fry the broccoli with a splash of water until bright green and just tender.",
      "Whisk the soy sauce, maple syrup, vinegar, and garlic; pour into the pan with the tofu and broccoli.",
      "Toss until the sauce is glossy and clings to everything. Serve over rice.",
    ]),
  });

  planEntries.create({ date: dateStr(0), meal: "dinner", servings: 4, recipeId: dal.id, householdId: household.id });
  planEntries.create({ date: dateStr(1), meal: "dinner", servings: 2, recipeId: stirfry.id, householdId: household.id });
  planEntries.create({ date: dateStr(2), meal: "snack", servings: 24, recipeId: cookies.id, householdId: household.id });

  console.log("Seeded demo data:");
  console.log("  → sign in as demo@mise.local / letmecook");
  console.log("  → second member: sous@mise.local / letmecook");
  console.log("  → household invite code: DEMO42");
  sqlite.close();
}

main();
