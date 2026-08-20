// Preloaded via `-r` before scripts run, so DATABASE_URL etc. are set before
// any application code (which reads process.env at import time) is required.
// .env.local first so it wins (mirrors Next.js's precedence) — dotenv never
// overrides a key that's already set, so the later .env call only fills gaps.
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
