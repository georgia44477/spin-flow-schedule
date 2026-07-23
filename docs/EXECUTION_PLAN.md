# Studio Roxx — Review & Execution Plan (v2, decisions incorporated)

**Audience:** an executing model/developer who has NOT seen the review conversation. Everything you need is in this file. Work top to bottom within each phase; phases are ordered by leverage (highest impact first). Do not invent scope beyond what a step says.

**Product context (confirmed with the owner):**
- This is a **real booking product for pole/dance studios** ("Studio Roxx"). Each studio gets **its own deployment/instance** (own Supabase project + hosting). There is **no multi-tenant data model** — do not add `studio_id` columns, tenant tables, or cross-studio anything. "Customization" (Phase 8) means a studio configures *its own instance*.
- Definition of done for **Track A** (this document's phases): a ship-ready happy path — a member can browse the schedule, sign the waiver once, reserve a class (pay at the studio), apply a studio-issued discount code, and the studio can brand the app, manage classes/instructors, see who's coming, and embed the schedule on their website.
- **Track B** (out of scope here; a separate task for a stronger model): Stripe integration — real card payments for drop-ins, real subscription memberships, and real class-pack purchases, keeping the three-tier pricing. Until Track B lands, all money is collected at the studio and the app records what is owed.

**Stack:** Vite + React 18 + TypeScript + Tailwind/shadcn (Lovable-generated), Supabase (Postgres + Auth + RLS + edge functions). No server of our own; the browser talks to Supabase directly, so **RLS and SQL functions are the only trustworthy layer**.

---

## Decisions (answered by the owner — treat as fixed requirements)

1. **Payments (Q1 = a):** remove the fake card form now; bookings are "reserve online, pay at the studio." Stripe comes later in Track B. Do not collect card data anywhere in Track A.
2. **Pricing tiers (Q2 = b):** **keep** the three price tiers (drop-in / pass / subscription) in the schema and the booking UI. What must go now is the *fictional* eligibility layer (phantom pass credits and derived memberships — Finding F3). Real pass/subscription purchases arrive with Stripe in Track B.
3. **MCP edge function (Q3 = cut, owner accepted recommendation):** the MCP function let AI assistants (e.g. Claude) browse and book classes on a member's behalf via OAuth. It's a nice-to-have that duplicates booking logic and widens the security surface while the core is still being stabilized. **Delete it** (Phase 2.5). It can be rebuilt after Track B when the booking contract is final.
4. **Accessories & discount codes (Q4):** **cut accessory purchasing** entirely. **Rebuild discount codes as a real, studio-managed feature**: admins create codes (friends & family, sales, promos) with a percentage off, optional expiry and usage cap; members apply a code to a class booking; the server validates and applies it (Phase 7). No more hard-coded codes in the JavaScript bundle.
5. **First admin (Q5):** created via a one-time SQL statement, documented in the README (Phase 6).
6. **Studio customization (new):** the studio can set its logo, studio name, and tagline, and manage a roster of instructors used when creating classes (Phase 8). Class names/schedules are already editable in Admin — keep that.
7. **Website embed (new):** provide an embeddable version of the schedule plus copy-paste instructions so a studio can put the scheduler on its existing website (Phase 9).

---

## Map of the project (what exists, how it connects)

```
src/App.tsx                     Routes + providers (react-query, AuthProvider, two toasters)
src/pages/
  Index.tsx        CORE   Schedule browser: loads `classes` + confirmed `bookings` counts,
                          builds 30-day schedule, filters, list/calendar views, renders ClassCard
  Auth.tsx         CORE   Email/password + Google (Lovable auth); ?next= redirect
  MyBookings.tsx   CORE   Lists own bookings; cancel = UPDATE status='cancelled'
  Admin.tsx        CORE   Admin-only: CRUD on classes; bookings-by-day roster (IDs only, no names)
  Memberships.tsx  FAKE   Plans + class packs; "subscribe"/"purchase" only fire a toast
  ForStudios.tsx   CUT    B2B SaaS marketing page (multi-studio pitch, fictional claims)
  StudioSignup.tsx CUT    SaaS lead-capture form -> `studio_leads` table
  StudioWelcome.tsx CUT   SaaS post-signup checklist
  OAuthConsent.tsx CUT    Approve/deny screen for MCP OAuth (decision 3)
  NotFound.tsx     CORE
src/components/
  ClassCard.tsx    CORE   Expand -> pick tier -> hold-to-book -> WaiverModal (first time) -> PaymentModal
                          -> supabase.rpc("book_class")
  PaymentModal.tsx CORE   Fake card form + order summary (becomes reservation confirmation, Phase 3)
  WaiverModal.tsx  CORE   Scroll-to-read waiver, typed signature (signature text is never persisted)
  AccessoriesDrawer.tsx CUT  Accessory cart + hard-coded discount codes (decision 4)
  StudioHeader/DateScrubber/MonthCalendar/ClassFilters/NavLink  CORE presentation
src/hooks/
  useAuth.tsx      CORE   Session context
  useIsAdmin.tsx   CORE   Reads user_roles for 'admin'
  useEligibility.tsx CUT  Derives "pass credits" / "active membership" from booking counts (F3)
  use-toast.ts     DEAD   Radix toast system; all real toasts use sonner
src/data/classes.ts        Types (used) + mock schedule generator (dead) + accessories/discount data (cut)
src/integrations/supabase/ client.ts + generated types.ts
src/integrations/lovable/  Google OAuth wrapper (keep — Auth.tsx uses it)
src/lib/mcp/               MCP tool sources (CUT, decision 3)
supabase/migrations/       3 migrations: schema+RLS, studio_leads, "security hardening" (broke booking — F1)
supabase/functions/mcp/    Auto-generated MCP bundle (CUT, decision 3)
```

**The booking data path (core of the product):**
`Index` fetches `classes` and counts confirmed `bookings` → `ClassCard` → waiver check on `profiles.waiver_signed_at` → `PaymentModal` → `supabase.rpc("book_class", …)` → SQL function inserts `bookings` + `payments` rows and stamps the waiver → UI refetches.

---

## Findings

### A. Fragile / broken (these outrank everything)

- **F1 — Booking is almost certainly broken for every student.** Migration 3 (`20260710142824`) changed `book_class` from `SECURITY DEFINER` to `SECURITY INVOKER`. The function does `SELECT … FOR UPDATE` on `classes`, but `authenticated` only has `GRANT SELECT` on `classes` — `FOR UPDATE` requires the `UPDATE` privilege, so the call should fail with *permission denied for table classes* for non-admins. Even if it didn't, the capacity check `SELECT COUNT(*) FROM bookings WHERE class_id = …` now runs under the caller's RLS, which only lets them see **their own** bookings — so the count is 0/1 and a full class would still accept bookings. Migration 3's "hardening" broke correctness.
- **F2 — Public spot counts are wrong for everyone.** `Index.tsx` counts spots by selecting from `bookings`, but RLS only returns the caller's own rows (none for anonymous visitors). Every class therefore shows as nearly empty to everyone except the few spots they booked themselves.
- **F3 — Eligibility is fiction.** `useEligibility.tsx` computes "pass credits" as: every 10th pass-tier *booking* mints a new 10-pack, so the **first** pass-tier booking grants 9 phantom free credits. "Active membership" = any subscription-tier booking in the last 30 days — so paying one class's `subscription_price` (~$18) buys 30 days of "unlimited, included" classes. No purchase records exist.
- **F4 — Rebooking after cancel is impossible.** `bookings` has `UNIQUE (user_id, class_id)`; cancelling sets `status='cancelled'` but keeps the row, so booking the same class again violates the unique constraint with a raw Postgres error.
- **F5 — The client sets the price.** `book_class` accepts `_total_amount` from the browser and records it into `payments` verbatim; the RLS `payments` INSERT policy also lets any authenticated user insert arbitrary payment rows directly. Revenue records are untrustworthy. Also, `ClassCard.handlePaymentConfirm` computes the total ignoring coverage, while `PaymentModal` displays a coverage-adjusted total — the number shown and the number recorded disagree.
- **F6 — The payment UI is theater.** Card fields are collected, format-checked, and discarded; nothing is charged; the success toast says "Booked!". Dishonest to members and collects card data with no processor.
- **F7 — Admin can't see who booked.** The roster shows booking-ID prefixes only. There's no join to `profiles`, and RLS wouldn't allow it anyway (only own-profile SELECT; no admin policy on `profiles`).
- **F8 — Waiver record is weak.** The typed signature name in `WaiverModal` is never persisted — only a timestamp, set as a *side effect inside `book_class`* whether or not a waiver was shown. The waiver text also promises a 4-hour cancellation policy the app doesn't enforce (cancel is allowed until class start — acceptable for launch, but the texts shouldn't lie).
- **F9 — `Memberships.tsx` timer bug.** `gripTimer` is a plain `let` in the component body, recreated every render; `endGrip`'s stale closure can't clear it, so releasing early still "activates" the fake membership. Moot once Phase 5 removes the fake purchase, but do not copy this pattern.
- **F10 — The lockfile doesn't install outside Lovable's infrastructure.** `package-lock.json` resolves 123 packages from Lovable's private registry mirror (`https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...`). On any machine without access to that mirror, `npm install` hangs/fails. (Verified in this review environment.) `bun.lock`/`bun.lockb` are also checked in alongside `package-lock.json` — three lockfiles, one source of truth needed.

