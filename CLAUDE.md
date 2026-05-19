# Claude Code Guide — KisXCars — Car Repair Marketplace (Beta)

This is the **KisXCars** frontend — a car-vertical beta spinoff of the broader KisX platform. It shares the same Cloud Run backend as the parent project but is scoped exclusively to vehicle repair (bodywork, mechanical, tyres, etc.). The UI terminology is driven by a `VerticalContext` that fetches config from the backend (`GET /api/vertical`) and uses `owner_label: "vehicle owner"` and `provider_label: "garage"` throughout.

## Repositories

- **Frontend (this repo):** `joreilly-ov/giggle-home-heroes` (fork of `vaggab0nd/giggle-home-heroes`)
- **Backend (Supabase edge functions & DB):** https://github.com/vaggab0nd/KisX-backend
- **Upstream parent frontend:** https://github.com/vaggab0nd/giggle-home-heroes

## Architecture

- **React Router v6** for routing — all routes defined in `src/App.tsx`
- **Supabase** for auth, database, and edge functions — client at `src/integrations/supabase/client.ts`, types at `src/integrations/supabase/types.ts`
- **AuthContext** (`src/contexts/AuthContext.tsx`) exposes `user`, `session`, `loading`, `signOut`
- **PWA** — the app is installable on iOS and Android home screens. PWA config is present in this repo via `vite-plugin-pwa` in `vite.config.ts`, and push notifications use `public/push-sw.js`. Lovable manages deployment/hosting.

### Mobile / PWA / Capacitor considerations

- All interactive elements need adequate tap targets (min 44×44px)
- Avoid hover-only affordances — use tap/focus states too
- Camera access for video recording must be requested gracefully — iOS requires HTTPS (satisfied in production)
- The video upload flow (`PostProject.tsx`) calls Cloud Run directly to avoid edge function payload/timeout limits
- **Capacitor dev mode:** `capacitor.config.ts` has a `server.url` pointing to `http://192.168.0.152:5173` (local WiFi dev). **Remove the `server` block before building a release APK/IPA** — otherwise the app tries to reach that local network.
- **Capacitor branding:** `capacitor.config.ts` uses `com.kisxcars.app` / "KisXCars". Both `android/` and `ios/` native projects are branded KisXCars — verify this matches Play Store / App Store listings before release submission.
- **Both iOS and Android have working debug builds.** The `ios/` Xcode project (`ios/App/App.xcodeproj`) is fully initialised with KisXCars icons and splash screens. Use `npx cap sync ios && npx cap open ios` to open in Xcode, then run on a simulator or device.
- **Push notifications:** implemented via Web Push API (`src/hooks/use-push-notifications.ts`). VAPID key fetched from Cloud Run (`/notifications/vapid-public-key`). iOS only works when installed as a PWA (not in Safari). Shown in `NotificationSettings` for both roles.

## User role detection

There is no explicit role field. Determine user type by querying:
- **Garage (provider):** has a row in `contractors` table where `user_id = user.id` — referred to as "garage" in the UI but stored as `contractors` in the DB
- **Vehicle owner (customer):** has a row in `profiles` table where `id = user.id`

Always check garage/contractor first (see `Auth.tsx` redirect logic).

**Admin role:** a separate `user_roles` table stores explicit platform roles (`admin`, `moderator`, `user`). Check admin status via the `has_role` RPC or the `useIsAdmin()` hook (`src/hooks/use-is-admin.ts`) — never trust client-side storage for role-gating.

## Routing conventions

