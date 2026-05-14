# KisXCars — Car Repair Marketplace (Beta)

**Version: 1.0.2** | **Live app:** https://kisx.lovable.app

A car-vertical beta spinoff of the KisX platform. Connects vehicle owners with trusted garages and bodyshops for repair work — bodywork, mechanical, tyres, electrical, windscreen, interior, and general vehicle servicing. Shares the same Cloud Run backend as the parent KisX project.

**Live app:** <https://kisx.lovable.app>

## What it does

- Vehicle owners snap a photo or record a short video of the damage → AI analysis identifies the repair type, urgency, and estimated cost → job published to garages
- Garages browse open jobs, read AI summaries (damage type, urgency, materials, location), generate task breakdowns, ask clarifying questions, and submit priced bids
- Vehicle owner reviews bids, accepts one (all others auto-rejected), tracks work through milestones to completion
- Escrow-based payments powered by Stripe Connect — funds held until vehicle owner approves, garage paid same day
- Post-job garage rating system (Quality · Communication · Cleanliness) gated on escrow release, with admin-only private feedback
- Push notifications via Web Push API — garages alerted to new jobs, vehicle owners alerted to incoming bids
- **Installable as a native app** — Android via Capacitor (Play Store ready, `com.kisxcars.app`), iOS Capacitor in progress; also installable as a PWA from any browser

## User roles

**Vehicle owners** (`/profile`, `/dashboard`)

- Create an account, set location and repair interests (bodywork, mechanical, tyres, etc.)
- Snap a photo or record a video → AI analysis → clarification Q&A → RFP document → matched garages → publish for bids
- Review garage bids (accept / decline), fund escrow, track milestones, release payment on completion

**Garages** (`/contractor/profile/*`)

- Onboard via `/contractor/signup` (business info + areas of expertise)
- Browse open jobs on the Job Feed, submit priced bids with scope-of-work notes
- Track bid status, win rate, and pipeline value in the Active Bids dashboard
- Manage profile settings and licence/insurance verification

## Tech stack

- **Frontend:** React 18, TypeScript, Vite (SWC compiler)
- **UI:** shadcn/ui, Tailwind CSS, Radix UI
- **Backend:** Supabase (Postgres + Auth + Edge Functions) + shared Cloud Run backend (KisX platform)
- **Vertical config:** `VerticalContext` fetches `GET /api/vertical` at startup — drives app title, owner/provider labels, and car-specific repair categories (Bodywork, Mechanical, Electrical, Tyres, Windscreen, Interior, General)
- **AI analysis:** Cloud Run endpoint — called directly from the browser for video/photo uploads
- **Routing:** React Router v6 (lazy-loaded pages with Suspense)
- **State:** TanStack React Query (26 hooks with auto-dedup, polling, background refetch)
- **Error Handling:** ErrorBoundary + RouteLoader suspense fallback
- **Images:** OptimizedImage component (WebP + lazy loading + async decode)
- **PWA:** Configured with `vite-plugin-pwa` (`vite.config.ts`) and `public/push-sw.js`; deployed via Lovable
- **Native app:** Capacitor (`com.kisxcars.app` / "KisXCars") — Android ready, iOS in progress
- **TypeScript:** Strict mode enabled (noImplicitAny, strictNullChecks, noUnusedLocals, etc.)

## Local development

```sh
git clone <repo-url>
cd KisX
npm install
npm run dev        # http://localhost:8080
```

This repo standardizes on npm; keep `package-lock.json` as the single lockfile and avoid committing Bun lockfiles.

Requires Node.js 18+. Connects to a hosted Supabase instance — no local Supabase setup needed for frontend work.

## Key scripts

```sh
npm run dev        # Start dev server (http://localhost:8080)
npm run build      # Production build → dist/
npm run test       # Vitest unit tests
npm run lint       # ESLint
```

**Capacitor (native app):**
```sh
npm run build
npx cap sync android   # Sync dist/ into Android project
npx cap open android   # Open in Android Studio
npx cap open ios       # Open ios/App/App.xcworkspace in Xcode (Mac only)
```