### B. Overbuilt / redundant (cut)

- **C1 — SaaS pages:** `ForStudios.tsx`, `StudioSignup.tsx`, `StudioWelcome.tsx`, the `studio_leads` table, and the `.lovable/plan.md` multi-tenant ambitions. Marketing for a product that doesn't exist (promises Stripe payouts, waitlists, CSV import, 14-day trials). Single-instance product → delete. (A future marketing site for selling Studio Roxx to studios is a separate project, not this codebase's job.)
- **C2 — Dead mock data:** `generateClasses`/`generateSchedule` in `src/data/classes.ts` are unused (Index reads the DB).
- **C3 — Two toast systems:** radix `toast`/`toaster`/`use-toast` are mounted in `App.tsx` but every toast call uses `sonner`. Delete the radix one.
- **C4 — ~30 unused shadcn components** and their npm deps (`recharts`, `embla-carousel-react`, `react-resizable-panels`, `input-otp`, `vaul`, `cmdk`, `react-hook-form`, `@hookform/resolvers`, and many `@radix-ui/*`). Used ones (keep): badge, button, calendar, card, dialog, input, label, popover, select, skeleton, sonner, tabs, textarea, tooltip — re-check with grep after the page deletions; some (radio-group, separator, sheet, toggle) are imported only by files this plan deletes.
- **C5 — MCP function** (decision 3) and **C6 — accessory cart + hard-coded discount codes** (decision 4).