| Path | Page | Notes |
|------|------|-------|
| `/` | Index | Landing page (Hero, HowItWorks, Features, CTA) |
| `/auth` | Auth | Shared sign-in / sign-up / forgot-password |
| `/reset-password` | ResetPassword | Password reset via email link (Supabase recovery token) |
| `/setup` | Setup | Customer onboarding (2-step: profile info + trade interests) |
| `/profile` | Profile | Customer profile (address, interests) |
| `/dashboard/*` | Dashboard | Customer dashboard (nested: MyProjects) |
| `/post-project` | PostProject | Customer video-based project posting |
| `/photo-analyzer` | TradePhotoAnalyzer | Photo-based home issue analysis |
| `/video-analyzer` | VideoAnalyzer | Video-based home issue analysis |
| `/browse-contractors` | BrowseContractors | Browse & filter contractors with ratings |
| `/contractor/signup` | ContractorOnboarding | Contractor onboarding (2-step) |
| `/contractor-signup` | ContractorSignUp | Legacy contractor signup path |
| `/contractor/profile/*` | ContractorProfile | Contractor dashboard — sub-routes below |
| `/contractor/profile` | → JobFeed | Default tab |
| `/contractor/profile/bids` | → ActiveBids | Bid history + pipeline KPIs |
| `/contractor/profile/reviews` | → ReviewMediator (list) | Contractor's review history |
| `/contractor/profile/settings` | → ProfileSettings + NotificationSettings | Profile and push notification settings |
| `/contractor/profile/verification` | → Verification | License and insurance details |
| `/contractor/connect/return` | ConnectReturn | Stripe Connect onboarding return |
| `/contractor/connect/refresh` | ConnectRefresh | Stripe Connect onboarding refresh |
| `/install` | Install | PWA install prompt page |
| `/ai-bidding-tools` | AIBiddingTools | AI bidding tools marketing page (fully built) |
| `/same-day-payments` | SameDayPayments | Same-day payments marketing page (fully built) |
| `/how-escrow-works` | HowEscrowWorks | Escrow explainer — placeholder, not yet built |
| `/cslb-check` | CslbCheck | CSLB contractor license verification lookup tool |
| `/changelog` | Changelog | Backend changelog — manually curated entries in `src/data/changelog.ts` |
| `/convert` | Convert | Hidden utility — Spotify CSV → Apple Music XML converter. Not linked anywhere. |
| `/about` | About | About page |
| `/contact` | Contact | Contact page |
| `/privacy` | Privacy | Privacy policy |
| `/terms` | Terms | Terms of service |
| `*` | NotFound | 404 catch-all |

## Key patterns

- ZIP code lookup uses the `zip-lookup` Supabase edge function
- **Vertical config** is loaded at startup from `GET /api/vertical` via `VerticalContext` (`src/contexts/VerticalContext.tsx`). It provides `app_title`, `owner_label` ("vehicle owner"), `provider_label` ("garage"), and the category list. A hardcoded fallback is used if the network call fails — categories: Bodywork, Mechanical, Electrical, Tyres, Windscreen, Interior, General.
- Categories are car-specific and used for both vehicle owner `interests` and garage `expertise` — do **not** hardcode home-trade categories (Plumbing, Painting, etc.) anywhere in this repo
- Contractor sub-routes use React Router `<Routes>` inside `ContractorProfile.tsx`
- Customer onboarding sets `setup_complete` in the `user_metadata` table via Supabase
- Password reset: Supabase appends `#access_token=...&type=recovery` to the redirect URL; `ResetPassword.tsx` listens for the `PASSWORD_RECOVERY` auth event and calls `supabase.auth.updateUser({ password })`
- Jobs/bids lifecycle is centered on the Cloud Run jobs API (`src/lib/api.ts`), while some legacy compatibility paths still read/write `videos`
- **Photo analysis** — shared validation/encoding logic lives in `src/lib/photo-analysis.ts`. Supported formats: JPG, PNG, WebP (HEIC is not supported — users are told explicitly). Max file size: 20 MB. `fileToPhotoDataUri()` validates MIME type and base64 integrity before upload.
- **Fallback RFP** — if the backend `/jobs/:id/rfp` call fails, `PostProject.tsx` generates a client-side RFP from the analysis result using `buildFallbackRfp()` so the flow never dead-ends
- **Debug modal** in `TradePhotoAnalyzer` / `PostProject` — shows raw API request/response. Gated to admin role in production via `useIsAdmin()`; visible to all in development

## Bidding API (Cloud Run)

All job and bid operations go through the Cloud Run backend (`https://stable-gig-374485351183.europe-west1.run.app`). The typed client lives at `src/lib/api.ts`.

### Jobs & Bids

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `POST` | `/jobs` | Vehicle owner | Creates a draft job; body: `{ analysis_result }` |
| `GET` | `/jobs` | Both | Vehicle owners see all their jobs; garages see only `open` ones |
| `GET` | `/jobs/:id` | Both | Owner sees any status; garage sees only `open` |
| `PATCH` | `/jobs/:id` | Vehicle owner | Body: `{ status }` — server enforces valid transitions |
| `POST` | `/jobs/:id/bids` | Garage | Body: `{ amount_pence, note }` |
| `GET` | `/jobs/:id/bids` | Both | Owner sees all bids + garage info; garage sees only their own |
| `PATCH` | `/jobs/:id/bids/:bidId` | Vehicle owner | Body: `{ action: "accept" \| "reject" }` — accept atomically rejects all others |
| `GET` | `/me/bids` | Garage | All their bids across jobs, includes `job` nested |

