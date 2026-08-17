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
- **Nutrition facts** — every recipe gets approximate per-serving nutrition (calories, protein, fat, carbs, fiber, sugar, sodium) computed automatically on save or import. A bundled ~120-ingredient database handles matching (fuzzy name matching, volume→grams via per-food densities, count items via typical unit weights), with coverage honestly disclosed ("estimated from 9 of 10 ingredients"). Optionally connect the free **USDA FoodData Central API** (`USDA_API_KEY` in `.env`) to resolve ingredients beyond the bundled set — results are cached in SQLite so each ingredient is fetched at most once.
- **Calorie filtering** — filter the recipe list by calories per serving: set a minimum (above), a maximum (below), or both (between).
- **Households** — invite codes link accounts so everyone shares one recipe box, meal plan, and grocery list. Join, leave, rename, and rotate the code.
- **Light & dark theme** — respects `prefers-color-scheme`, toggleable, no flash of wrong theme.
- **Accessible & responsive** — semantic HTML, labelled controls, visible focus rings, `prefers-reduced-motion` respected, and a mobile bottom nav.

## Quick start

```bash
npm install       # installs deps
npm run db:seed   # optional: demo household + recipes
npm run dev       # http://localhost:3000
```

No database server required for local development — Mise falls back to a SQLite file at `./data/mise.db`.

### Demo accounts (after seeding)

| account | password | notes |
|---|---|---|
| `demo@mise.local` | `letmecook` | member of "Demo Kitchen" |
| `sous@mise.local` | `letmecook` | second member, same household |
| **Guest link** | n/a | **http://localhost:3000/guest** — instantly signed in, no credentials needed |

Household invite code: **DEMO42**

### Guest mode

Share `http://yoursite.com/guest` with anyone to let them explore the app instantly without creating an account. Guests are pre-signed into the demo household and can see:
- All demo recipes
- The meal plan and calendar
- Grocery list generation
- All features, read-only or fully interactive depending on your setup

The guest account shows a "Demo" badge in the header so users know it's a shared space.

For a production build: `npm run build && npm start`.

> Set a real `AUTH_SECRET` in `.env` before deploying anywhere public.

## Database & deployment

Mise runs on either backend, chosen automatically at startup:

| `DATABASE_URL` | Backend | Use for |
|---|---|---|
| unset | SQLite (`./data/mise.db`) | local development, the `/guest` demo, CI |
| set | PostgreSQL | production |

The repository layer is written once against an async driver interface, so
application code is identical on both. The Postgres driver rewrites `?`
placeholders to `$1, $2…`, normalises Postgres' lower-cased column names back
to camelCase, and converts `TIMESTAMPTZ` values to ISO strings so rows have
the same shape either way.

### Why you need Postgres in production

Most hosts (Vercel, Render, Railway, Fly, Heroku, App Runner…) give each
deployment a **fresh, ephemeral filesystem**. A SQLite file written at runtime
lives inside that filesystem, so it is silently discarded on every redeploy,
restart, or scale event. Pointing `DATABASE_URL` at a managed Postgres moves
your data outside the container, where it survives.

### Migrating existing SQLite data to Postgres

1. **Provision Postgres.** Any managed provider works — Neon, Supabase,
   Railway, Render, RDS. Copy the connection string.

2. **Preview the migration** (writes nothing):

   ```bash
   DATABASE_URL="postgres://user:pass@host:5432/mise" npm run db:migrate -- --dry-run
   ```

3. **Run it:**

   ```bash
   DATABASE_URL="postgres://user:pass@host:5432/mise" npm run db:migrate
   ```

   The script creates the schema using the app's own definition (so it can
   never drift), then copies every table parent-first inside a single
   transaction. Rows are inserted with `ON CONFLICT DO NOTHING`, so it is safe
   to re-run after a partial failure. Booleans stored as SQLite `0`/`1` become
   real Postgres `BOOLEAN`s, and `NULL` markers in the nutrition cache are
   preserved.

   Flags: `--sqlite=<path>` for a source file elsewhere, `--fresh` to drop the
   destination tables first (destructive).

