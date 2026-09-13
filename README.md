<div align="center">

<img src="app/assests/logos/brown%20logo.png" alt="Eyebrow Hub Logo" width="320"/>

# Eyebrow Hub

**A modern booking platform for Eyebrow Hub — a local eyebrow threading and facial hair removal studio in Yuba City, CA.**

Built by **Haki Stack** · CSC 190/191 Senior Project · California State University, Sacramento

[Synopsis](#synopsis) · [Features](#features) · [Screens](#screens--designs) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Testing](#testing) · [Deployment](#deployment) · [Timeline](#timeline) · [Team](#team)

</div>

---

## Synopsis

Eyebrow Hub is a small beauty business in Yuba City, CA that currently relies on calls and texts to manage appointments. This project replaces that workflow with a clean, mobile-friendly single-page website and an online appointment scheduling system, plus a secure admin portal for managing appointments, services, and availability.

**Project goals:**
- Give customers a fast, simple way to book online from any device
- Reduce time spent on phone scheduling and prevent double-booking
- Give the owner a single dashboard to manage the day's appointments, services, and time blocks
- Keep it affordable and easy to maintain after handoff to the Product Owner

This repo contains the public-facing site, the admin portal, and the API/database layer — all in one Next.js application.

---

## Features

### Public Website (Customer-Facing)
- Single-page scrollable layout with sticky **Book Now** CTA
- Sections: Home/Hero, Services, Booking, Business Hours, Contact/Location, Policies, About
- Mobile-first responsive design
- Service catalog with live pricing and duration

### Booking Flow
- Customer selects service(s), stylist (or "Next Available"), date, and time
- Required contact info (name, phone, email) plus optional note
- Confirmation via email and/or SMS
- Enforces business rules: hours, buffer time, lead time, advance booking window, cancellation policy
- Prevents double-booking at the slot level

### Admin Portal (Owner-Facing, Auth Required)
- Secure login for owner and staff (role-based)
- Dashboard with pending requests, today's appointments, weekly counts, and cancellations
- Approve/reject pending booking requests
- Day and week schedule views with full appointment details
- Manually create, edit, reschedule, or cancel appointments (for walk-ins or phone bookings)
- Block off time for breaks, lunches, vacations, or closures
- Manage service catalog (add/edit/disable services, update price/duration)
- Stretch: customer history, daily export, basic reporting

---

## Screens & Designs

### Home / Hero

<img src="app/assests/images/prototype-home.png" alt="Eyebrow Hub homepage prototype" width="700"/>

### Services & Booking

<img src="app/assests/images/prototype-booking.png" alt="Eyebrow Hub services and booking prototype" width="700"/>

### Admin Dashboard

<img src="app/assests/images/prototype-admin.png" alt="Eyebrow Hub admin dashboard prototype" width="900"/>

---

## Service Catalog & Hours (Reference)

These reflect what's shown on the live prototype — final values stay configurable from the admin portal.

| Service | Price |
|---|---|
| Brow Consult | Free |
| Eyebrow | $15 |
| Eyebrow / Lip | $15 |
| Chin / Lip | $12 |
| Cheeks | $7 |
| Forehead | $7 |
| Full Face | $30 |
| Half Face | $25 |

| Day | Hours |
|---|---|
| Mon – Sat | 10:00 AM – 8:00 PM |
| Sun | 11:00 AM – 6:00 PM |

---

## Tech Stack

**Framework & Language**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

**Database & ORM**

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

**Styling**

![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**Hosting & Deployment**

![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

**Development Tools**

![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)

**Project Management & Collaboration**

![Jira](https://img.shields.io/badge/Jira-0052CC?style=for-the-badge&logo=jira&logoColor=white)
![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Figma](https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white)

---

## Getting Started

### Prerequisites
- Node.js 20 or newer
- npm 10 or newer

### Install

```bash
npm install
```

Then create a `.env.local` file at the repo root for local secrets (see [Database Setup](#database-setup-supabase) below). That file is gitignored — do not commit it.

### Database Setup (Supabase)

PostgreSQL via Prisma on Supabase.

**Team:** Everyone uses the **same** database password. Get the full `DATABASE_URL` from the **group Discord** — do not commit it; only put it in your local `.env.local`.

If you use the Supabase dashboard instead: **Settings → Database → Connection string** (URI), with the password filled in. Never put real passwords or URLs in the repo or tickets.

**Where to put it:**

At the project root, create `.env.local` (or add to it if it already exists). Set Prisma's URL variable:

```bash
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/YOUR_DB?YOUR_QUERY_PARAMS"
```

Use the exact string from your Supabase dashboard; the line above is only the shape of the variable — swap in your own values locally.

> **Note:** Prisma's CLI loads `.env` by default, not `.env.local`. Use the `dotenv` helper so commands read `.env.local`:
> ```bash
> npx dotenv -e .env.local -- <command>
> ```

**Run migrations:**

```bash
npx dotenv -e .env.local -- npx prisma migrate dev
```

Follow the prompts to apply pending migrations or create a new named migration when you change `prisma/schema.prisma`. For deployment pipelines (no interactive prompt), use `prisma migrate deploy`.

**Seed the database:**

```bash
npx dotenv -e .env.local -- npx prisma db seed
```

If no seed is configured yet, add one per the [Prisma seeding docs](https://www.prisma.io/docs/guides/database/seed-database).

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the site and [http://localhost:3000/api/health](http://localhost:3000/api/health) for the health check.

---

## Folder Overview

| Folder | What's in it |
|---|---|
| `app/` | App Router pages, layouts, global styles, API route handlers |
| `app/assests/` | Logos and prototype/design images |
| `components/` | Shared UI components |
| `lib/` | Shared utilities, helpers, and service code |
| `prisma/` | Prisma schema and migration files |
| `public/` | Static assets |
| `docs/` | Project notes and architecture docs |

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier across the repo |

Database commands (with `.env.local` loaded) are documented under [Database Setup](#database-setup-supabase).

---

## Testing

Testing is configured with **Vitest** for unit and integration tests. Tests run in isolation without contacting the production database.

### Test Strategy

- **Unit tests** — business logic (booking rules, availability checks, conflict detection) using **Vitest**
- **Integration tests** — API route handlers with mocked Prisma and Supabase boundaries
- **End-to-end tests** — full booking and admin flows using **Playwright** (planned for Sprint 9)
- **CI** — tests run automatically on every PR via **GitHub Actions**

### Running Tests

```bash
# Run all tests once (from clean checkout, no production DB needed)
npm run test

# Watch mode — re-run tests on file changes
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run linting
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Test Infrastructure

- **Framework**: Vitest with jsdom for React component testing
- **Fixtures**: Shared mock data in `tests/fixtures/` for services, stylists, appointments, business hours, and scheduling rules
- **Utilities**: Test helpers in `tests/utils/` for mocking Next.js requests and Prisma queries
- **Database**: Tests use a mock `DATABASE_URL` and mock Prisma client — never contacts production database
- **Coverage**: Reports generated in `coverage/` directory; upload to Codecov on CI

### Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── fixtures/
│   └── appointments.ts         # Mock data and factories
├── utils/
│   └── test-helpers.ts         # Request/database mocking utilities
└── lib/
    ├── adminAuth.test.ts       # Authentication (20+ tests)
    ├── booking.test.ts         # Booking validation (40+ tests)
    ├── availability.test.ts    # Availability & conflicts (25+ tests)
    └── businessHours.test.ts   # Business hours formatting (20+ tests)
```

### Mocking Prisma and Supabase

Tests use `mockDatabaseQueries()` to mock the entire Prisma client:

```typescript
import { mockDatabaseQueries } from '../utils/test-helpers';
import { vi } from 'vitest';

// In your test
const db = mockDatabaseQueries();
db.appointment.findMany.mockResolvedValue([/* mock data */]);
```

Environment variables are overridden in `tests/setup.ts` to use a test database URL, ensuring no production data is accessed.

---

## Deployment

> _Placeholder — to be implemented in CSC 191._

Planned deployment pipeline:

1. **Hosting:** Vercel (frontend + API routes), Supabase (database)
2. **Environments:** `preview` (per-PR), `staging` (main branch), `production` (release tags)
3. **Secrets:** managed via Vercel/Supabase environment variables — never committed
4. **Database migrations:** `prisma migrate deploy` runs on each release
5. **Monitoring:** Vercel Analytics, Supabase logs, basic uptime ping

Manual production deploy outline:

```bash
npm run build
npx dotenv -e .env.production -- npx prisma migrate deploy
# Vercel handles the rest via Git integration
```

---

## Developer Instructions

> _Expanded workflow placeholders — to be finalized in CSC 191._

### Branch Naming

```
feature/<short-description>   e.g. feature/booking-form
fix/<short-description>       e.g. fix/home-nav
docs/<short-description>      e.g. docs/setup
chore/<short-description>     e.g. chore/upgrade-prisma
```

### PR Workflow

1. Create a branch off `main`
2. Make focused commits
3. Run quality checks before opening a PR:
   ```bash
   npm run lint
   npm run format
   npm run test   # once tests exist
   ```
4. Open a PR against `main`, link the JIRA ticket, request a review from at least one teammate
5. Squash-merge after approval

### Code Style

- TypeScript strict mode
- ESLint + Prettier enforced via CI
- Components: PascalCase; utilities: camelCase
- Co-locate component styles with the component

### Environment & Secrets

- Never commit `.env.local`, real connection strings, or passwords
- Use placeholders in documentation only
- `GET /api/health` returns `{ "status": "ok" }` — use this to verify a deploy is up

---

## Timeline

Timeline for **CSC 191 (Spring 2026)** based on user stories in the JIRA backlog. Sprints are two weeks each.

| Sprint | Dates | Key Milestones |
|---|---|---|
| **Sprint 0** | Jan 26 – Feb 22 | Repo skeleton, Supabase + Prisma setup, design system, charter signed, initial wireframes |
| **Sprint 1** | Feb 23 – Mar 8 | Public site shell — hero, services, contact, policies sections; responsive layout |
| **Sprint 2** | Mar 9 – Mar 22 | Service catalog data model + admin CRUD for services; public services section reads from DB |
| **Sprint 3** | Mar 30 – Apr 12 | Customer booking flow MVP — service selection, calendar, slot picker, contact form, confirmation |
| **Sprint 4** | Apr 13 – Apr 26 | Booking rules engine — buffer time, lead time, advance window; double-booking prevention |
| **Sprint 5** | Aug 24 – Sep 6 | Admin auth + schedule day view; manual appointment creation |
| **Sprint 6** | Sep 7 – Sep 20 | Edit/reschedule/cancel appointments; block off time for breaks and closures |
| **Sprint 7** | Sep 21 – Oct 4 | Email/SMS booking confirmations; owner notifications for new bookings |
| **Sprint 8** | Oct 5 – Oct 18 | Cancellation flow (customer-side) + cancellation rules; no-show tracking |
| **Sprint 9** | Oct 19 – Nov 1 | E2E test suite, accessibility pass, polish, stretch features (history view, daily export) |
| **Sprint 10** | Nov 1 – Nov 14 | Production deploy, owner training, documentation handoff, final demo prep |

> Milestone scope is driven by user stories and estimates in the JIRA backlog and will be refined sprint-by-sprint with the Product Owner.

---

## Team

**Haki Stack** — California State University, Sacramento

| Member | Email |
|---|---|
| Suyog Neupane | suyograjneupane@csus.edu |
| Babar Chechi | babarchechi@csus.edu |
| Brent Crosby | bcrosby@csus.edu |
| Fraz Ahmed | ahmeddfraz887@gmail.com |
| Mohamed Thameezudeen | mthameezudeen@csus.edu |
| Swechha Shrestha | swechhashrestha8@gmail.com |
| Essam Mashal | essammashal123@gmail.com |
| Mosab Abumarkhieh | mosab.abumarkhieh@gmail.com |

**Product Owner:** Talwinderi Kattaria, Owner, Eyebrow Hub (Yuba City, CA)

---

## Notes

- Do not commit `.env.local`, real connection strings, or passwords. Use placeholders in documentation only.
- `GET /api/health` returns `{ "status": "ok" }`.
- This project is academic and developed under the CSC 190/191 senior project sequence; see the project charter in `docs/` for full terms.
