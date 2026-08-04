# Fingallians Hurling Blitz App

Mobile-first companion app for the Fingallians U12 Hurling Invitational (22 August 2026).

Sections: Today, Teams, Fixtures, Standings, Food ordering (club mentors), Event info, and a
password-gated Organiser dashboard.

## Stack

- **React + Vite** — front end
- **Supabase** (Postgres) — shared data store, read/written directly from the browser via
  `src/supabaseClient.js` using the anon/public key. Previously Turso/libSQL via a server-side
  Vercel function — migrated over; see `migrate_kv_to_supabase.sql` for how the existing data was
  carried across.
- **Vercel** — hosting for the static site (no server-side API route needed anymore)

## Local development

```bash
npm install
npm run dev
```

Environment variables needed (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(the anon/public key — see the comment in `.env.example` for why service_role must never go here).
For local dev these live in a `.env.local` file in the project root, or can be pulled from your
Vercel project with `vercel env pull .env.local`.

## Data model

Everything (teams, fixtures, food orders, announcements, sponsors) is stored as JSON blobs in a
single `kv_store` table in Supabase (created via `migrate_kv_to_supabase.sql`), keyed by name —
the same shape the original Turso prototype used. It's deliberately simple for a one-day event;
if this gets reused for other tournaments it'd be worth splitting into proper relational tables.
Row Level Security is enabled with policies granting the anon role read/write on this table only —
this mirrors the app's own access control (admin passcode, club passwords, referee link) rather
than gatekeeping at the database level, which is the standard trust model for a client-side app
like this one.

## Admin dashboard

Passcode is hardcoded in `src/App.jsx` (`ADMIN_CODE`). Fine for a single low-stakes event day —
swap it out (or add real auth) before reusing this for anything more sensitive.

## Deploying changes

```bash
git add .
git commit -m "your change"
git push
```

Vercel redeploys automatically on push once the GitHub repo is connected.