4. **Set `DATABASE_URL` in your host's environment variables** and redeploy.
   Also set a real `AUTH_SECRET` — regenerating it signs everyone out.

5. **Verify, then archive `data/mise.db`.** It is no longer read.

Starting fresh instead of migrating? Just set `DATABASE_URL` and run
`npm run db:seed`, or let the app create the schema on first request.

### Deploying on Railway

Railway runs a long-lived container, so the built-in `pg` pool is all you need
— no external pooler.

**1. Add a Postgres service.** In your project canvas: **New → Database → Add
PostgreSQL**. Railway provisions it with its own variables, including two
connection strings:

| variable on the Postgres service | host | use |
|---|---|---|
| `DATABASE_URL` | `postgres.railway.internal` | service-to-service, no egress charges |
| `DATABASE_PUBLIC_URL` | `*.proxy.rlwy.net` | from your laptop; bills egress |

**2. Point the app at it with a reference variable.** On your *app* service →
**Variables** → **New Variable**:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

Use the reference syntax rather than pasting the string: Railway keeps it in
sync if credentials rotate, and it resolves to the private network address.
If your Postgres service is named something other than `Postgres`, use that
name.

**3. Set the other variables** on the app service:

```
AUTH_SECRET = <a long random string>
```

Generate one with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
Changing this later invalidates every session, signing all users out.

**4. Redeploy, then verify.** Open `https://<your-app>.up.railway.app/api/health`:

```json
{ "ok": true, "database": "postgres", "persistent": true, "latencyMs": 12 }
```

If it reports `"database": "sqlite"`, `DATABASE_URL` did not reach the
container — check the variable is on the *app* service, not only the database.
The schema is created automatically on first request, so there is no separate
migrate-up step for a fresh install.

#### Rescuing the data already in your deployed container

Your existing recipes live in `data/mise.db` **inside the running container**,
on the ephemeral disk. Setting a variable triggers a redeploy, and a redeploy
destroys that disk — so **copy the data out before you change any variables**,
or it is gone.

Do the migration from inside the still-running container, which is the only
place the old SQLite file and the new database are both reachable:

```bash
railway link                 # select the project + app service
railway ssh                  # shell inside the running container

# Inside the container — paste the Postgres service's DATABASE_URL value.
# It is reachable over the private network from here.
DATABASE_URL="postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway" \
  npm run db:migrate -- --dry-run     # preview first

DATABASE_URL="postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway" \
  npm run db:migrate                  # then for real
```

Only after that succeeds, add the `DATABASE_URL` reference variable to the app
service and let it redeploy. From then on the container's local SQLite file is
ignored, and redeploys are harmless.

If the deployed data is just test recipes, skip all of the above: set the
variable, redeploy, then `railway ssh` and run `npm run db:seed` for a fresh
demo household.

> `tsx` is a runtime dependency (not a dev dependency) specifically so these
> scripts run inside the deployed container.

#### Keeping uploaded photos

Recipe photos in `public/uploads/` sit on the same ephemeral disk and will keep
disappearing after every deploy, even once Postgres is handling your data. Two
Railway-native fixes:

- **Attach a Volume** to the app service with mount path `/app/public/uploads`.
  Simplest option; note a volume binds to a single instance, so it does not
  survive horizontal scaling.
- **Use object storage** (Railway Buckets, Cloudflare R2, or S3) and change
  `src/app/api/upload/route.ts` to upload the buffer and return the public URL.
  Nothing else changes, because recipes already store photos as plain URLs.

### Connection pooling

The pool defaults to 5 connections (`PGPOOL_MAX` to change it) with a 15s idle
timeout. That is right for container hosts like Railway, Render, and Fly, which
reuse one pool per instance. On serverless platforms (Vercel, Lambda) many
short-lived instances each open their own pool, so prefer your provider's
**pooled** connection string instead of raising the limit — Neon's pooler
endpoint, Supabase's port 6543, or PgBouncer in transaction mode.

TLS is negotiated automatically: an explicit `sslmode` in the connection string
wins, then `PGSSLMODE`, then a hostname heuristic (private addresses such as
`*.railway.internal` skip TLS, public hosts use it). If that guess is wrong the
driver detects the handshake error at startup and reconnects the other way, so
a mismatch logs a warning instead of taking the deployment down.

