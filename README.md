# Mise 🌿

**Plan meals, cook together, shop once.**

Mise is a household recipe manager, meal planner, and grocery list — a full-stack web app in the spirit of Paprika 3, built with Next.js 15 (App Router), React 19, TypeScript, and SQLite.

## Features

- **Import recipes from the web** — paste a URL from most recipe sites and Mise extracts the title, photo, servings, timings, ingredients, and steps via schema.org JSON-LD (with a microdata fallback). Ingredient lines like `1½ cups all-purpose flour` are parsed into structured amount / unit / name data.
- **Create & edit your own recipes** — structured ingredient editor with a "quick paste" mode that parses a whole ingredient list at once, step-by-step method editor, tags, timings, and optional photo upload.
- **Preferred units, split wet/dry** — wet (volume) and dry (weight) preferences are set independently per user. Every amount converts on the fly: `2 tbsp` ↔ `29.6 ml`, `400 g` ↔ `14.1 oz`, with pretty unicode fractions (`1½ cups`) in imperial.
- **Serving scaling** — adjust servings on any recipe and every ingredient amount recalculates live, in your preferred units.
- **Meal plan calendar** — a shared month calendar; tap any day to plan breakfast / lunch / dinner / snack at a chosen serving count.
- **Generated grocery list** — pick a date range and Mise combines every ingredient from the planned meals, scales them to the planned servings, merges duplicates in canonical units (ml/g), and notes which recipes each item is for. Checkboxes track what you already have; manual items are supported too.
- **Households** — invite codes link accounts so everyone shares one recipe box, meal plan, and grocery list. Join, leave, rename, and rotate the code.
- **Light & dark theme** — respects `prefers-color-scheme`, toggleable, no flash of wrong theme.
- **Accessible & responsive** — semantic HTML, labelled controls, visible focus rings, `prefers-reduced-motion` respected, and a mobile bottom nav.

## Quick start

```bash
npm install       # installs deps (better-sqlite3 uses prebuilt binaries)
npm run db:seed   # optional: demo household + recipes
npm run dev       # http://localhost:3000
```

Demo sign-in (after seeding):

| account | password | notes |
|---|---|---|
| `demo@mise.local` | `letmecook` | member of "Demo Kitchen" |
| `sous@mise.local` | `letmecook` | second member, same household |

Household invite code: **DEMO42**

For a production build: `npm run build && npm start`.

> Set a real `AUTH_SECRET` in `.env` before deploying anywhere public.

## Architecture

```
src/
  app/
    (auth)/         login & signup (no app chrome)
    (app)/          authenticated pages (dashboard, recipes, plan, groceries, household, settings)
    api/            route handlers (auth, recipes, import, upload, plan, groceries, household, settings)
  components/       client components (calendar, grocery list, recipe form/view, header, theme toggle)
  lib/
    db.ts           better-sqlite3 connection + schema bootstrap (WAL, FKs)
    repo.ts         typed repository layer (users, households, recipes, plan, groceries)
    auth.ts         bcrypt password hashing + JWT session cookie (jose)
    units.ts        unit engine: wet/dry classification, metric↔imperial conversion, fraction formatting
    ingredients.ts  free-text ingredient parser ("1 1/2 cups flour" → structured)
    importRecipe.ts JSON-LD / microdata recipe extraction
    grocery.ts      meal-plan → aggregated shopping list
  middleware.ts     edge JWT gate for all authenticated routes
```

Design decisions worth knowing:

- **SQLite via better-sqlite3** keeps setup to a single `npm install` — no external database, no codegen. The repository layer is small, typed, and easy to port to Postgres later.
- **Wet vs dry conversion never crosses dimensions.** Volume converts to volume, weight to weight, so no density guessing. Count-style ingredients ("2 eggs", "1 can beans") pass through untouched.
- **Grocery aggregation is canonical-unit based**: wet merges in ml, dry in g, then the display layer converts to the viewing user's preference — so two people in one household can see the same list in different units.
- **Sessions are stateless JWTs** in an httpOnly cookie, verified in edge middleware for redirects and re-verified server-side for data access. Every query is scoped by `householdId`.
- **Uploads** are written to `public/uploads/` for simplicity; swap in object storage (S3/R2) for production.

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run db:seed` | seed demo data (idempotent) |

## Roadmap ideas

- Drag-and-drop between calendar days
- Grocery aisle categories & store sorting
- Recipe scaling presets (½×, 2×) and cook mode (step-at-a-time, screen-wake)
- Pantry inventory that pre-checks grocery items
- Postgres + hosted deployment recipe

---

Built with Next.js 15 · React 19 · TypeScript · better-sqlite3 · zero UI frameworks (hand-rolled design system, "Basil & Saffron")
