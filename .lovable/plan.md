## Overview

Add a public B2B marketing site + Stripe checkout so pole studios can sign up for a **Studio Roxx** subscription, plus turn the existing student booking experience into an installable PWA (App Store / Play Store submission via Capacitor comes later, in a follow-up).

Three parallel workstreams:

1. Marketing landing + pricing + checkout for studio operators
2. Multi-tenant scaffolding so each paying studio has its own workspace
3. PWA install support for the student-facing app

---

## 1. Marketing landing page

New public route `/for-studios` (also linked from the main nav as "For Studios") with the Studio Roxx dark/chiaroscuro + gold aesthetic and Cinzel headings:

- Hero: "Run your pole studio like the stage it is." + CTA "Start 14-day free trial"
- Feature grid: Class scheduling, memberships & class passes, waivers, member booking app, admin dashboard, Stripe payouts
- Screenshots section (reuses existing ClassCard / Admin / PaymentModal visuals)
- Testimonials placeholder block
- Pricing section (see below)
- FAQ
- Footer CTA

## 2. Pricing tiers (free trial + tiers)

Three tiers, 14-day free trial on all, no card required to start trial:

```text
Starter   $49 /mo    up to 100 active members, 1 location, email support
Growth    $119 /mo   up to 500 members, 3 locations, waivers, class passes
Studio Pro $249 /mo  unlimited members & locations, priority support, custom branding
```

Yearly toggle → 2 months free. Prices created via `batch_create_product` after Stripe is enabled.

## 3. Studio signup + checkout flow

Route `/for-studios/signup`:

1. Studio details form (studio name, owner email, city, tier selection)
2. Create Supabase auth user (owner) → seeds a `studios` row and assigns the user `studio_owner` role
3. Redirect into Stripe Checkout session (subscription mode, 14-day trial) via a new `create-studio-checkout` edge function
4. On success → `/for-studios/welcome` with next-steps checklist, and their studio subdomain-style slug is provisioned

Webhook `stripe-subscription-webhook` handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` to keep `studios.subscription_status` and `plan_tier` current.

## 4. Multi-tenant data model (minimal viable)

New tables (all with GRANTs + RLS):

- `studios` — id, name, slug, owner_user_id, plan_tier, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id
- `studio_members` — studio_id, user_id, role (owner/admin/instructor/member)
- Add nullable `studio_id` to `classes`, `bookings`; backfill existing rows to a default "Studio Roxx" studio so nothing breaks
- New enum value `studio_owner` on `app_role`

RLS: studio owners/admins manage their own studio's classes; members read classes for studios they belong to. Existing student flows keep working via the default studio.

## 5. PWA (installable web app)

Follow the manifest-only path from the PWA skill:

- `public/manifest.webmanifest` with name "Studio Roxx", short name "Roxx", `display: standalone`, gold theme color on the dark background
- Icons at 192/512 (maskable + regular), apple-touch-icon
- Head tags in `index.html`: manifest link, theme-color, apple-touch-icon, apple-mobile-web-app-capable
- No service worker, no `vite-plugin-pwa`, no offline caching (per skill guidance since offline wasn't requested)

Users can then "Add to Home Screen" from mobile Safari/Chrome — no store submission needed.

## 6. Native mobile apps — deferred, documented

Native App Store / Play Store submission requires Capacitor + Xcode (Mac) + Android Studio + Apple ($99/yr) and Google ($25) developer accounts, all of which run outside Lovable. I will **not** wire Capacitor in this plan; when you're ready, ask "add Capacitor" and I'll:

- Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- Create `capacitor.config.ts` with hot-reload pointed at the Lovable preview
- Give you the export-to-GitHub → `npx cap add ios/android` → `npx cap run` runbook

## Technical details

- **Payments provider:** call `payments--recommend_payment_provider`, then `payments--enable_stripe_payments`. Use Stripe's `automatic_tax` (tax calculation & collection only) since this is a B2B SaaS subscription and simplest to launch; can upgrade to `managed_payments` later.
- **Edge functions:** `create-studio-checkout` (auth-gated, creates Stripe Checkout session with trial_period_days=14), `stripe-subscription-webhook` (public, signature-verified).
- **Secrets:** Stripe keys are handled by the seamless integration. A `STRIPE_WEBHOOK_SECRET` will be requested via `add_secret` after the webhook endpoint is deployed.
- **Routing:** landing at `/for-studios`, signup at `/for-studios/signup`, success at `/for-studios/welcome`. Existing app routes untouched.
- **Auth:** studio-owner signup uses email/password + Google. New `studio_owner` app_role added to enum in a migration.
- **New files:** `src/pages/ForStudios.tsx`, `src/pages/StudioSignup.tsx`, `src/pages/StudioWelcome.tsx`, `src/components/marketing/*`, `supabase/functions/create-studio-checkout/index.ts`, `supabase/functions/stripe-subscription-webhook/index.ts`, plus manifest + icons.
- **Migrations:** create `studios`, `studio_members`, add enum value, add `studio_id` FKs with default-studio backfill, add RLS + GRANTs.