### C. Missing for the goal

- **M1** — A truthful availability source for anonymous visitors (fixes F2).
- **M2** — Admin roster with member names (fixes F7).
- **M3** — Honest booking confirmation (what you owe, where you pay) + booked-state that survives reload (ClassCard's "Booked ✓" is component-local state; after refresh the user can attempt a duplicate booking).
- **M4** — Real, server-enforced discount codes (decision 4).
- **M5** — Studio branding/settings + instructor roster (decision 6).
- **M6** — Embeddable schedule + instructions (decision 7).
- **M7** — Real docs: README is Lovable boilerplate; nothing explains env vars, migrations, or how the first admin is created.
- **M8** — Tests that protect the core flow: the only test is `expect(true).toBe(true)`.

### D. Structure vs goal

- Purchases must be records, not inferences — the derived-eligibility layer goes now (Phase 5); real purchase records arrive with Stripe (Track B).
- The browser must never be trusted with money math — prices and discounts are computed in SQL functions.
- `.env` committed with the Supabase anon key: this is a *publishable* key by design — fine — RLS is the security boundary, which is why Phase 1 matters most.

---

## Track A — Execution phases (cheaper model, do now)

> **Conventions for every phase:** run `npm run build && npm run lint && npm test` before starting (green baseline) and after finishing. Commit each phase separately with the message given. SQL changes go in a **new** migration file — never edit the three existing migrations. Migration filenames: `supabase/migrations/<UTC yyyymmddHHMMSS>_<slug>.sql`. Apply to the live project with `supabase db push` if the CLI is linked; otherwise paste into the Supabase SQL editor — and say in the commit/PR notes which one you did. After any change to functions/tables, regenerate `src/integrations/supabase/types.ts` if the CLI is available (`supabase gen types typescript --project-id wbjqsxrwfwmseugjuzqe > src/integrations/supabase/types.ts`); if not, hand-edit the affected entries to match.

---

### Phase 0 — Make the project installable anywhere

**Why:** F10 — without it, no other phase's verification steps can run outside Lovable.

**Steps:** delete `package-lock.json`, `bun.lock`, and `bun.lockb`; ensure no `.npmrc` pins a private registry; run `npm install` against the default public registry to regenerate `package-lock.json`; commit only the new `package-lock.json` (npm is the lockfile of record — the project scripts are npm-based).

**Verify:** `grep -c "pkg.dev" package-lock.json` returns 0; `npm ci && npm run build && npm run lint && npm test` all pass on a clean checkout. **This is the green baseline every later phase refers to.** If `npm run build` fails at this point, stop and report — later phases assume a building project.

**Commit:** `fix: regenerate lockfile against public npm; drop bun lockfiles`

---

### Phase 1 — Make booking actually work and un-forgeable (highest leverage)

**Why:** the core RPC is broken (F1), spot counts lie (F2), users can't rebook (F4), and the client sets prices (F5).

**Files:** new migration `supabase/migrations/<ts>_fix_booking.sql`; `src/components/ClassCard.tsx`; `src/pages/Index.tsx`; `src/pages/Admin.tsx`; `src/integrations/supabase/types.ts`.

**1.1 New migration** containing all of the following:

```sql
-- (a) Restore a working, trustworthy book_class.
--     SECURITY DEFINER so FOR UPDATE and the capacity count bypass caller RLS (fixes F1).
--     Server computes the price; the client no longer sends an amount (fixes F5).
--     (_discount_code is accepted but ignored until Phase 7 implements real codes.)
DROP FUNCTION IF EXISTS public.book_class(uuid, public.booking_tier, numeric, text, integer);

CREATE OR REPLACE FUNCTION public.book_class(
  _class_id uuid,
  _tier public.booking_tier DEFAULT 'drop-in',
  _discount_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _cls public.classes%ROWTYPE;
  _taken integer;
  _price numeric(10,2);
  _booking_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _cls FROM public.classes WHERE id = _class_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;
  IF _cls.starts_at < now() THEN RAISE EXCEPTION 'This class has already started'; END IF;

  SELECT count(*) INTO _taken FROM public.bookings
    WHERE class_id = _class_id AND status = 'confirmed';
  IF _taken >= _cls.spots_total THEN RAISE EXCEPTION 'Class is full'; END IF;

  IF EXISTS (SELECT 1 FROM public.bookings
             WHERE user_id = _uid AND class_id = _class_id AND status = 'confirmed') THEN
    RAISE EXCEPTION 'You already have a booking for this class';
  END IF;

  _price := CASE _tier
    WHEN 'drop-in' THEN _cls.drop_in_price
    WHEN 'pass' THEN _cls.pass_price
    WHEN 'subscription' THEN _cls.subscription_price END;

  INSERT INTO public.bookings (user_id, class_id, tier, price)
    VALUES (_uid, _class_id, _tier, _price)
    RETURNING id INTO _booking_id;

  INSERT INTO public.payments (user_id, booking_id, amount)
    VALUES (_uid, _booking_id, _price);

  UPDATE public.profiles SET waiver_signed_at = COALESCE(waiver_signed_at, now())
    WHERE id = _uid;

  RETURN _booking_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.book_class(uuid, public.booking_tier, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_class(uuid, public.booking_tier, text) TO authenticated;

-- (b) Allow rebooking after cancel (fixes F4): replace the absolute unique
--     constraint with a partial unique index on live bookings.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_class_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_live_per_class
  ON public.bookings (user_id, class_id) WHERE status = 'confirmed';

-- (c) Truthful public availability (fixes F2): a definer function anyone can call.
CREATE OR REPLACE FUNCTION public.class_availability()
RETURNS TABLE (class_id uuid, confirmed_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT class_id, count(*) FROM public.bookings
  WHERE status = 'confirmed' GROUP BY class_id;
$$;
GRANT EXECUTE ON FUNCTION public.class_availability() TO anon, authenticated;

-- (d) Stop trusting client-written payments (fixes F5): inserts happen only
--     inside book_class (SECURITY DEFINER), so drop the direct-insert path.
DROP POLICY IF EXISTS "users can insert own payments" ON public.payments;
REVOKE INSERT ON public.payments FROM authenticated;

-- (e) Constrain booking updates to cancellation only (tightens MyBookings' path):
DROP POLICY IF EXISTS "own bookings update" ON public.bookings;
CREATE POLICY "own bookings cancel" ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
```

**1.2 `src/pages/Index.tsx`:** replace the `supabase.from("bookings").select("class_id")…` query inside `loadData` with `supabase.rpc("class_availability")`, and build `counts` from the returned `{class_id, confirmed_count}` rows (`Number(confirmed_count)`).

**1.3 `src/pages/Admin.tsx` `loadClasses`:** same replacement — one source of truth for counts.

**1.4 `src/components/ClassCard.tsx` `handlePaymentConfirm`:** call the new signature — `supabase.rpc("book_class", { _class_id: studioClass.id, _tier: selectedTier })` — and delete the client-side `total` computation feeding the RPC. Map the known error messages ("Class is full", "already have a booking", "already started") to friendly toasts.

**1.5** Update `src/integrations/supabase/types.ts` (regenerate, or hand-edit `Functions.book_class.Args` to `{ _class_id: string; _tier?: "drop-in" | "pass" | "subscription"; _discount_code?: string | null }` and add `class_availability`).

**Verify:**
1. `npm run build && npm run lint` pass.
2. Via the app as a student: book a class → succeeds; book it again → "already have a booking"; cancel in My Bookings → rebook succeeds (F4 gone).
3. Open the site in a private window (signed out): a class someone booked shows the reduced spot count (F2 gone).
4. `select amount from payments order by created_at desc limit 1;` equals the class's tier price regardless of what the UI showed (F5 gone).
5. Set a test class's `spots_total` to 1, book it with one account: the next account's attempt gets "Class is full".

**Commit:** `fix(db): restore working book_class, server-side pricing, public availability, rebook after cancel`

---

### Phase 2 — Cut the SaaS surface, MCP, and dead weight

**2.1 Delete SaaS pages (C1):** remove `src/pages/ForStudios.tsx`, `src/pages/StudioSignup.tsx`, `src/pages/StudioWelcome.tsx`; remove their three routes and imports from `src/App.tsx`. Grep for `for-studios` links elsewhere and remove any found. Add a migration `<ts>_drop_studio_leads.sql` with `DROP TABLE IF EXISTS public.studio_leads;` and remove its entry from `types.ts`. Delete `.lovable/plan.md` (stale multi-tenant plan that would mislead future sessions).

**2.2 Delete dead mock data (C2):** in `src/data/classes.ts` remove `generateClasses` and `generateSchedule` (keep the interfaces; `accessories`/`discountCodes` go in Phase 4).

**2.3 Single toast system (C3):** in `src/App.tsx` remove the radix `Toaster` import/mount (keep sonner's). Delete `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`, `src/hooks/use-toast.ts`, `src/components/ui/use-toast.ts`.

**2.4 Prune unused shadcn components + deps (C4):** after 2.1–2.3 and 2.5, for each file in `src/components/ui/`, keep it only if something outside `src/components/ui/` imports it (or a *kept* ui file imports it — e.g. `calendar.tsx` needs `button.tsx`). Delete the rest. Then remove now-unused npm deps: expect at least `recharts`, `embla-carousel-react`, `react-resizable-panels`, `input-otp`, `vaul`, `cmdk`, `react-hook-form`, `@hookform/resolvers`, and every `@radix-ui/*` package with no surviving importer. **Method, not guesswork:** for each candidate, `grep -r "<pkg>" src/` must be empty before removing. `npm install` after editing `package.json`.

**2.5 Delete MCP (decision 3):** remove `supabase/functions/mcp/`, `src/lib/mcp/`, `src/pages/OAuthConsent.tsx`, the `/.lovable/oauth/consent` route in `src/App.tsx`, `.lovable/mcp/`, the `mcpPlugin()` import+usage in `vite.config.ts`, and the `@lovable.dev/mcp-js` dependency. In `src/pages/Auth.tsx`, the `?next=` handling with the `/.`-prefix special case existed for the consent page — simplify to plain `navigate(next)` (keep the `safeNext` same-origin guard). In the Supabase dashboard, delete the deployed `mcp` edge function (note in the commit if you couldn't). `zod` may become unused — check with grep and remove if so.

**Verify:** `npm run build && npm run lint && npm test` green; `npm run dev` and click through `/`, `/auth`, `/my-bookings`, `/admin`, `/memberships` — no blank screens or console errors; `/for-studios` shows NotFound; `grep -ri "mcp" src vite.config.ts` returns nothing.

**Commit:** `chore: remove SaaS marketing surface, MCP function, dead mock data, duplicate toast system, unused UI components`

---

### Phase 3 — Honest booking flow (reserve now, pay at the studio)

**Why:** stops lying to members and removes card-data collection with no processor (F6); fixes the shown-vs-recorded mismatch. Stripe replaces this in Track B — keep the modal's structure so a card step can slot back in.

**Files:** `src/components/PaymentModal.tsx`, `src/components/ClassCard.tsx`, `src/pages/Index.tsx`.

**3.1 `PaymentModal.tsx`:** delete the card fields (`cardNumber/cardExpiry/cardCvc/cardName`), `validate`, `formatCardNumber`, `formatExpiry`, the "Card Details" and "Encrypted & secure" sections, and the `requiresCard` logic. The modal becomes a **reservation confirmation**: class, selected tier + price, total, and a notice: *"Payment is collected at the studio. Cancel free of charge before class starts."* Confirm button: "Hold to reserve". Keep the component name `PaymentModal`. The `coverage` prop and CoverageBanner are removed in Phase 5 — if executing phases in order, remove them here instead and skip that part of 5.2.

**3.2 Booked state must survive reload (M3):** in `Index.tsx`, when a user is signed in, fetch their own confirmed booking `class_id`s (`supabase.from("bookings").select("class_id").eq("status","confirmed")` — RLS scopes it to them) and pass `isBooked` down to `ClassCard`; a booked class renders the "Booked ✓" state with booking controls disabled instead of relying on component-local `gripComplete`.

**Verify:** book a class end-to-end: waiver (first time only) → confirmation modal shows tier price + "pay at studio" → booked; reload → the class still shows "Booked ✓"; `grep -ri "cvc\|card number\|cardNumber" src` returns nothing.

**Commit:** `feat: honest reserve-now-pay-at-studio flow; booked state persists across reloads`

---

### Phase 4 — Remove the accessory cart and hard-coded discount codes

**Why:** decision 4 — accessories are cut; the old client-side codes are dead weight that Phase 7 replaces with a real feature.

**Files:** delete `src/components/AccessoriesDrawer.tsx`; in `src/pages/Index.tsx` remove the drawer render, `cart`, `discountCode`, `discount`, `toggleAccessory`, `applyCode`, `clearCode` state/handlers and the `accessories`/`discount`/`discountCode` props passed to `ClassCard`; in `ClassCard.tsx`/`PaymentModal.tsx` remove those props and all accessory/discount lines from the summary; in `src/data/classes.ts` remove `accessories`, `discountCodes`, and the `Accessory` interface.

**Verify:** build/lint green; the bottom drawer is gone; `grep -ri "accessor" src` returns nothing; `grep -ri "discount" src` returns nothing (until Phase 7 reintroduces it properly).

**Commit:** `chore: remove accessory cart and hard-coded client-side discount codes`

---

### Phase 5 — Keep the three tiers; retire the fictional eligibility layer

**Why:** F3 — phantom credits/memberships give away free classes. Decision 2 keeps the tier *pricing*; the *fiction* goes. Until Track B, every booking (any tier) is simply recorded at that tier's price, payable at the studio.

**Files:** `src/hooks/useEligibility.tsx` (delete), `src/components/ClassCard.tsx`, `src/components/PaymentModal.tsx`, `src/pages/Memberships.tsx`.

**5.1 `ClassCard.tsx`:** **keep** the three-tier selection grid and prices. Delete: the `useEligibility` import/usage, the eligibility banner, the "Included"/"Uses 1 credit" badges and strikethrough price styling, the `defaultTier` auto-select (no tier is pre-selected; user picks one), and the coverage-dependent button labels ("Hold to book — included", "Hold to use 1 credit") — the label is always "Hold to confirm". The "from $X" teaser in the collapsed row should show the *lowest* of the three prices with "from".
**5.2 `PaymentModal.tsx`:** remove `coverage`/`BookingCoverage`/CoverageBanner if not already done in 3.1; the summary is class + tier + price + total.
**5.3 `Memberships.tsx`:** remove the hold-to-subscribe and pack-purchase interactions (and the broken `gripTimer` — F9); keep it as an informational pricing page with a clear note: *"Memberships and class packs are set up at the front desk — online checkout is coming soon."* Buttons become non-interactive or a `mailto:` link. (Track B makes this page transactional again — don't delete it.)
**5.4** Leave the DB columns (`pass_price`, `subscription_price`, `tier` enum) exactly as they are — Track B needs them.

**Verify:** build/lint green; no "credits remaining"/"Included"/"membership active" text anywhere (`grep -ri "credit\|Included\|membership active" src` — only Memberships marketing copy remains); booking a "pass"-tier class records `tier='pass'` and `price = pass_price`; Memberships page has no interactive purchase.

**Commit:** `feat: keep tier pricing, remove fictional credits/membership eligibility until Stripe lands`

---

### Phase 6 — Admin roster with names + first-admin path

**Why:** F7/M2 — the studio must know who's coming; decision 5.

**6.1 Migration `<ts>_admin_roster.sql`:**

```sql
-- Admins may read member profiles (needed for the class roster).
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
```

*(Note: migration 3 made `has_role` SECURITY INVOKER; that still works here because `user_roles` RLS lets a user read their own roles, which is the only lookup this policy performs for the caller. Do not change `has_role`.)*

**6.2 `src/pages/Admin.tsx` `loadDayBookings`:** change the bookings select to `"id, class_id, user_id, tier, price, status, created_at, profiles:user_id(display_name)"` — if the generated types fight the embedded join, fetch profiles in a second query (`.in("id", userIds)`) and merge. Replace the "Booking ID" column with "Member" (`display_name`, falling back to the booking-id prefix).

**6.3 First-admin instructions (goes into the Phase 10 README):** run in the Supabase SQL editor:
`insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = '<owner email>' on conflict do nothing;`
The owner signs up through the app first, then runs this once with their email.

**Verify:** as admin, Bookings-by-day shows member display names; as a non-admin, `/admin` still redirects home and `supabase.from("profiles").select("*")` still returns only the caller's own row.

**Commit:** `feat(admin): class roster shows member names; document first-admin setup`

---

### Phase 7 — Real, studio-managed discount codes

**Why:** decision 4 — the studio issues codes (friends & family, sales, promos); the server enforces them. Applies to the **class price** at booking time.

**Files:** migration `<ts>_discount_codes.sql`; `src/pages/Admin.tsx` (new tab); `src/components/PaymentModal.tsx`; `src/components/ClassCard.tsx`; `types.ts`.

**7.1 Migration:**

```sql
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code = upper(code) AND length(code) BETWEEN 3 AND 20),
  percent integer NOT NULL CHECK (percent BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage discount codes" ON public.discount_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Members never SELECT this table directly; they validate via the function below.

-- Validation without exposing the code list (callable pre-booking for instant UI feedback):
CREATE OR REPLACE FUNCTION public.check_discount_code(_code text)
RETURNS integer  -- percent, or raises
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _dc public.discount_codes%ROWTYPE;
BEGIN
  SELECT * INTO _dc FROM public.discount_codes WHERE code = upper(trim(_code));
  IF NOT FOUND OR NOT _dc.active THEN RAISE EXCEPTION 'Invalid code'; END IF;
  IF _dc.expires_at IS NOT NULL AND _dc.expires_at < now() THEN RAISE EXCEPTION 'Code expired'; END IF;
  IF _dc.max_uses IS NOT NULL AND _dc.use_count >= _dc.max_uses THEN RAISE EXCEPTION 'Code fully redeemed'; END IF;
  RETURN _dc.percent;
END; $$;
GRANT EXECUTE ON FUNCTION public.check_discount_code(text) TO authenticated;

-- Extend book_class to apply the code server-side (replaces Phase 1's body; same signature):
CREATE OR REPLACE FUNCTION public.book_class(
  _class_id uuid,
  _tier public.booking_tier DEFAULT 'drop-in',
  _discount_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _cls public.classes%ROWTYPE;
  _taken integer;
  _price numeric(10,2);
  _pct integer := 0;
  _booking_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _cls FROM public.classes WHERE id = _class_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;
  IF _cls.starts_at < now() THEN RAISE EXCEPTION 'This class has already started'; END IF;

  SELECT count(*) INTO _taken FROM public.bookings
    WHERE class_id = _class_id AND status = 'confirmed';
  IF _taken >= _cls.spots_total THEN RAISE EXCEPTION 'Class is full'; END IF;

  IF EXISTS (SELECT 1 FROM public.bookings
             WHERE user_id = _uid AND class_id = _class_id AND status = 'confirmed') THEN
    RAISE EXCEPTION 'You already have a booking for this class';
  END IF;

  _price := CASE _tier
    WHEN 'drop-in' THEN _cls.drop_in_price
    WHEN 'pass' THEN _cls.pass_price
    WHEN 'subscription' THEN _cls.subscription_price END;

  IF _discount_code IS NOT NULL AND length(trim(_discount_code)) > 0 THEN
    _pct := public.check_discount_code(_discount_code);
    UPDATE public.discount_codes SET use_count = use_count + 1
      WHERE code = upper(trim(_discount_code));
    _price := round(_price * (1 - _pct / 100.0), 2);
  END IF;

  INSERT INTO public.bookings (user_id, class_id, tier, price)
    VALUES (_uid, _class_id, _tier, _price)
    RETURNING id INTO _booking_id;

  INSERT INTO public.payments (user_id, booking_id, amount, discount_code, discount_percent)
    VALUES (_uid, _booking_id, _price,
            CASE WHEN _pct > 0 THEN upper(trim(_discount_code)) END, _pct);

  UPDATE public.profiles SET waiver_signed_at = COALESCE(waiver_signed_at, now())
    WHERE id = _uid;

  RETURN _booking_id;
END; $$;
```

**7.2 Admin UI:** add a **Discounts** tab in `Admin.tsx` (next to Classes / Bookings by day): a table of codes (code, %, active, expiry, uses/max) with create form (code auto-uppercased, percent, optional expiry date, optional max uses) and an activate/deactivate toggle (UPDATE `active`). Delete allowed only when `use_count = 0`, otherwise deactivate.

**7.3 Booking UI:** in `PaymentModal.tsx` (reservation confirmation), add a "Discount code" input + Apply button. Apply calls `supabase.rpc("check_discount_code", { _code })`; on success show the percent and the reduced total; on error show the message ("Invalid code" / "Code expired" / "Code fully redeemed"). Pass the applied code up so `ClassCard.handlePaymentConfirm` sends it: `supabase.rpc("book_class", { _class_id, _tier, _discount_code })`. The server remains authoritative — the client's displayed total is cosmetic.

**7.4** Update `types.ts` (table + both functions).

**Verify:** admin creates `FRIENDS20` (20%); member applies it at booking → total shows −20% and `payments.amount` = tier price × 0.8 with `discount_code='FRIENDS20'`, `discount_percent=20`; `use_count` incremented; applying `NOPE` → "Invalid code"; a code with `max_uses=1` fails on second redemption; deactivated code fails; non-admin cannot `select * from discount_codes` (RLS returns 0 rows).

**Commit:** `feat: studio-managed discount codes, validated and applied server-side`

---

### Phase 8 — Studio settings: logo, name, tagline, instructor roster

**Why:** decision 6 — the studio brands its own instance without touching code. (Class names/times/prices are already editable in the Admin Classes tab.)

**Files:** migration `<ts>_studio_settings.sql`; `src/pages/Admin.tsx` (Settings tab); `src/components/StudioHeader.tsx`; `src/pages/Auth.tsx`; new `src/hooks/useStudioSettings.tsx`; `types.ts`.

**8.1 Migration:**

```sql
-- Single-row settings table (single-tenant by design).
CREATE TABLE public.studio_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),  -- enforces exactly one row
  name text NOT NULL DEFAULT 'Studio Roxx',
  tagline text NOT NULL DEFAULT 'Pole · Dance · Strength',
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.studio_settings DEFAULT VALUES;
GRANT SELECT ON public.studio_settings TO anon, authenticated;
GRANT UPDATE ON public.studio_settings TO authenticated;
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.studio_settings FOR SELECT USING (true);
CREATE POLICY "admins update settings" ON public.studio_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.studio_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Instructor roster.
CREATE TABLE public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.instructors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.instructors TO authenticated;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instructors public read" ON public.instructors FOR SELECT USING (true);
CREATE POLICY "admins manage instructors" ON public.instructors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Seed from existing classes so the roster starts populated:
INSERT INTO public.instructors (name)
  SELECT DISTINCT instructor FROM public.classes ON CONFLICT (name) DO NOTHING;
```

Also create a **public Storage bucket `branding`** (Supabase dashboard or `insert into storage.buckets (id, name, public) values ('branding','branding',true);` in the migration) with storage policies: public read; insert/update/delete only for admins (`public.has_role(auth.uid(), 'admin')`).

**8.2 `useStudioSettings.tsx`:** small hook (react-query `useQuery`) returning `{name, tagline, logo_url}` with the current hard-coded values as fallback while loading.

**8.3 Consume it:** `StudioHeader.tsx` renders `logo_url` (if set, as an `<img>` next to the name) + `name` + `tagline` instead of the hard-coded "STUDIO ROXX / Pole · Dance · Strength"; `Auth.tsx` header likewise; `index.html` `<title>` stays generic.

**8.4 Admin Settings tab:** fields for name and tagline (save → UPDATE the single row); logo upload: `supabase.storage.from("branding").upload("logo", file, { upsert: true })` then save the public URL into `logo_url`. Instructor roster management: list, add, rename, deactivate. **Keep `classes.instructor` as plain text** (no FK — avoids breaking existing rows); the class create/edit form's Instructor field becomes a `<Select>` populated from active instructors.

**Verify:** change name/tagline/logo as admin → header updates for a signed-out visitor after refresh; new class form offers only roster instructors; non-admin cannot update settings or instructors (RLS blocks); deactivated instructor disappears from the form but old classes still display their name.

**Commit:** `feat: studio branding settings and instructor roster, editable in Admin`

---

### Phase 9 — Embeddable schedule + website instructions

**Why:** decision 7 — studios put the scheduler on their existing website.

**Files:** `src/pages/Index.tsx` (embed mode), `src/App.tsx` (route), new `docs/EMBED.md`, hosting config note.

**9.1 Embed mode:** support `/?embed=1` (read via `useSearchParams`) on the schedule page. When set: hide `StudioHeader`'s nav links (keep the studio name/logo — it's the studio's own site, branding is fine), hide the Memberships link, and add `target="_top"`-style behavior for auth: booking still requires sign-in, and inside an iframe the `/auth` redirect must open the full app — implement by making the "Sign in to book" path do `window.open(window.location.origin + "/auth", "_blank")` when `window.self !== window.top`. Simplest robust rule: in embed mode, every booking attempt for a signed-out user opens the full app in a new tab.

**9.2 Framing headers:** the app must be frameable. Check the hosting platform's defaults (Lovable/Netlify/Vercel): ensure no `X-Frame-Options: DENY/SAMEORIGIN` is sent; if the host supports custom headers, set `Content-Security-Policy: frame-ancestors *;` (or the studio's domain). Document what was found and where it's configured in `docs/EMBED.md` — if headers can't be verified from the repo, say so explicitly there.

**9.3 `docs/EMBED.md`** — written for a non-technical studio owner, containing: what the embed shows; the exact copy-paste snippet:

```html
<!-- Studio Roxx schedule -->
<iframe
  src="https://YOUR-APP-URL/?embed=1"
  style="width:100%; min-height:900px; border:0; border-radius:12px;"
  title="Class schedule"
  loading="lazy">
</iframe>
```

plus: where to find YOUR-APP-URL, a note that members sign in/book in a new tab on first booking, how it behaves on mobile, and (for Wix/Squarespace/WordPress) one line each on where to paste HTML.

**Verify:** `/?embed=1` hides nav; a local test page containing the iframe (put it in `docs/embed-test.html`, open via `python3 -m http.server`) renders the schedule; clicking book while signed out opens the full app in a new tab; normal `/` is unchanged.

**Commit:** `feat: embeddable schedule mode with copy-paste website instructions`

---

### Phase 10 — README + docs

Rewrite `README.md` (replace the Lovable boilerplate) with, concretely: what the app is (one paragraph); stack; local setup (`npm install`, `.env` vars — note the anon key is publishable by design); how migrations are applied; **first-admin creation (6.3)**; how classes, instructors, branding, and discount codes are managed (Admin UI); the payment model ("reserve online, pay at studio — Stripe checkout is planned"); the embed feature (link to `docs/EMBED.md`); scripts table (`dev`, `build`, `lint`, `test`). Keep it under ~140 lines. Fix the waiver/UI copy mismatch from F8: in `WaiverModal.tsx`'s `WAIVER_TEXT`, change section 6 to match actual behavior (*"Bookings may be cancelled free of charge any time before class starts."*).

**Verify:** a newcomer following only the README can run the app locally, create an admin, brand the studio, and embed the schedule. Waiver text no longer promises a 4-hour policy the app doesn't enforce.

**Commit:** `docs: real README; align waiver cancellation text with actual behavior`

---

### Phase 11 — Tests that protect the core (last)

Replace `src/test/example.test.ts` with real coverage. Keep scope tight — these must run with `npm test` (vitest + jsdom), no live Supabase:

- **11.1** Extract the pure schedule-building logic from `Index.tsx` (the 30-day `schedule` memo body and `timeBucket`) into `src/lib/schedule.ts` as pure functions (`buildSchedule(dbClasses, bookingCounts, today)`, `timeBucket`). `Index.tsx` imports them. Test: classes land on the correct day bucket across a month boundary; spots-taken mapping; `timeBucket` edges (11:59→morning, 12:00→afternoon, 17:00→evening).
- **11.2** Component test for `WaiverModal`: sign button stays disabled until scrolled + agreed + name ≥ 2 chars.
- **11.3** Component test for `ClassCard` (mock `supabase.rpc`): full class renders disabled; a booked class (`isBooked`) shows "Booked ✓"; successful hold-to-book calls `book_class` with `{_class_id, _tier, _discount_code}` only.
- **11.4** Unit test for the discount display math in `PaymentModal` (percent → total), asserting it matches the SQL rounding (`round(price * (1 - pct/100), 2)`).
- Delete `playwright.config.ts` / `playwright-fixture.ts` / `@playwright/test` + `lovable-agent-playwright-config` only if no CI references them (grep `.github/` — currently absent, so delete).

**Verify:** `npm test` runs ≥ 10 assertions and passes; `npm run build` green.

**Commit:** `test: cover schedule building, waiver gating, booking contract, discount math`

---

## Track B — Stripe integration (SEPARATE task for a stronger model — do NOT attempt in Track A)

Recorded here so Track A leaves the right seams; the executing model for Track A must not start any of this:

- Stripe Checkout/Payment Intents via Supabase edge functions; webhook updates `payments.status`.
- Real **class-pack purchases** (a `purchases`/`pass_credits` table decremented by `book_class`) and real **subscription memberships** (Stripe Billing; status mirrored to a `memberships` table) — this is what makes the three tiers and the Memberships page transactional again.
- Refund handling on cancellation, and enforcing the cancellation window.
- Seams Track A must preserve: the `tier` enum and three price columns stay; `PaymentModal` stays a modal (card step slots back in); `payments` rows are only ever written by SECURITY DEFINER functions.

## Out of scope entirely (do not do without new instructions)

Multi-tenant anything, waitlists, email notifications beyond Supabase auth defaults, native apps/PWA manifest work, enforcing the 4-hour cancellation window, storing waiver signature text (flagged in F8 — a `waivers` table with the typed name is the right shape when legal record-keeping matters), rebuilding the MCP function.
