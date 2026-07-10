# Real Accounts & Persistence

Move Studio Roxx from in-memory demo data to a real backend so students can sign up, log in, and have their bookings, waivers, and payments saved to their account.

## What the student will experience
- Sign up / log in (email + password, plus Google) from the header.
- Header shows their name and a "My bookings" menu once signed in.
- Booking a class saves it to their account — persists across refresh and devices.
- Waiver is signed once, stored on their profile, and auto-skipped on future bookings.
- Class spot counts update live (no more random numbers on refresh) and prevent overbooking.
- "My bookings" page: upcoming classes, past classes, waiver status, payment history.

## What the studio gets (foundation for later)
- Real user accounts table, roles table (student / instructor / admin), and RLS policies.
- Persistent classes, bookings, waivers, and payment records — ready for a future admin dashboard.

## Build steps
1. Enable Lovable Cloud.
2. Schema (migration): `profiles`, `user_roles` (with `has_role` security-definer function), `classes`, `bookings`, `waivers`, `payments`. Grants + RLS on every public table.
3. Seed `classes` with the current generated schedule so the UI has real data day one.
4. Auth: email/password + Google. `/auth` page, `onAuthStateChange` listener, protected routes.
5. Replace `generateSchedule` and the in-memory `cart`/toast booking with Cloud queries:
   - Class list reads from `classes` joined with a booking count.
   - `ClassCard` "hold to confirm" → checks waiver on profile, opens waiver only if unsigned, then payment, then inserts a `booking` + `payment` row in a transaction that also decrements availability.
6. New `/my-bookings` page listing the signed-in user's bookings with cancel action (respecting a cancel window).
7. Update `StudioHeader` with auth state (Sign in / Avatar menu → My bookings, Sign out).

## Out of scope for this step
- Stripe live charges (payment row is recorded; real capture stays mocked until Stripe is wired).
- Studio owner admin dashboard, waitlists, reminders, instructor pages — these become straightforward follow-ups once persistence is in place.

## Technical notes
- Roles live in a separate `user_roles` table with `app_role` enum (`admin`, `instructor`, `student`); never on `profiles`.
- Booking insert goes through a security-definer RPC `book_class(class_id, tier)` that checks capacity, inserts booking + payment, and returns the new row — avoids race conditions and keeps RLS simple.
- Client uses `getUser()` (not `getSession()`) for any trust decision.