### RFP & Contractor Matching

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `POST` | `/jobs/:id/rfp` | Vehicle owner | Generates formal RFP document from job + clarification answers |
| `GET` | `/jobs/:id/contractors/matches` | Vehicle owner | AI-matched garages via embedding; fallback to activity match |
| `POST` | `/me/contractor/embed-profile` | Garage | Embeds garage profile for AI matching |

### Stripe Connect

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `POST` | `/me/contractor/connect-onboard` | Contractor | Returns Stripe onboarding URL; body: `{ return_url, refresh_url }` |
| `GET` | `/me/contractor/connect-status` | Contractor | Returns `{ connected, charges_enabled, payouts_enabled, details_submitted, account_id }` |
| `GET` | `/escrow/config` | Vehicle owner | Returns `{ stripe_publishable_key }` for frontend Stripe init |

### Escrow

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `GET` | `/jobs/:id/escrow` | Both | Returns `{ job_escrow_status }` — values: `pending \| held \| funds_released \| refunded` |
| `POST` | `/jobs/:id/escrow/initiate` | Vehicle owner | Creates Stripe PaymentIntent; returns `{ client_secret, amount_pence }` |
| `POST` | `/jobs/:id/escrow/release` | Vehicle owner | Releases funds to garage; body: `{ note? }` |
| `POST` | `/jobs/:id/escrow/refund` | Vehicle owner | Refunds to vehicle owner; body: `{ reason? }` |

### Q&A

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `GET` | `/jobs/:id/questions` | Both | Lists all questions for a job |
| `POST` | `/jobs/:id/questions` | Garage | Body: `{ question }` |
| `PATCH` | `/jobs/:id/questions/:questionId` | Vehicle owner | Body: `{ answer }` |

### Milestones

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `GET` | `/jobs/:id/milestones` | Both | Lists milestones with photos |
| `POST` | `/jobs/:id/milestones` | Garage | Body: `{ milestones: [{ title, description?, order_index }] }` |
| `POST` | `/jobs/:id/milestones/:milestoneId/photos` | Garage | Body: `{ image_source, note? }`; `?analyse=true` runs AI on the photo |
| `PATCH` | `/jobs/:id/milestones/:milestoneId` | Vehicle owner | Body: `{ action: "approve" \| "reject" }` |

### Push Notifications

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `GET` | `/notifications/vapid-public-key` | Both | Returns VAPID public key for Web Push subscription |
| `POST` | `/notifications/subscribe` | Both | Body: `{ endpoint, p256dh, auth_key }` |
| `DELETE` | `/notifications/subscribe` | Both | Body: `{ endpoint, p256dh, auth_key }` |

### Contractor Documents

| Method | Path | Who can call | Notes |
|--------|------|-------------|-------|
| `POST` | `/contractors/me/documents` | Contractor | Body: `{ document_type, file_name, file_source }`; types: `insurance \| licence \| certification \| other` |
| `GET` | `/contractors/me/documents` | Contractor | Lists own documents with verification status |
| `GET` | `/contractors/:contractorId/documents` | Public | Lists verified public documents for a contractor |
| `DELETE` | `/contractors/me/documents/:docId` | Contractor | Removes a document |

**Job status lifecycle:** `draft → open → awarded → in_progress → completed | cancelled`

