# Studio Roxx — Pole studio scheduler

A lightweight, single-tenant class scheduling app for a pole / dance / fitness
studio. Students browse the class calendar, reserve a spot, and pay at the
studio when they arrive. Staff manage the schedule, discount codes,
instructors, and studio branding from a built-in admin dashboard.

## What it does

- **Public schedule** — anyone can browse the class calendar, filter by
  level, instructor, or time of day, and see live spots-remaining counts.
- **Reservation flow** — signed-in students hold-to-reserve a class,
  optionally apply a discount code, and confirm. Pricing is set by the
  studio and enforced server-side.
- **Pay at the studio** — no card processing in the app. Students bring
  cash, card, or their active pass / membership when they check in.
- **Waivers** — a one-time signed waiver is captured on the first booking.
- **My bookings** — students see upcoming and past reservations and can
  cancel (which frees the spot for someone else).
- **Admin dashboard** — CRUD for classes, discount codes, instructors, and
  studio settings (name, tagline, logo, colors, timezone).
- **Embed mode** — drop the schedule into another site with an iframe.
  See [docs/EMBED.md](./docs/EMBED.md).

## Tech stack

- Vite + React + TypeScript + Tailwind + shadcn/ui + framer-motion
- Lovable Cloud (Postgres + auth + storage) for the backend
- Vitest for unit tests

## Local development

The app runs at `http://localhost:8080` inside the Lovable sandbox — no
setup required. If you're cloning this to run outside Lovable:

```
bun install
bun run dev
```

## Running tests

```
bun run test          # single run
bun run test:watch    # watch mode
```

## Roles

Roles live in the `user_roles` table (never on the profiles table).
Two roles exist today: `student` (default) and `admin`. Grant `admin` by
inserting into `user_roles` from the backend.

## Payments — currently deferred

The app intentionally does not process online payments. All money changes
hands at the studio. A future Track B is planned to add card-on-file and
online purchases for passes and memberships.

## Repository layout

```
src/
  components/    UI (ClassCard, PaymentModal, WaiverModal, calendars, …)
  hooks/         useAuth, useIsAdmin, useStudioSettings
  lib/schedule.ts   Pure schedule-building helpers (unit tested)
  pages/         Index (schedule), Auth, MyBookings, Admin, Memberships
supabase/
  migrations/    Schema, RLS, and RPCs
docs/            EMBED.md and other operator docs
```
