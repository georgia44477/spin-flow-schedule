# Studio Roxx — Review & Execution Plan

**Audience:** an executing model/developer who has NOT seen the review conversation. Everything you need is in this file. Work top to bottom within each phase; phases are ordered by leverage (highest impact first). Do not invent scope beyond what a step says.

**Product context (confirmed with the owner):**
- This is a **real booking product for a single pole/dance studio** ("Studio Roxx"). It is not a multi-studio SaaS.
- Definition of done: a **ship-ready happy path** — a member can browse the schedule, sign the waiver once, book a class, and the studio can see who's coming. Edge cases can wait.
- Cutting is encouraged: **anything not core to that happy path can be deleted** (owner's explicit instruction), *except* where an open question below says to ask first.

**Stack:** Vite + React 18 + TypeScript + Tailwind/shadcn (Lovable-generated), Supabase (Postgres + Auth + RLS + one `mcp` edge function). No server of our own; the browser talks to Supabase directly, so **RLS and SQL functions are the only trustworthy layer**.

---

## Open questions for the owner (answer before the gated steps)

Steps marked **[GATED-Qn]** must not start until question *n* is answered. Everything else is unconditional — start immediately.

1. **Q1 — Payments.** There is no payment processor. The payment modal collects card number/expiry/CVC, "validates" them, then throws them away and books the class for free. Options:
   - **(a) Recommended for launch:** remove the fake card form entirely; booking becomes "Reserve your spot — pay at the studio." Honest, zero integration work, and stops collecting card data we don't process (a trust/PCI-optics hazard).
   - **(b)** Integrate Stripe (Payment Intents via a new Supabase edge function). Correct long-term, but multi-day work and needs a Stripe account.
   - The plan below implements (a); if you choose (b), Phase 3 becomes a Stripe integration project and should come back to a stronger model for planning.

2. **Q2 — Pricing tiers.** Every class row carries three prices (drop-in / pass / subscription), and "pass credits" and "memberships" are *derived fictions* (see Findings F3). The Memberships page's "Hold to subscribe" and "Purchase pack" buttons only show a toast — nothing is saved. Options:
   - **(a) Recommended for launch:** book at a single per-class price (keep `drop_in_price` as *the* price). Memberships page becomes informational ("handled at the front desk"). Passes/memberships return later as real purchase records.
   - **(b)** Keep three tiers and build real `purchases` tables + Stripe subscriptions — significant scope, not a cheaper-model task.
   - The plan below implements (a).

3. **Q3 — MCP edge function.** `supabase/functions/mcp` + `/.lovable/oauth/consent` let AI assistants book classes via OAuth. The most recent commit added this, so it looks intentionally wanted. The plan **keeps it** but patches it to match the DB changes (Phase 2, step 2.5). Confirm you still want it; if not, delete `supabase/functions/mcp`, `src/lib/mcp`, `src/pages/OAuthConsent.tsx`, the `/.lovable/oauth/consent` route, `.lovable/mcp`, the `mcpPlugin()` line in `vite.config.ts`, and the `@lovable.dev/mcp-js` dependency instead.

4. **Q4 — Accessories & discount codes.** The bottom drawer sells grip powder etc. with hard-coded client-side discount codes. Purchased items are never recorded anywhere (only a lump-sum amount), so the studio can't fulfill them. The plan **cuts them** (Phase 4). Say so if you want them kept — then they need an `order_items` table instead.

5. **Q5 — First admin.** There is no UI to grant the `admin` role. The plan documents a one-time SQL statement (Phase 6). Confirm that's acceptable for a single studio.

---

## Map of the project (what exists, how it connects)

```
src/App.tsx                     Routes + providers (react-query, AuthProvider, two toasters)
src/pages/
  Index.tsx        CORE   Schedule browser: loads `classes` + confirmed `bookings` counts,
                          builds 30-day schedule, filters, list/calendar views, renders ClassCard
  Auth.tsx         CORE   Email/password + Google (Lovable auth); ?next= redirect (incl. OAuth consent)
  MyBookings.tsx   CORE   Lists own bookings; cancel = UPDATE status='cancelled'
  Admin.tsx        CORE   Admin-only: CRUD on classes; bookings-by-day roster (IDs only, no names)
  Memberships.tsx  FAKE   Plans + class packs; "subscribe"/"purchase" only fire a toast
  ForStudios.tsx   CUT    B2B SaaS marketing page (multi-studio pitch, fictional Stripe/waitlist claims)
  StudioSignup.tsx CUT    SaaS lead-capture form -> `studio_leads` table
  StudioWelcome.tsx CUT   SaaS post-signup checklist
  OAuthConsent.tsx KEEP?  Approve/deny screen for MCP OAuth (Q3)
  NotFound.tsx     CORE
src/components/
  ClassCard.tsx    CORE   Expand -> pick tier -> hold-to-book -> WaiverModal (first time) -> PaymentModal
                          -> supabase.rpc("book_class")
  PaymentModal.tsx CORE*  Fake card form + order summary (Q1)
  WaiverModal.tsx  CORE   Scroll-to-read waiver, typed signature (signature text is never persisted)
  AccessoriesDrawer.tsx CUT?  Accessory cart + discount codes (Q4)
  StudioHeader/DateScrubber/MonthCalendar/ClassFilters/NavLink  CORE presentation
src/hooks/
  useAuth.tsx      CORE   Session context
  useIsAdmin.tsx   CORE   Reads user_roles for 'admin'
  useEligibility.tsx FAKE Derives "pass credits" / "active membership" from booking counts (F3)
  use-toast.ts     DEAD   Radix toast system; all real toasts use sonner
src/data/classes.ts        Types (used) + mock schedule generator (dead) + accessories/discount data (Q4)
src/integrations/supabase/ client.ts + generated types.ts
src/integrations/lovable/  Google OAuth wrapper
src/lib/mcp/               MCP tool sources (bundled into the edge function by the Vite plugin)
supabase/migrations/       3 migrations: schema+RLS, studio_leads, "security hardening" (broke booking — F1)
supabase/functions/mcp/    Auto-generated bundle of src/lib/mcp
```

**The booking data path (core of the product):**
`Index` fetches `classes` and counts confirmed `bookings` → `ClassCard` → waiver check on `profiles.waiver_signed_at` → `PaymentModal` → `supabase.rpc("book_class", {_class_id, _tier, _total_amount, ...})` → SQL function inserts `bookings` + `payments` rows and stamps the waiver → UI refetches.

---

## Findings

### A. Fragile / broken (these outrank everything)

- **F1 — Booking is almost certainly broken for every student.** Migration 3 (`20260710142824`) changed `book_class` from `SECURITY DEFINER` to `SECURITY INVOKER`. The function does `SELECT … FOR UPDATE` on `classes`, but `authenticated` only has `GRANT SELECT` on `classes` — `FOR UPDATE` requires the `UPDATE` privilege, so the call should fail with *permission denied for table classes* for non-admins. Even if it didn't, the capacity check `SELECT COUNT(*) FROM bookings WHERE class_id = …` now runs under the caller's RLS, which only lets them see **their own** bookings — so the count is 0/1 and a full class would still accept bookings. Migration 3's "hardening" broke correctness.
- **F2 — Public spot counts are wrong for everyone.** `Index.tsx` counts spots by selecting from `bookings`, but RLS only returns the caller's own rows (none for anonymous visitors). Every class therefore shows as nearly empty to everyone except the few spots they booked themselves. Admins see true counts — misleading in the opposite direction during testing.
- **F3 — Eligibility is fiction.** `useEligibility.tsx` computes "pass credits" as: every 10th pass-tier *booking* mints a new 10-pack, so the **first** pass-tier booking grants 9 phantom free credits. "Active membership" = any subscription-tier booking in the last 30 days — so paying one class's `subscription_price` (~$18) buys 30 days of "unlimited, included" classes. No purchase records exist. Combined with F5, a user picks the cheapest tier and everything afterward is free.
- **F4 — Rebooking after cancel is impossible.** `bookings` has `UNIQUE (user_id, class_id)`; cancelling sets `status='cancelled'` but keeps the row, so booking the same class again violates the unique constraint with a raw Postgres error.
- **F5 — The client sets the price.** `book_class` accepts `_total_amount` from the browser and records it into `payments` verbatim; the RLS `payments` INSERT policy also lets any authenticated user insert arbitrary payment rows directly. Revenue records are untrustworthy. Also, `ClassCard.handlePaymentConfirm` computes the total ignoring coverage, while `PaymentModal` displays a coverage-adjusted total — the number shown and the number recorded disagree whenever "credits"/"membership" apply.
- **F6 — The payment UI is theater.** Card fields are collected, format-checked, and discarded; nothing is charged; the success toast says "Booked!". For a real studio this is dishonest to members and collects card data with no processor (Q1).
- **F7 — Admin can't see who booked.** The roster shows booking-ID prefixes only. There's no join to `profiles`, and RLS wouldn't allow it anyway (only own-profile SELECT; no admin policy on `profiles`). A front desk needs names.
- **F8 — Waiver record is weak.** The typed signature name in `WaiverModal` is never persisted — only a timestamp, set as a *side effect inside `book_class`* whether or not a waiver was shown (the MCP `book_class` tool explicitly relies on this: "booking via MCP counts as accepting the waiver"). The waiver text also promises a 4-hour cancellation policy the app doesn't enforce (cancel is allowed until class start — acceptable for launch, but the texts shouldn't lie).
- **F9 — `Memberships.tsx` timer bug.** `gripTimer` is a plain `let` in the component body, recreated every render; `endGrip`'s stale closure can't clear it, so releasing early still "activates" the fake membership. Moot once Phase 3 removes the fake purchase, but do not copy this pattern.

