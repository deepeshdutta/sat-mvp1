# Improvement Plan — SAT prep MVP1 prototype

A front-end-only, working prototype of the **SAT Improvement Plan** MVP1 (Functional Spec v3.0, F01–F10; Technical Spec v1.0). It runs fully in the browser and deploys as a static site on GitHub Pages.

**Live demo:** https://deepeshdutta.github.io/sat-mvp1/

> Quick tour: open the site → **Start free** → **Open demo**. That loads a sample learner with ~2 weeks of history. Or sign up for real: the 6-digit code shows up in the **Demo inbox**.

## Stack
Vite + React 18 + TypeScript + Tailwind CSS 3 + React Router (`HashRouter`, so deep links work on Pages). Icons: lucide-react. There is no backend. A localStorage "database" (`src/lib/store.ts`) uses the same entities as the technical spec §3.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview
```
A push to `main` deploys to Pages through `.github/workflows/deploy.yml` (`actions/deploy-pages`).

## Features mapped to the spec
| Spec | Implemented |
|---|---|
| **F01** Identity & eligibility | Age gate comes first, before any email is collected. The boundary birth year gets an explicit "I'm already 13" confirmation. Under-13 is blocked and only an anonymous counter is kept; no DOB is stored, only the eligibility status and policy version. Passwordless 6-digit OTP: HMAC-SHA256 keyed verification (never plaintext), 10-minute expiry, single use, 5 tries per code, 5 requests per email per hour, and the same response whether or not the account exists. 30-day sessions, logout, a session list with per-device revoke, "sign out all devices". Email change needs recent auth (15 min), then verification of the new email, then a security notice to the old email, plus an audit entry. Purchases and history stay keyed to the immutable `user_id`. Recovery policy page. Data access goes through the session user (no IDs in URLs for user data). |
| **F02** Onboarding & Data Zone | Optional target, section goals, test date, timezone, weekly workouts, availability, section preference. There is no invented 1200 default; you get a general plan instead. Report types: SAT, PSAT/NMSQT, PSAT 10, PSAT 8/9, Bluebook, Other (source required). Per-type ranges, ×10 increments, the check "sections add to X but total is Y", and future-date checks. 7-level bands are stored as bands, and missing values are "Unknown", never zero. Pasted feedback is labeled "you pasted this". Edit (revision history), delete, export. The anchor defaults to the latest **test date**; you can override it. |
| **F03** Diagnostics | Starter: 24 items, 3 per domain, balanced by difficulty, in an R&W block then a Math block. It is resumable, with a block break that releases feedback. Focused: 6–12 unseen items in one domain. No hints during diagnostics. Output is a "learning baseline", never a score or percentile. Evidence labels: Reported / Observed / Provisional / Practice-supported / Secured. |
| **F04** Plan & Today | Priority engine: shortfall × domain share × recency/review modifier, from observed skills only. Report bands stay **ordinal** and are used only to choose where to check. Provisional "needs check" cards for unknown domains, and section preference instead of a 50/50 split. Each card shows priority, evidence state, reason, evidence ref, next action and reassess point. Secured skills are listed separately. Re-ranking happens only on session completion, a new anchor report, a delayed check or a goal change. Plan history is kept, with diffs ("X moved from priority 1 to 3") and a policy version. Today: one primary workout (3/12/5), an optional small task, "Why this?", a next-session preview, and a lightweight week calendar where missed days don't pile up. |
| **F05** Bank & practice | 58 published original items (+1 AI-assisted draft held in QA) (MCQ plus student-produced numeric) across all 8 domains and 22 skills. Each has immutable id/version, prereqs, difficulty label, explanation, per-choice distractor rationales, common trap, two hints, provenance and a rights record. Numeric grading accepts equivalent forms (`9/2`, `4.5`, `.5`). Mixed workout is 60/25/15 with transparent redistribution notes. Topic sessions are 100% on the chosen skill. Unseen items are preferred; repeats are labeled "review" and don't count as evidence. Difficulty ladder: 2 correct → up, 2 wrong → down, reset on assistance, clamped and logged. Items are pre-materialized; the server-style timer (`endsAt`) survives refresh. One pause of up to 5 minutes. At time-up, unanswered items are unattempted, not wrong. Idempotent submits, an offline banner, and a searchable topic picker with synonyms. You can report an item without leaving the workout. |
| **F06** Help & notebook | After answering: correctness, skill tag and explanation, then the guided steps hint → rule → why your choice is wrong → worked solution → trap → fresh transfer question. Pre-answer hints mark the attempt as assisted. Wrong practice answers create one notebook entry per attempt, with a review due in 3–7 days. Six optional categories (no inferred labels), private note (deletable), and actions: explain differently, simpler example, new similar question, check later, mark reviewed, report problem. CSV export. Review sessions use transfer items, and a correct repeat counts as review success only. |
| **F07** Mastery & reports | Eligibility: first exposure, independent, not invalidated, item published. Improving = 8/10 across ≥2 sessions with ≥4 medium+. Secured = 14/15 across ≥3 sessions with ≥6 medium+, **plus** a delayed check of 4/5 three to seven days later. Coverage gaps show "progress observed; additional evidence needed". Stale evidence leads to a new check request. Session report: independent vs assisted accuracy as numerator/denominator, unattempted count, answering vs explanation time, skills and difficulty, ladder log, plan changes, next action. Weekly summary with like-for-like statements only. Retest prompt offers a mini-check or Bluebook plus manual entry. |
| **F08** Habits | Weekly goal ring, private practice-day streak (rest days framed kindly), XP and levels, 8 effort-based badges, no leaderboards. Opt-in reminders: at most one per day, reminder time plus quiet hours, one-click opt-out, separate weekly-email opt-in. |
| **F09** Payments | Pricing page with the full tier matrix, billing terms and AI budget disclosure. Simulated hosted checkout (card / Apple Pay). Access is granted **only** when a mock webhook is processed (idempotent by event id; the duplicate demo is included). Free cap of 1 workout per day, with diagnostics and review exempt. Paywall modal names the feature and tier and never discards work. Upgrade with proration, pause (break mode), resume, cancel at period end, failed payment → 7-day grace banner → Free with data kept, 7-day first-purchase refund, invoices. Free official-resource directory. |
| **F10** Admin & ops | MFA-gated admin console. QA queue (publishing is blocked without commercial rights or with unreviewed AI provenance), item preview, item bank with quarantine. Flag triage: a "wrong key" report auto-quarantines the item, invalidates affected attempts (mastery recomputes) and notifies learners why their progress changed. Coverage inventory, restricted support lookup (no notes, no impersonation), webhook log, audit log, analytics, health. Learner data export (JSON) and account deletion with an audit entry. |

MVP2 items (AI tutor, Writing Lab, Essay Studio, parent shares, rich calendar/comeback) appear as locked or "coming in MVP2" entries with the correct tier, per the screen-by-tier plan.

## What is mocked
- **Backend / DB / workers:** localStorage plus synchronous functions. "Server-authoritative" timers and idempotency are simulated client-side, so a user could tamper with them.
- **Email:** an on-screen *Demo inbox* stands in for the email provider (OTP codes, security notices).
- **OTP crypto:** real WebCrypto HMAC, but the "server key" ships in the bundle, so this is not secure.
- **Stripe:** no real payments. Checkout and webhooks are simulated, and Billing has demo buttons for failure, grace expiry, period end and duplicate events.
- **Admin auth:** a mock MFA code sent to the demo inbox. Anyone can open the console.
- **Clock:** Settings → Demo controls can move time forward by +3 or +7 days so reviews and delayed checks come due.
- **Content:** questions are original, written for this prototype. They are not official College Board items. The bank is too small to reach "secured" (this correctly shows the coverage-gap message).

## Deferred
Real API/DB, Redis, email delivery, Stripe, SSR public pages, OpenTelemetry, CSP/WAF, IDOR test suite, content authoring UI, and all MVP2 features (F11–F18).
