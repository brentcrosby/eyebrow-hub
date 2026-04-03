## Eyebrow Hub

Clean repo skeleton for the Eyebrow Hub senior project. This uses Next.js with TypeScript and the App Router, with API routes living in the same app.

## Prereqs

- Node.js 20 or newer
- npm 10 or newer

## Install

1. Install dependencies:

```bash
npm install
```

2. Create a **`.env.local`** file at the repo root for local secrets (see [Database Setup (Supabase)](#database-setup-supabase)). That file is gitignored—do not commit it.

## Database Setup (Supabase)

PostgreSQL via Prisma on Supabase.

**Team:** Everyone uses the **same** database password. Get the full `DATABASE_URL` from the **group Discord**—do not commit it; only put it in your local **`.env.local`**.

If you use the Supabase dashboard instead: **Settings** → **Database** → **Connection string** (URI), with the password filled in.

Never put real passwords or URLs in the repo or tickets.

### Where to put it

1. At the project root, create **`.env.local`** (or add to it if it already exists).
2. Set Prisma’s URL variable, for example:

```bash
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/YOUR_DB?YOUR_QUERY_PARAMS"
```

Use the exact string from your Supabase dashboard; the line above is only the **shape** of the variable—swap in your own values locally. Keep **`.env.local`** out of version control.

**Note:** Prisma’s CLI loads `.env` by default, not `.env.local`. Use the `dotenv` helper from this project’s dependencies so commands below read `.env.local`:

```bash
npx dotenv -e .env.local -- <command>
```

### How to run migrations

From the repo root, with `DATABASE_URL` set in `.env.local`:

```bash
npx dotenv -e .env.local -- npx prisma migrate dev
```

Follow the prompts to apply pending migrations or create a new named migration when you change `prisma/schema.prisma`. For deployment pipelines (no interactive prompt), use `prisma migrate deploy` with the same env vars available to the process.

### How to seed

If the project defines a Prisma seed in `package.json` (for example a `prisma.seed` entry), run:

```bash
npx dotenv -e .env.local -- npx prisma db seed
```

If there is no seed configured yet, add one per [Prisma seeding docs](https://www.prisma.io/docs/guides/database/seed-database) and then use the command above.

## Run Locally

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` for the site and `http://localhost:3000/api/health` for the health check.

## Folder Overview

- `app/`: App Router pages, layouts, global styles, and API route handlers
- `components/`: Shared UI components
- `lib/`: Shared utilities, helpers, and future service code
- `prisma/`: Prisma schema and database-related files
- `public/`: Static assets
- `docs/`: Project notes, architecture docs, and team references

## Basic PR Workflow

1. Create a branch named like `feature/booking-form`, `fix/home-nav`, or `docs/setup`.
2. Make your changes and keep commits focused.
3. Run the quality checks before opening a PR:

```bash
npm run lint
```

4. Open a pull request against the main branch.

## Scripts

- `npm run dev`: Start the local dev server
- `npm run build`: Build for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run format`: Run Prettier across the repo

Database commands (with `.env.local` loaded) are documented under [Database Setup (Supabase)](#database-setup-supabase).

## Notes

- Do not commit `.env.local`, real connection strings, or passwords. Use placeholders in documentation only.
- `GET /api/health` returns `{ "status": "ok" }`.