### B. Overbuilt / redundant (cut)

- **C1 — SaaS pages:** `ForStudios.tsx`, `StudioSignup.tsx`, `StudioWelcome.tsx`, the `studio_leads` table, and the `.lovable/plan.md` multi-tenant ambitions. Marketing for a product that doesn't exist (promises Stripe payouts, waitlists, CSV import, 14-day trials). Single-studio product → delete.
- **C2 — Dead mock data:** `generateClasses`/`generateSchedule` in `src/data/classes.ts` are unused (Index reads the DB).
- **C3 — Two toast systems:** radix `toast`/`toaster`/`use-toast` are mounted in `App.tsx` but every toast call in the app uses `sonner`. Delete the radix one.
- **C4 — ~30 unused shadcn components** (accordion, alert-dialog, avatar, breadcrumb, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, progress, resizable, scroll-area, sidebar, slider, switch, table, toggle-group, alert, aspect-ratio…) and their npm deps (`recharts`, `embla-carousel-react`, `react-resizable-panels`, `input-otp`, `vaul`, `cmdk`, `react-hook-form`, `@hookform/resolvers`, and many `@radix-ui/*`). Used ones (keep): badge, button, calendar, card, dialog, input, label, popover, radio-group*, select, separator*, sheet*, skeleton*, sonner, tabs, textarea, toggle*, tooltip (* = imported only by files this plan deletes — re-check after deletions).
- **C5 — Accessories/discount codes** (Q4): client-side coupon list anyone can read in the bundle; items never recorded.

