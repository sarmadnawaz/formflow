# Formflow

A simple form builder. Create a form, publish it, share the link and collect responses. Every workspace also gets a REST API, an OpenAPI 3.1 spec and signed webhooks.

## Features

- Sign up with email and password. Each signup creates its own workspace, and workspaces never see each other's data.
- Form editor with 11 field types, templates, a live preview, reordering and required fields.
- Public form page at `/f/<slug>`, with validation, a thank-you message or redirect, prefilled links and an embed snippet.
- Responses table, a detail view for each response, and CSV export.
- API keys (`ff_live_...`), shown once and stored hashed.
- Webhooks for `response.submitted`, `form.created`, `form.published`, `form.unpublished` and `form.deleted`. Each delivery is HMAC-SHA256 signed and retried up to 3 times, with a delivery log in Settings.
- REST API at `/api/v1`, docs at `/docs` and the spec at `/api/v1/openapi.json`.

## Stack

Next.js 16 (App Router, server actions), TypeScript, Tailwind CSS 4, Drizzle ORM and Postgres. The app depends only on Postgres.

## Deploy

### Vercel + Neon or Supabase (recommended)

1. Create a Postgres database on [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its connection string. On Supabase, use the pooled connection string, port 6543.
2. Import this repo in Vercel.
3. Set the environment variables:
   - `DATABASE_URL`: the connection string
   - `APP_URL`: your public URL, for example `https://formflow.vercel.app`
4. Deploy. The `vercel-build` script runs the database migrations, then builds the app.

### Docker (Render, Railway, Fly.io or any server)

```bash
docker compose up --build      # app on http://localhost:3000 with its own Postgres
```

You can also build the image and point it at any Postgres. Migrations run when the container starts:

```bash
docker build -t formflow .
docker run -p 3000:3000 -e DATABASE_URL=postgres://... -e APP_URL=https://forms.example.com formflow
```

## Local development

```bash
cp .env.example .env.local     # set DATABASE_URL, for example a local Postgres
npm install
npm run db:migrate
npm run dev                    # http://localhost:3000
```

To start a throwaway Postgres for local work:

```bash
docker run -d --name formflow-pg -p 5433:5432 \
  -e POSTGRES_USER=formflow -e POSTGRES_PASSWORD=formflow -e POSTGRES_DB=formflow postgres:16-alpine
# DATABASE_URL=postgres://formflow:formflow@localhost:5433/formflow
```

After you change `src/db/schema.ts`, run `npm run db:generate` to create a migration, then commit it.

## API

Create an API key in **Settings**, then call the API:

```bash
curl https://your-app/api/v1/forms -H "Authorization: Bearer ff_live_..."
```

| Method | Path | What it does |
|---|---|---|
| GET | `/me` | Workspace for this key (connection test) |
| GET, POST | `/forms` | List forms (`?status=published`) or create one |
| GET, PATCH, DELETE | `/forms/{id}` | Read, update, publish (`{"status":"published"}`) or delete |
| POST | `/forms/{id}/share-link` | Link to send someone, with optional `prefill` |
| GET, POST | `/forms/{id}/responses` | List responses (cursor `before`) or submit one |
| GET, DELETE | `/responses/{id}` | Read or delete a response |
| GET, POST | `/webhooks` | List webhooks or subscribe a URL |
| GET, DELETE | `/webhooks/{id}` | Read or unsubscribe |

Answers sent to `POST /forms/{id}/responses` and `prefill` keys can use the field id or the field label. Every response includes `answers` keyed by field id, plus a `fields` list with the label, type and value of each field.

### Webhook signature

Each delivery carries `X-Formflow-Signature: t=<unix>,v1=<hex>`, where `v1 = HMAC_SHA256(secret, "<t>.<raw body>")`. `X-Formflow-Event-Id` stays the same across retries, so you can use it to drop duplicates. `/docs` has a verification example.

## Project layout

```
src/app/            pages, server actions (actions/) and API routes (api/v1/)
src/components/     UI: editor, form renderer, settings forms
src/db/             Drizzle schema and client
src/lib/            forms, validation, auth, API keys, webhooks, OpenAPI spec
drizzle/            SQL migrations
scripts/migrate.mjs runs migrations on deploy
```