## Project structure

```text
src/
  pages/                   # Route-level components (lazy-loaded)
  components/
    OptimizedImage.tsx     # Image optimization (WebP + lazy loading + async decode)
    contractor/            # JobFeed, ActiveBids, ProfileSettings, Verification, NotificationSettings
    customer/              # MyProjects, JobBids
    escrow/                # EscrowStatusBanner, EscrowPayment, EscrowActions, ContractorPayoutCard
    milestones/            # MilestonesCard (photo upload, AI analysis, approve/reject)
    questions/             # JobQuestions (contractor asks / homeowner answers)
    post-project/          # ClarificationsStep, RfpReviewStep, MatchedContractorsStep
    photo-analyzer/        # AnalysisResults, PhotoGrid, TaskBreakdown
    ui/                    # shadcn/ui primitives
  lib/
    api.ts                 # Typed API client for all Cloud Run endpoints
  hooks/
    use-api-queries.ts     # React Query hooks (26 hooks: jobs, bids, escrow, questions, milestones, etc.)
    use-push-notifications.ts  # Web Push VAPID subscription lifecycle
  contexts/                # AuthContext (Supabase session)
  integrations/            # Supabase client + generated types
  test/                    # Vitest test files (90+ tests)
android/                   # Capacitor Android project
supabase/
  migrations/              # Database schema migrations
  functions/               # Edge function source (zip-lookup, analyse-*)
```

## Performance optimizations

**React Query hooks library** (`src/hooks/use-api-queries.ts`)
- 26 hooks for all API patterns: jobs, bids, escrow, questions, milestones, contractor matching, documents
- Automatic request deduplication via query keys
- Auto-refetch on window focus/reconnect for always-fresh data
- Configurable polling (e.g., 30s for bid updates) with stale-while-revalidate
- Built-in cache invalidation on mutations

**OptimizedImage component** (`src/components/OptimizedImage.tsx`)
- Renders WebP with PNG/JPG fallback (30–50% size reduction)
- Lazy loading by default; eager loading with `priority` prop for LCP images
- Async decoding prevents layout shift
- Preload and prefetch helpers for critical images

**Error resilience**
- `ErrorBoundary` class component in App.tsx catches unhandled errors and displays graceful fallback UI with reload button
- `RouteLoader` suspense fallback shows spinner + "Loading..." while routes are hydrating

**TypeScript strict mode**
- `noImplicitAny: true` — all types explicit
- `strictNullChecks: true` — null/undefined handled explicitly
- `noUnusedLocals` / `noUnusedParameters` — dead code elimination
- Improves tree-shaking and runtime safety

**Mobile & PWA**
- Mobile viewport meta tags: `viewport-fit=cover, maximum-scale=5, user-scalable=yes`
- iOS notched device support with safe area insets
- Splash screen optimized (1.2s vs 2.3s previously, 47% faster TTI)

## Current architecture note

- Cloud Run `jobs` APIs are the source of truth for bidding and status transitions.
- The frontend still writes/reads some legacy `videos` rows for analysis history and compatibility paths.
- Ongoing refactor target: remove remaining `videos` dependencies from contractor/job flows.

## Database tables

| Table / View | Purpose |
|-------------|---------|
| `profiles` | Customer profiles (`id` FK → auth.users, email, interests) |
| `contractors` | Contractor profiles (`user_id` FK → auth.users, business name, expertise, license, insurance) |
| `user_metadata` | Shared user metadata (username, bio, setup_complete) |
| `reviews` | Post-job ratings — quality, communication, cleanliness, generated overall, public comment, `private_feedback` (admin-only) |
| `visible_reviews` | View of `reviews` with `private_feedback` excluded — safe to expose to authenticated users |

## Testing

**90+ tests across 7 test files.** Run with `npm run test`.