**Frontend components:**
- `src/lib/api.ts` — typed API client (all auth headers handled here). Key method aliases: `api.escrow.get()` (was `.status()`), `api.questions.ask()` (was `.submit()`), `api.vertical.get()` (was `.config()`), `api.jobs.update()` (new — PATCH with arbitrary fields)
- `src/components/contractor/JobFeed.tsx` — browse open jobs, AI diagnosis display, Q&A, bid submission form
- `src/components/contractor/ActiveBids.tsx` — bid history, pipeline KPIs (open bids, win rate, pipeline £), inline milestones for accepted bids
- `src/components/customer/JobBids.tsx` — vehicle owner bid review (accept / decline)
- `src/components/customer/MyProjects.tsx` — lists jobs from `GET /jobs`, status actions, bids panel in sheet
- `src/pages/PostProject.tsx` — photo/video of vehicle damage → AI analysis → clarifications → RFP review → garage matching → publish
- `src/components/post-project/ClarificationsStep.tsx` — Q&A clarification step in PostProject flow
- `src/components/post-project/RfpReviewStep.tsx` — displays AI-generated RFP document before publishing
- `src/components/post-project/MatchedContractorsStep.tsx` — shows AI-matched contractors before final publish
- `src/components/escrow/EscrowStatusBanner.tsx` — displays current escrow state (pending/held/released/refunded)
- `src/components/escrow/EscrowPayment.tsx` — Stripe PaymentElement for vehicle owner to fund escrow
- `src/components/escrow/EscrowActions.tsx` — release / refund controls for vehicle owner
- `src/components/escrow/ContractorPayoutCard.tsx` — Stripe Connect payout status for contractor
- `src/components/milestones/MilestonesCard.tsx` — milestone management with photo upload and AI analysis
- `src/components/questions/JobQuestions.tsx` — Q&A thread, role-aware (garage asks / vehicle owner answers)
- `src/components/photo-analyzer/TaskBreakdown.tsx` — AI task breakdown via `analyse-breakdown` edge function
- `src/components/photo-analyzer/AnalysisResults.tsx` — displays photo analysis output
- `src/components/photo-analyzer/PhotoGrid.tsx` — multi-photo grid for analysis
- `src/components/contractor/NotificationSettings.tsx` — Web Push opt-in/out, role-aware description
- `src/components/contractor/ContractorDocuments.tsx` — upload/manage insurance, licence, and certification documents
- `src/components/contractor/VerifiedDocsBadge.tsx` — badge showing document verification status
- `src/components/contractor/CslbStatusBadge.tsx` — displays CSLB licence verification status
- `src/components/contractor/ContractorSidebar.tsx` — navigation sidebar for contractor dashboard
- `src/components/customer/CustomerSidebar.tsx` — navigation sidebar for customer dashboard
- `src/components/SplashScreen.tsx` — startup splash screen shown briefly before the app renders
- `src/hooks/use-push-notifications.ts` — VAPID subscription lifecycle hook
- `src/hooks/use-is-admin.ts` — server-side admin check via `has_role` RPC; returns `{ isAdmin, loading }`
- `src/lib/photo-analysis.ts` — shared photo validation and base64 encoding (`fileToPhotoDataUri`, `isSupportedPhotoForAnalysis`, `getSupportedPhotoMimeType`)
- `src/data/changelog.ts` — manually curated backend changelog entries displayed at `/changelog`
- `src/pages/Changelog.tsx` — changelog page

## Supabase edge functions