### One more ephemeral-filesystem trap: uploaded photos

Recipe photos are written to `public/uploads/`, which lives on **the same
ephemeral filesystem** — so they vanish on redeploy exactly like the SQLite
file did, even after you move to Postgres. Options, cheapest first:

- **Object storage** (recommended): S3, Cloudflare R2, Vercel Blob, or
  Supabase Storage. Change `src/app/api/upload/route.ts` to upload the buffer
  and return the public URL; nothing else needs to change, because recipes
  already store photos as plain URLs.
- **A mounted persistent volume**, if your host offers one (Railway, Fly,
  Render disks), pointed at `public/uploads`.
- **Skip uploads** and rely on imported recipes' source images, which are
  already remote URLs and unaffected.

## Environment variables

| variable | required | purpose |
|---|---|---|
| `DATABASE_URL` | production | Postgres connection string. Unset → SQLite. |
| `AUTH_SECRET` | yes | Signs session JWTs. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `USDA_API_KEY` | no | Enables USDA nutrition lookups beyond the bundled database. |
| `PGPOOL_MAX` | no | Postgres pool size (default 5). |
| `PGSSLMODE` | no | Set to `disable` for a non-TLS Postgres. |

## Architecture

```
src/
  app/
    (auth)/         login & signup (no app chrome)
    (app)/          authenticated pages (dashboard, recipes, plan, groceries, household, settings)
    api/            route handlers (auth, recipes, import, upload, plan, groceries, household, settings)
  components/       client components (calendar, grocery list, recipe form/view, header, theme toggle)
  lib/
    db.ts           dual SQLite/Postgres driver, schema, dialect helpers, row normalisation
    repo.ts         typed async repository layer (users, households, recipes, plan, groceries)
    auth.ts         bcrypt password hashing + JWT session cookie (jose)
    units.ts        unit engine: wet/dry classification, metric↔imperial conversion, fraction formatting
    ingredients.ts  free-text ingredient parser ("1 1/2 cups flour" → structured)
    importRecipe.ts JSON-LD / microdata recipe extraction
    grocery.ts      meal-plan → aggregated shopping list
    nutrition.ts    nutrition engine: matching, gram conversion, per-serving totals, USDA lookup + cache
    nutritionData.ts bundled ~120-ingredient nutrition database (per-100g macros, densities, unit weights)
  middleware.ts     edge JWT gate for all authenticated routes
```

Design decisions worth knowing:

- **Two interchangeable database backends.** SQLite keeps local setup to a single `npm install` with no external services, which also means the `/guest` demo link works for anyone who clones the repo. Postgres provides durability in production. One async repository layer serves both, so there is no forked application code.
- **Wet vs dry conversion never crosses dimensions.** Volume converts to volume, weight to weight, so no density guessing. Count-style ingredients ("2 eggs", "1 can beans") pass through untouched.
- **Grocery aggregation is canonical-unit based**: wet merges in ml, dry in g, then the display layer converts to the viewing user's preference — so two people in one household can see the same list in different units.
- **Sessions are stateless JWTs** in an httpOnly cookie, verified in edge middleware for redirects and re-verified server-side for data access. Every query is scoped by `householdId`.
- **Uploads** are written to `public/uploads/` for simplicity; swap in object storage (S3/R2) for production.

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run db:seed` | seed demo data (idempotent, works on either backend) |
| `npm run db:migrate` | copy SQLite data into Postgres (`--dry-run`, `--fresh`, `--sqlite=<path>`) |

`GET /api/health` reports which backend is live, whether it is persistent, and
round-trip latency — handy as a deployment health check.

## Roadmap ideas

- Drag-and-drop between calendar days
- Grocery aisle categories & store sorting
- Recipe scaling presets (½×, 2×) and cook mode (step-at-a-time, screen-wake)
- Pantry inventory that pre-checks grocery items

---

Built with Next.js 15 · React 19 · TypeScript · SQLite / PostgreSQL · zero UI frameworks (hand-rolled design system, "Basil & Saffron")