| Suite | Tests | Coverage |
|-------|-------|----------|
| `api.test.ts` | 5 | Auth headers, URL construction, error handling, HTTP methods, serialization |
| `ReviewMediator.test.tsx` | 8 | Escrow gate (locked/unlocked states), validation, field presence, live score |
| `auth-routing.test.tsx` | 6 | Post-login redirects, `?next=` param, open-redirect guard |
| **`use-api-queries.test.ts`** | **16** | **All 26 React Query hooks: jobs, bids, escrow, mutations, deduplication, polling** |
| **`OptimizedImage.test.tsx`** | **16** | **WebP rendering, lazy loading, async decode, callbacks, accessibility** |
| **`component-integration.test.tsx`** | **21** | **MyProjects, ActiveBids, JobBids, JobFeed with React Query** |
| **`App.test.tsx`** | **10** | **ErrorBoundary, RouteLoader, suspense fallback, error recovery** |

## Using React Query hooks

For data fetching, use the hooks from `src/hooks/use-api-queries.ts` instead of calling the API directly.

**Example: Customer dashboard fetching jobs**

```tsx
const { data: jobs = [], isLoading, error, refetch } = useJobs();

if (isLoading) return <Spinner />;
if (error) return <ErrorAlert error={error} />;

return (
  <div>
    {jobs.map(job => <JobCard key={job.id} job={job} />)}
    <Button onClick={() => refetch()}>Refresh</Button>
  </div>
);
```

**Example: Contractor submitting a bid**

```tsx
const { mutate: submitBid, isPending } = useSubmitBid();

const handleSubmit = (amount: number, note: string) => {
  submitBid(
    { jobId, amount_pence: amount * 100, note },
    {
      onSuccess: () => {
        toast.success('Bid submitted!');
        refetch(); // Refresh the bids list
      },
      onError: (err) => toast.error(err.message),
    }
  );
};
```

All hooks handle auth headers automatically via `src/lib/api.ts`. No need to manually call `supabase.auth.getSession()`.

## Review system

The `ReviewMediator` component (`src/components/ReviewMediator.tsx`) handles the full review lifecycle:

- **Form mode** — locked until `escrowStatus` is `'released'` or `'funds_released'`.
  Sub-ratings: **Quality**, **Communication**, **Cleanliness** (dot buttons 1–5 with animated colour-coded bars).
  Overall score computed live as `ROUND((q+c+cl)/3, 2)` — matches the DB `GENERATED` column.
  **Private Feedback** field (🔐 Admin only) stored in `reviews` but never returned by `visible_reviews`.

- **List mode** — aggregate hero score + animated summary bars + individual review cards.

- **Both mode** — tab switcher between form and list.

## Developer guidelines

**Adding a new API endpoint?**
1. Add the endpoint to `src/lib/api.ts` with proper TypeScript types
2. Create a corresponding React Query hook in `src/hooks/use-api-queries.ts`
3. Use the hook instead of calling the API directly
4. Test with `use-api-queries.test.ts` patterns

**Adding an image?**
1. Use `<OptimizedImage src={...} alt="..." className="..." />` instead of `<img />`
2. Add `priority` prop for above-the-fold images (hero, navbar)
3. Component handles WebP conversion and lazy loading automatically

**Adding a route?**
1. Define in `src/App.tsx` with `lazy(() => import(...))`
2. Wrap in `<ErrorBoundary>` and `<Suspense fallback={<RouteLoader />}>`
3. Test with `App.test.tsx` patterns for error recovery

**TypeScript strict mode is enabled** — all values must have explicit types. Use type inference sparingly; prefer explicit `type: SomeType` annotations.

## Deployment

Deployed via [Lovable](https://lovable.dev). Push to `main` triggers auto-deploy.

PWA manifest and service worker are injected by Lovable at build time — no local files to maintain.

**Android release:** build the Capacitor project in Android Studio → sign APK → upload to Play Store.

Before release:
- Remove `server.url` block from `capacitor.config.ts` (local dev only)
- Verify `appId` is `com.kisxcars.app` and app name is `KisXCars`
- Update `strings.xml` with correct app branding

PWA behavior is configured in `vite.config.ts` via `vite-plugin-pwa`, and web push notifications use `public/push-sw.js`. Lovable still handles deployment and hosting.