All edge functions live in `supabase/functions/` (source of truth: https://github.com/vaggab0nd/KisX-backend).

| Function | Purpose |
|----------|---------|
| `zip-lookup` | Returns `{ city, state }` from a 5-digit ZIP via zippopotam.us |
| `analyse-photos` | Authenticated proxy — forwards photo data to external `ANALYSE_URL` |
| `analyse-video` | Authenticated proxy — **no longer called by the frontend**; `PostProject.tsx` calls Cloud Run directly to avoid payload/timeout limits |
| `analyse-breakdown` | AI task breakdown (Google Gemini Flash) — input: job description; output: ordered task list with difficulty and time estimates. Requires `LOVABLE_API_KEY` in edge function secrets. |

## Running the project

```sh
npm install        # or: bun install
npm run dev        # http://localhost:8080
npm run test       # Vitest (33 tests across api, ReviewMediator, auth routing)
npm run lint       # ESLint
npm run build      # Production build → dist/
```

**Capacitor (after build):**
```sh
npx cap sync android   # Copy dist/ into the Android project
npx cap open android   # Open in Android Studio (debug builds working)
npx cap sync ios       # Copy dist/ into the iOS project
npx cap open ios       # Opens ios/App/App.xcworkspace in Xcode (debug builds working)
```

## Testing

Tests live in `src/test/`. Run with `npm run test`.

| File | What it covers |
|------|---------------|
| `api.test.ts` | Auth header injection/omission, URL construction, error handling, HTTP methods, request body serialisation |
| `ReviewMediator.test.tsx` | Escrow gate (all locked states, both unlock states), submit button state, validation, field presence, live overall score |
| `auth-routing.test.tsx` | Post-login redirects: contractor → `/contractor/profile`, complete profile → `/dashboard`, incomplete → `/profile`, `?next=` param, open-redirect guard |
| `seed-rpc-permissions.test.ts` | Verifies that `seed_insert_contractor` and `seed_insert_review` RPCs are not callable by anon/authenticated roles |
| `scheduled-db-seed.test.ts` | Unit tests for the scheduled seed script helpers (`signIn`, `cloudRunRequest`, seed data pools) |
| `use-api-queries.test.ts` | React Query hook wrappers — mutation shapes, query key correctness |
| `component-integration.test.tsx` | Component-level integration tests |
| `example.test.ts` | Framework smoke test (placeholder) |

## Database schema

| Table / View | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (FK → auth.users), `email`, `full_name`, `interests[]`, `postcode` (5-digit US ZIP), `road_address`, `city`, `state` | `id` not `user_id`; postcode has a check constraint enforcing 5-digit ZIP format |
| `contractors` | `user_id` (FK → auth.users), `business_name`, `postcode`, `phone`, `expertise[]`, `license_number`, `insurance_details` | RLS enabled — users can only read/write their own row |
| `user_metadata` | `id` (FK → auth.users), `setup_complete`, `username`, `bio`, `trade_interests` | Extra customer fields; `id` column (not `user_id`) |
| `reviews` | `contractor_id`, `job_id`, `rating_quality`, `rating_communication`, `rating_cleanliness`, `overall` (GENERATED), `comment`, `private_feedback` | Never include `overall` in INSERT payloads; `reviewer_id` has no FK constraint |
| `visible_reviews` | View of `reviews` excluding `private_feedback` | SELECT granted to `authenticated` |
| `user_roles` | `user_id` (FK → auth.users), `role` (enum: `admin \| moderator \| user`) | RLS-protected; check via `has_role(_user_id, _role)` RPC or `useIsAdmin()` hook |

## Database migrations

Migrations live in `supabase/migrations/`. When changing the schema, add a new `.sql` file — do not edit existing migrations.

| File | Purpose |
|------|---------|
| `20260311144019_ce319bdd-…` | Add `email` & `interests` columns to `profiles` |
| `20260316152627_2e1d4d85-…` | Create `contractors` table with RLS policies |
| `20260316153130_40d2a757-…` | Add `license_number`, `insurance_details`, `updated_at` to `contractors`; add trigger |
| `20260316170000_security-fixes.sql` | Enable RLS on `profiles` with user-level policies |
| `20260318000000_007_quality_rating_private_feedback.sql` | `rating_accuracy` → `rating_quality`; add `rating_cleanliness`; rebuild `GENERATED overall`; add `private_feedback TEXT`; create `visible_reviews` view |
| `20260319161910_46d50244-…` | Allow authenticated users to browse contractors publicly |
| `20260320183159_c79a76de-…` | Add `status`, `trade_category`, `description`, `postcode`, `city`, `state` to `videos`; RLS policies for contractors reading posted videos |
| `20260320183841_d22ff758-…` | Create `reviews` table with `GENERATED overall` column, RLS, and `visible_reviews` view |
| `20260320183905_06bda3f5-…` | Fix `visible_reviews` security definer (set `security_invoker = on`) |
| `20260320184051_034f0f70-…` | Seed mock review data for existing contractors |
| `20260330190335_d8eb5044-…` | Tighten `reviews` RLS (owner-scoped SELECT); add `usage_log` RLS policies; fix `set_updated_at` function search_path |
| `20260425120900_revoke_seed_rpc_execute.sql` | Revoke EXECUTE on `seed_insert_contractor` and `seed_insert_review` from public/anon/authenticated (service_role only) |
| `20260517120000_user_roles.sql` | Create `app_role` enum, `user_roles` table with RLS, and `has_role(_user_id, _role)` security-definer function |
| `20260517140000_test_data_cars.sql` | Test data seed — 3 garages + 3 vehicle owners with reviews (see Test accounts below) |

## Test accounts

Seeded by migration `20260517140000_test_data_cars.sql`. Password for all: **`TestData123!`**

| Email | Role | Business / Name | Expertise | Reviews |
|-------|------|-----------------|-----------|---------|
| `test-fastfix@kisxcars.test` | Garage | TEST Fast Fix Autos | Bodywork, Interior | 4 reviews, avg ≈ 4.5★ |
| `test-drivewell@kisxcars.test` | Garage | TEST DriveWell Motors | Mechanical, General | 3 reviews, avg ≈ 2.9★ |
| `test-quickspark@kisxcars.test` | Garage | TEST Quickspark Electrics | Electrical, Mechanical | 4 reviews, avg ≈ 4.8★ |
| `test-alice@kisxcars.test` | Vehicle owner | TEST Alice | — | — |
| `test-bob@kisxcars.test` | Vehicle owner | TEST Bob | — | — |
| `test-carol@kisxcars.test` | Vehicle owner | TEST Carol | — | — |

All names and emails are prefixed with "TEST" — unambiguously not real users. Apply the migration via the Supabase SQL editor or `supabase db push`; it is idempotent (`ON CONFLICT DO NOTHING` throughout).

**Note:** jobs and bids live in the Cloud Run API, not Supabase, so the owner dashboards start empty — use the `scripts/db-seed.ts` script to add job/bid/milestone activity via the API.

## Review system

`src/components/ReviewMediator.tsx` — self-contained React/TSX component.

**Props:**

| Prop | Type | Notes |
|------|------|-------|
| `contractorId` | `string` | UUID of the garage being reviewed |
| `jobId` | `string?` | UUID of the completed job (sent in the insert) |
| `escrowStatus` | `string?` | Form only unlocks when value is `'released'` or `'funds_released'` |
| `mode` | `'form' \| 'list' \| 'both'` | Default: `'both'` |
| `onSuccess` | `(r) => void` | Called with the inserted row on success |

**Database writes to:** `reviews` table (Supabase insert via client)
**Database reads from:** `visible_reviews` view (excludes `private_feedback`)

**Private feedback:** sent in the insert payload, never returned by `visible_reviews`.
Admins read it directly from `reviews` via service role.

**Overall score:** computed live as `ROUND((quality + communication + cleanliness) / 3, 2)` — matches the `GENERATED` column in the DB.

**Escrow gate:** three layers — `disabled` prop on `<Button>`, `aria-disabled`, and `title` tooltip. The form shows a `<LockedOverlay>` when escrow is not released.

**Schema migration:** `supabase/migrations/20260318000000_007_quality_rating_private_feedback.sql`
- `rating_accuracy` → `rating_quality`; adds `rating_cleanliness`
- Rebuilds `GENERATED overall` column
- Adds `private_feedback TEXT`
- Creates `visible_reviews` view with `SELECT` granted to `authenticated`

## Things to watch out for

- The `profiles` table uses `id` as the FK to `auth.users` (not `user_id`)
- The `contractors` table uses `user_id` as the FK to `auth.users`
- RLS is enabled on `contractors` — users can only read/write their own row
- Don't redirect to `/profile` for contractors — send them to `/contractor/profile`
- `reviews` contains `private_feedback` — never expose this to the garage; always query `visible_reviews` on the client
- The `overall` column in `reviews` is `GENERATED ALWAYS` — do not include it in INSERT payloads
- `/how-escrow-works` is a placeholder and not yet implemented
- `analyse-breakdown` uses a Lovable/Gemini API key (`LOVABLE_API_KEY`) — must be set in edge function secrets
- The Supabase `videos` table still exists but `MyProjects.tsx` no longer queries it — the customer dashboard now fetches jobs from `GET /jobs` (Cloud Run). The table is effectively superseded by the jobs API for project listing.
- `MyProjects.tsx` uses `api.jobs.get(id)` to re-fetch a single job after status transitions — the job must exist in the Cloud Run jobs table, not just in `videos`
- **Capacitor config** (`capacitor.config.ts`) has `appId: 'com.kisxcars.app'` and `appName: 'KisXCars'` — verify this matches Play Store / App Store listings before release submission
- **Capacitor dev server** — the `server.url` block points to a local WiFi address for live-reload development; remove it entirely before building a release APK or IPA
- **Both iOS and Android have working debug builds** — `ios/App/App.xcodeproj` is fully initialised with KisXCars icons and splash screens. Opening in Xcode requires a Mac.
- **Push notifications on iOS** only work when the app is installed as a PWA from Safari, not from within the browser tab
- `profiles.postcode` has a check constraint enforcing 5-digit US ZIP format — do not insert UK-style postcodes
- `reviews.reviewer_id` has **no FK constraint** to `auth.users` (just `DEFAULT auth.uid()`) — static UUIDs can be used in seed data
- `user_metadata` uses `id` (not `user_id`) as its PK/FK to `auth.users` — consistent with `profiles`
- Admin-gated features (debug modal, etc.) use `useIsAdmin()` which calls the `has_role` RPC — never gate on client-side state alone
