# Fingallians Hurling Blitz App

Mobile-first companion app for the Fingallians U12 Hurling Invitational (22 August 2026).

Sections: Today, Teams, Fixtures, Standings, Food ordering (club mentors), Event info, and a
password-gated Organiser dashboard.

## Stack

- **React + Vite** — front end
- **Supabase** (Postgres) — shared data store, reached through a Vercel serverless function so the
  database credentials (the `service_role` key) never reach the browser. Previously Turso/libSQL —
  migrated over; see `migrate_kv_to_supabase.sql` for how the existing data was carried across.
- **Vercel** — hosting for both the static site and the `/api/kv` function

## Local development

```bash
npm install
vercel dev
```

`vercel dev` runs the Vite front end and the `/api/kv` function together on one local port. Plain
`npm run dev` will run the front end alone, but food orders / fixtures / standings won't save
because the API route won't be running.

Environment variables needed (see `.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
(the service_role key, not anon — see the comment in `.env.example`). For `vercel dev` these can
live in a `.env.local` file in the project root, or be pulled from your Vercel project with
`vercel env pull .env.local`.

## Data model

Everything (teams, fixtures, food orders, announcements, sponsors) is stored as JSON blobs in a
single `blitz_kv_store` table in Supabase (created via `migrate_kv_to_supabase.sql`), keyed by
name — the same shape the original Turso prototype used. It's deliberately simple for a one-day
event; if this gets reused for other tournaments it'd be worth splitting into proper relational
tables. Row Level Security is enabled on the table with no policies, so it's only reachable via
the server-side `service_role` key — not the anon key, and not Supabase's auto-generated public
REST API.

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