### C. Missing for the goal

- **M1** — A truthful availability source for anonymous visitors (fixes F2).
- **M2** — Admin roster with member names (fixes F7).
- **M3** — Honest booking confirmation (what you owe, where you pay) + booked-state that survives reload (ClassCard's "Booked ✓" is component-local state; after refresh the user can attempt a duplicate booking and gets a raw unique-violation error).
- **M4** — Real docs: README is Lovable boilerplate; nothing explains env vars, migrations, or how the first admin is created.
- **M5** — Tests that protect the core flow: the only test is `expect(true).toBe(true)`.

- **F10 — The lockfile doesn't install outside Lovable's infrastructure.** `package-lock.json` resolves 123 packages from Lovable's private registry mirror (`https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...`). On any machine without access to that mirror, `npm install` hangs/fails. (Verified in this review environment: install could not complete.) `bun.lock`/`bun.lockb` are also checked in alongside `package-lock.json` — three lockfiles, one source of truth needed.

### D. Structure vs goal

- The three-prices-per-class + derived-eligibility design fights the single-studio goal; purchases must be records, not inferences (resolved by Q2a for launch).
- The browser is trusted with money math (resolved by computing price server-side).
- `.env` committed with the Supabase anon key: this is a *publishable* key by design — fine — but the file should still move to `.env.example` convention eventually. Not in scope; RLS is the security boundary, which is why Phase 1 matters most.

---

## Execution phases

> **Conventions for every phase:** run `npm run build && npm run lint && npm test` before starting (green baseline) and after finishing. Commit each phase separately with the message given. SQL changes go in a **new** migration file — never edit the three existing migrations. Migration filenames: `supabase/migrations/<UTC yyyymmddHHMMSS>_<slug>.sql`. Apply to the live project with `supabase db push` if the CLI is linked; otherwise paste into the Supabase SQL editor — and say in the commit/PR notes which one you did. After any change to `book_class` or tables, regenerate `src/integrations/supabase/types.ts` if the CLI is available (`supabase gen types typescript --project-id wbjqsxrwfwmseugjuzqe > src/integrations/supabase/types.ts`); if not, hand-edit the affected `Functions`/`Views` entries to match.

---

### Phase 0 — Make the project installable anywhere (unconditional; do this before anything else)

**Why:** F10 — without it, no other phase's verification steps can run outside Lovable.

**Steps:** delete `package-lock.json`, `bun.lock`, and `bun.lockb`; ensure no `.npmrc` pins a private registry; run `npm install` against the default public registry to regenerate `package-lock.json`; commit only the new `package-lock.json` (npm is the lockfile of record — the project scripts are npm-based).

**Verify:** `grep -c "pkg.dev" package-lock.json` returns 0; `npm ci && npm run build && npm run lint && npm test` all pass on a clean checkout. **This is the green baseline every later phase refers to.** If `npm run build` fails at this point, stop and report — later phases assume a building project.

**Commit:** `fix: regenerate lockfile against public npm; drop bun lockfiles`

---

### Phase 1 — Make booking actually work and un-forgeable (unconditional; highest leverage)

**Why first:** the core RPC is broken (F1), spot counts lie (F2), users can't rebook (F4), and the client sets prices (F5). Everything else builds on a booking path that works.

**Files:** new migration `supabase/migrations/<ts>_fix_booking.sql`; `src/components/ClassCard.tsx`; `src/pages/Index.tsx`; `src/pages/Admin.tsx`; `src/integrations/supabase/types.ts`.

**1.1 New migration** containing all of the following:

```sql
-- (a) Restore a working, trustworthy book_class.
--     SECURITY DEFINER so FOR UPDATE and the capacity count bypass caller RLS (fixes F1).
--     Server computes the price; the client no longer sends an amount (fixes F5).
DROP FUNCTION IF EXISTS public.book_class(uuid, public.booking_tier, numeric, text, integer);

CREATE OR REPLACE FUNCTION public.book_class(_class_id uuid, _tier public.booking_tier DEFAULT 'drop-in')
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
REVOKE EXECUTE ON FUNCTION public.book_class(uuid, public.booking_tier) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_class(uuid, public.booking_tier) TO authenticated;

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

**1.3 `src/pages/Admin.tsx` `loadClasses`:** same replacement (the direct `bookings` query there also miscounts for non-owner rows only if roles change; use the RPC for one source of truth).

**1.4 `src/components/ClassCard.tsx` `handlePaymentConfirm`:** call the new signature — `supabase.rpc("book_class", { _class_id: studioClass.id, _tier: selectedTier })` — and delete the client-side `total` computation feeding the RPC (PaymentModal still *displays* a total; Phase 3 reworks that display). Map the known error messages ("Class is full", "already have a booking", "already started") to friendly toasts.

**1.5** Update `src/integrations/supabase/types.ts` (regenerate, or hand-edit `Functions.book_class.Args` to `{ _class_id: string; _tier?: "drop-in" | "pass" | "subscription" }` and add `class_availability`).

**Verify:**
1. `npm run build && npm run lint` pass.
2. In the Supabase SQL editor, as a *student* JWT (or via the app): book a class → succeeds; book it again → "already have a booking"; cancel in My Bookings → rebook succeeds (F4 gone).
3. Open the site in a private window (signed out): a class someone booked shows the reduced spot count (F2 gone).
4. `select amount from payments order by created_at desc limit 1;` equals the class's tier price regardless of what the UI showed (F5 gone).
5. Book every spot of a small test class with different accounts (or lower `spots_total` to 1): the next attempt gets "Class is full".

**Commit:** `fix(db): restore working book_class, server-side pricing, public availability, rebook after cancel`

---

### Phase 2 — Cut the SaaS surface and dead weight (unconditional)

**Why:** smallest risk, big clarity win; shrinks everything later phases touch.

**2.1 Delete SaaS pages (C1):** remove `src/pages/ForStudios.tsx`, `src/pages/StudioSignup.tsx`, `src/pages/StudioWelcome.tsx`; remove their three routes and imports from `src/App.tsx`. Grep for `for-studios` links elsewhere (none expected outside these files) and remove any found. Add a migration `<ts>_drop_studio_leads.sql` with `DROP TABLE IF EXISTS public.studio_leads;` and remove its entry from `types.ts`. Delete `.lovable/plan.md` (stale multi-tenant plan that would mislead future sessions).

**2.2 Delete dead mock data (C2):** in `src/data/classes.ts` remove `generateClasses` and `generateSchedule` (keep the interfaces; keep `accessories`/`discountCodes` only until Phase 4 removes them).

**2.3 Single toast system (C3):** in `src/App.tsx` remove the radix `Toaster` import/mount (keep sonner's). Delete `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`, `src/hooks/use-toast.ts`, `src/components/ui/use-toast.ts`.

**2.4 Prune unused shadcn components + deps (C4):** after 2.1–2.3, run `npx knip` or manually grep: for each file in `src/components/ui/`, keep it only if something outside `src/components/ui/` imports it (or a *kept* ui file imports it — e.g. `calendar.tsx` needs `button.tsx`). Delete the rest. Then remove now-unused npm deps: expect at least `recharts`, `embla-carousel-react`, `react-resizable-panels`, `input-otp`, `vaul`, `cmdk`, `react-hook-form`, `@hookform/resolvers`, and every `@radix-ui/*` package with no surviving importer. **Method, not guesswork:** for each candidate, `grep -r "<pkg>" src/` must be empty before removing. `npm install` after editing `package.json`.

**2.5 [GATED-Q3] MCP function follow-up:** if keeping MCP (default), edit `src/lib/mcp/tools/book-class.ts` to call the new RPC signature (drop `_total_amount`/`_discount_*`; it can stop pre-fetching prices). The Vite plugin regenerates `supabase/functions/mcp/index.ts` on `npm run dev` — run dev once, confirm the bundle updated, and redeploy the function (`supabase functions deploy mcp`). If cutting MCP, follow the deletion list in Q3 instead.

**Verify:** `npm run build && npm run lint && npm test` green; `npm run dev` and click through `/`, `/auth`, `/my-bookings`, `/admin`, `/memberships` — no blank screens or console errors; `/for-studios` now shows the NotFound page.

**Commit:** `chore: remove SaaS marketing surface, dead mock data, duplicate toast system, unused UI components`

---

### Phase 3 — Honest booking & payment flow **[GATED-Q1, default = pay-at-studio]**

**Why:** stops lying to members and removes card-data collection with no processor (F6), and fixes the shown-vs-recorded mismatch (F5's UI half).

**Files:** `src/components/PaymentModal.tsx`, `src/components/ClassCard.tsx`, `src/pages/Index.tsx`.

**3.1 `PaymentModal.tsx`:** delete the card fields (`cardNumber/cardExpiry/cardCvc/cardName`), `validate`, `formatCardNumber`, `formatExpiry`, the "Card Details" and "Encrypted & secure" sections, and the `requiresCard` logic. The modal becomes a **booking confirmation**: class, tier price, total, and a notice: *"Payment is collected at the studio. Cancel free of charge before class starts."* Confirm button text: "Hold to reserve". Rename nothing exported (keep `PaymentModal` name to minimize churn) but update the header copy from "Confirm your booking / charged today" to reservation language. Remove the `coverage` prop and `BookingCoverage` type **only if** Phase 5 (eligibility removal) is also being done — otherwise leave them.

**3.2 `ClassCard.tsx`:** booked state must survive reload (M3): after Phase 1 the RPC rejects duplicates, but the UI should know beforehand. In `Index.tsx`, when a user is signed in, fetch their own confirmed booking `class_id`s (`supabase.from("bookings").select("class_id").eq("status","confirmed")` — RLS scopes it to them) and pass `isBooked` down to `ClassCard`; a booked class renders the "Booked ✓" state with the expand/booking controls disabled instead of relying on component-local `gripComplete`.

**Verify:** book a class end-to-end: waiver (first time only) → confirmation modal shows price + "pay at studio" → booked; reload the page → the class still shows "Booked ✓"; no card inputs exist anywhere (`grep -ri "cvc\|card number" src` returns nothing).

**Commit:** `feat: honest reserve-now-pay-at-studio flow; booked state persists across reloads`

---

### Phase 4 — Remove accessories & discount codes **[GATED-Q4, default = cut]**

**Files:** delete `src/components/AccessoriesDrawer.tsx`; in `src/pages/Index.tsx` remove the drawer render, `cart`, `discountCode`, `discount`, `toggleAccessory`, `applyCode`, `clearCode` state/handlers and the `accessories`/`discount`/`discountCode` props passed to `ClassCard`; in `ClassCard.tsx`/`PaymentModal.tsx` remove those props and all accessory/discount lines from the summary; in `src/data/classes.ts` remove `accessories`, `discountCodes`, and the `Accessory` interface.

**Verify:** build/lint green; the bottom drawer is gone; `grep -ri "discount\|accessor" src` returns nothing outside `node_modules`.

**Commit:** `chore: remove accessory cart and client-side discount codes`

---

### Phase 5 — Single-price booking; retire fictional eligibility **[GATED-Q2, default = single price]**

**Why:** F3 — the credits/membership fictions give away free classes and confuse the UI.

**Files:** `src/hooks/useEligibility.tsx` (delete), `src/components/ClassCard.tsx`, `src/components/PaymentModal.tsx`, `src/pages/Memberships.tsx`.

**5.1 `ClassCard.tsx`:** delete the tier-selection grid, `useEligibility` usage, eligibility banners, and `defaultTier` logic. The expanded card shows one price (`studioClass.dropInPrice`) and the hold-to-book button (enabled once expanded; the "Select a tier" gate goes away). Call `book_class` with just `_class_id` (Phase 1's default tier `'drop-in'` applies). Remove the "from $X" teaser that showed `subscriptionPrice` — show the real price.
**5.2 `PaymentModal.tsx`:** remove `coverage`/`BookingCoverage` and the CoverageBanner; the summary is class + price + total.
**5.3 `Memberships.tsx`:** remove the hold-to-subscribe and pack-purchase interactions (and the broken `gripTimer` — F9); keep it as an informational pricing page with a clear note: *"Memberships and class packs are set up at the front desk — online checkout coming soon."* Buttons become non-interactive or link to a `mailto:`.
**5.4** Leave the DB columns (`pass_price`, `subscription_price`, `tier` enum) in place — dropping them is churn with no launch value; the Admin form may keep its three price inputs (they're harmless) or hide the two unused ones — executor's choice, note it in the commit.
**5.5** If MCP kept (Q3): restrict the `tier` input in `src/lib/mcp/tools/book-class.ts` to `"drop-in"` (or drop the parameter) and redeploy as in 2.5.

**Verify:** build/lint green; a signed-in user with prior "pass"-tier bookings sees **no** "credits remaining"/"Included" badges anywhere; booking records `tier='drop-in'` and `price = drop_in_price`; Memberships page has no interactive purchase.

**Commit:** `feat: single-price bookings; memberships page is informational until real purchases exist`

---

### Phase 6 — Admin roster with names + first-admin path (unconditional)

**Why:** F7/M2 — the studio must know who's coming; Q5 — someone must be able to become admin.

**6.1 Migration `<ts>_admin_roster.sql`:**

```sql
-- Admins may read member profiles (needed for the class roster).
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
```

*(Note: migration 3 made `has_role` SECURITY INVOKER; that still works here because `user_roles` RLS lets a user read their own roles, which is the only lookup this policy performs for the caller. Do not change `has_role`.)*

**6.2 `src/pages/Admin.tsx` `loadDayBookings`:** change the bookings select to `"id, class_id, user_id, tier, price, status, created_at, profiles:user_id(display_name)"` — if the generated types fight the embedded join, fetch profiles in a second query: `supabase.from("profiles").select("id, display_name").in("id", userIds)` and merge. Replace the "Booking ID" column with "Member" (`display_name`, falling back to the booking-id prefix).

**6.3 Docs (with Phase 7's README): the first admin is granted by running, in the Supabase SQL editor:**
`insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = '<owner email>' on conflict do nothing;`

**Verify:** as admin, Bookings-by-day shows member display names for a day with bookings; as a non-admin, `/admin` still redirects home and `supabase.from("profiles").select("*")` in the console still returns only the caller's own row.

**Commit:** `feat(admin): class roster shows member names; document first-admin setup`

---

### Phase 7 — README + docs (unconditional)

Rewrite `README.md` (replace the Lovable boilerplate) with, concretely: what the app is (one paragraph); stack; local setup (`npm install`, `.env` vars — note the anon key is publishable by design); how migrations are applied; how the first admin is created (6.3); how classes are created (Admin UI); the payment model ("reserve online, pay at studio" — or Stripe if Q1=b); what the MCP function is and how to deploy it (if kept); scripts table (`dev`, `build`, `lint`, `test`). Keep it under ~120 lines. Fix the waiver/UI copy mismatch from F8: in `WaiverModal.tsx`'s `WAIVER_TEXT`, change section 6 to match actual behavior (*"Bookings may be cancelled free of charge any time before class starts."*).

**Verify:** a newcomer following only the README can run the app locally and create an admin. Waiver text no longer promises a 4-hour policy the app doesn't enforce.

**Commit:** `docs: real README; align waiver cancellation text with actual behavior`

---

### Phase 8 — Tests that protect the core (unconditional, last)

Replace `src/test/example.test.ts` with real coverage. Keep scope tight — these must run with `npm test` (vitest + jsdom), no live Supabase:

- **8.1** Extract the pure schedule-building logic from `Index.tsx` (the 30-day `schedule` memo body and `timeBucket`) into `src/lib/schedule.ts` as pure functions (`buildSchedule(dbClasses, bookingCounts, today)`, `timeBucket`). `Index.tsx` imports them. Test: classes land on the correct day bucket across a month boundary; spots-taken mapping; `timeBucket` edges (11:59→morning, 12:00→afternoon, 17:00→evening).
- **8.2** Component test for `WaiverModal`: sign button stays disabled until scrolled + agreed + name ≥ 2 chars.
- **8.3** Component test for `ClassCard` (mock `supabase.rpc`): full class renders disabled; a booked class (`isBooked`) shows "Booked ✓"; successful hold-to-book calls `book_class` with `{_class_id, _tier}` only.
- Delete `playwright.config.ts` / `playwright-fixture.ts` / `@playwright/test` + `lovable-agent-playwright-config` only if no CI references them (grep `.github/` — currently absent, so delete).

**Verify:** `npm test` runs ≥ 8 assertions and passes; `npm run build` green.

**Commit:** `test: cover schedule building, waiver gating, and booking call contract`

---

## Out of scope (deliberately — do not do without new instructions)

Stripe integration (unless Q1=b), waitlists, email notifications, real pass/membership purchases, multi-tenant anything, enforcing the 4-hour cancellation window, native apps/PWA manifest work, storing waiver signature text (flagged in F8 — a `waivers` table with the typed name would be the right shape when legal record-keeping matters).
