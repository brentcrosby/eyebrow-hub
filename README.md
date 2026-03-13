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

2. Copy environment variables:

```bash
cp .env.example .env.local
```

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

## Notes

- `.env.example` includes placeholder values only.
- `GET /api/health` returns `{ "status": "ok" }`.
