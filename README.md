# Meme'd Campaign Payout Tracker

Brands create Campaigns with a budget and a milestone ladder. Creators submit their Instagram or YouTube posts to a Campaign and earn as the post's views climb the ladder. Total payouts never exceed the Campaign's budget.

- **Live demo:** https://memed-payout-tracker-iota.vercel.app (web app on Vercel) · API: https://memed-payout-tracker-9k1y.onrender.com/api (Render). The API is on Render's free tier, which sleeps when idle, so the first request after a pause can take about a minute.
- **Stack:** Node.js + TypeScript + Express 5 + MongoDB (Mongoose) · Next.js + TypeScript · Jest · Redis (optional cache)
- **Vocabulary:** the terms used in code and UI (Submission, Payout, Clawback, Exhausted Campaign…) are defined in [CONTEXT.md](CONTEXT.md). Design decisions are in [docs/adr](docs/adr).

```
backend/    Express API (routers → controllers → services → repositories → models)
frontend/   Next.js app (brand and creator pages)
docs/adr/   Architecture decision records
```

## Run it

### With Docker (everything, one command)

```bash
docker compose up --build
```

Web app on http://localhost:3000, API on http://localhost:4000/api. Compose starts MongoDB as a single-node replica set (payouts need transactions), Redis, the API and the web app.

Load the demo data (needs Node 20+ on your machine, run once while compose is up):

```bash
cd backend && npm install && npm run seed
```

### Without Docker

You need Node 20+, a MongoDB **replica set** (a free Atlas cluster works; locally, a single-node replica set) and, optionally, Redis.

```bash
# API
cd backend
cp .env.example .env        # then edit MONGODB_URI if needed
npm install
npm run seed                # optional demo data
npm run dev                 # http://localhost:4000/api

# Web app (second terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

### Demo accounts (created by `npm run seed`, password `demo1234`)

| Role | Email |
| --- | --- |
| Brand | brand.demo@example.com |
| Creator | creator.demo@example.com |
| Creator | creator2.demo@example.com |

The seed creates two campaigns with submissions in every payout state: fully paid, partly paid because the budget ran out, and flagged for review.

## Environment variables

**Backend** (`backend/.env`, see [.env.example](backend/.env.example))

| Variable | Default (dev) | Notes |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/memed?directConnection=true` | Must be a replica set. Required in production. |
| `JWT_SECRET` | dev-only value | At least 32 characters in production. |
| `JWT_EXPIRES_IN` | `7d` | |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated frontend origins, or `*`. |
| `PORT` | `4000` | |
| `REDIS_URL` | _unset_ | Optional. Without it the live-campaign list is simply not cached. |
| `SPIKE_MIN_GAIN` | `5000` | See [view spikes](#view-spikes). |
| `SPIKE_MAX_VIEWS_PER_HOUR` | `50000` | |

**Frontend** (`frontend/.env.local`)

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API including `/api`. Baked into the browser bundle at build time. |

## API

All responses look like `{ status, statusCode, message, data }`; errors carry a machine-readable `code`.

| Who | Endpoint |
| --- | --- |
| Anyone | `POST /api/auth/signup` `{ name, email, password, role: "brand" \| "creator" }` · `POST /api/auth/login` · `GET /api/auth/me` |
| Brand | `POST /api/campaigns` `{ name, platform, budget, milestones: [{ views, amount }] }` |
| Brand | `GET /api/campaigns/mine` (each with `budget`, `spent`, `remaining`) · `GET /api/campaigns/:id/submissions` · `GET /api/campaigns/:id/payouts` |
| Brand | `POST /api/submissions/:id/approve` · `POST /api/submissions/:id/reject` (flagged submissions) |
| Creator | `GET /api/campaigns` (live campaigns) · `POST /api/campaigns/:id/submissions` `{ postUrl }` |
| Creator | `GET /api/submissions/mine` · `GET /api/creators/me/earnings` |
| Creator or owning brand | `GET /api/submissions/:id/payouts` (payout history) |
| **No login** | `PATCH /api/submissions/:id/views` `{ views }`, simulates the platform reporting a view count |

The creator page has a "Simulate platform views" box that calls the PATCH endpoint, so the whole flow can be tried from the UI.

## Assumptions and decisions

Where the brief was open, these are the calls I made.

**Payout rules**
- **Crossing several milestones in one update pays the highest one only**, never the sum. With the ladder 10K → ₹500, 50K → ₹2,000, a post jumping from 0 to 60K views is owed ₹2,000. What is actually paid is the difference between what is owed and what was already paid, so repeating an update never double-pays.
- **When the budget runs out mid-payout, the creator gets what is left** (a partial payout). The unpaid part is recorded as a *shortfall* on the submission. Thresholds are inclusive: reaching exactly 10,000 views counts.
- **Views can go down** (platforms remove fake views). The payout follows the highest milestone the *current* view count has reached, so a drop below a milestone claws money back to the budget, and that money goes to outstanding shortfalls, oldest first. Reasoning in [ADR 0001](docs/adr/0001-payouts-follow-views-down.md).
- A campaign with zero budget remaining is "exhausted": it disappears from the creator list and accepts no new submissions until a clawback returns money.
- Money is whole rupees (integers). Budget, milestone amounts and views must be positive whole numbers.

**Milestone ladder rules** (checked when a campaign is created): at most 10 milestones, view thresholds and amounts both strictly increase, and the top amount cannot exceed the budget.

**Posts and submissions**
- A post link is checked against the campaign's platform and normalised (so `youtu.be/x` and `youtube.com/watch?v=x` are the same post). One post can be submitted once across the whole app.

### View spikes
A *spike* is a view update that gains at least `SPIKE_MIN_GAIN` views faster than `SPIKE_MAX_VIEWS_PER_HOUR`. A spiking submission is **flagged**: its views are stored but its payout is frozen until the campaign's brand approves it (the payout catches up to the current views) or rejects it (everything is clawed back and it can never earn again).

The **first** view report for a submission is never a spike, because there is no earlier report to measure a pace against, and a post may already have plenty of views when it is submitted.

### Concurrency and double-payment
Every view update runs in a MongoDB transaction that reads the submission and its campaign, works out the payout, and saves the submission, the campaign's `spent`, and a payout-ledger entry together. Two simultaneous updates on the same campaign conflict; MongoDB aborts one and it retries on fresh numbers, so the budget cannot be overspent ([ADR 0002](docs/adr/0002-payouts-in-mongodb-transactions.md)). The campaign's `spent` always equals the sum of its payout entries; this is covered by the concurrency tests.

### Other trade-offs
- `PATCH /api/submissions/:id/views` has no authentication because the brief says so. In production it would be a signed webhook or an internal job.
- The login token lives in `localStorage`: simple and works across domains, but readable by page scripts. An httpOnly cookie would be the hardened option.
- The live-campaign list is cached in Redis for 30 seconds and is cleared when a campaign becomes exhausted or live again. The `remaining` shown to creators can therefore lag by up to 30 seconds. Redis being down never breaks the API.

## Tests

```bash
cd backend && npm test
```

Unit tests cover the payout calculation, the budget cap, spike detection, ladder validation and URL handling. Integration tests (supertest) cover auth, campaigns, submissions, payouts, spike review, and concurrent updates on one campaign. They run against an in-memory MongoDB replica set, so nothing needs to be installed, but the first run downloads a MongoDB binary.

## Deploying

The live demo runs entirely on free tiers: **MongoDB Atlas** (already a replica set; its connection string is `MONGODB_URI`), **Render** for `backend/` (root directory `backend`, build `npm ci --include=dev && npm run build`, start `npm start`, health check `/api/health`) and **Vercel** for `frontend/` (root directory `frontend`). `CORS_ORIGIN` on the API is the Vercel URL, and `NEXT_PUBLIC_API_URL` on the frontend is `https://<your-api>/api`, set before the first build because it is baked into the bundle.

## Scaling to 10,000 creators

- **The hot spot is the campaign document.** Every payout writes the campaign's `spent`, so many creators on one campaign serialise on it and the transaction retries pile up. Fix: process view updates for a campaign through a queue partitioned by campaign id (one worker per campaign at a time instead of optimistic retries), and if one campaign is still too hot, split its budget into slices that are reserved in chunks.
- **Don't take view updates inline.** Real platform data arrives in bulk. Poll or receive webhooks, put the updates on a queue, batch them, and rate-limit the endpoint.
- **Reads.** Keep Redis for the live-campaign list, paginate every list, and keep a running earnings total per creator instead of summing submissions on each request. Existing indexes already cover the campaign and creator lookups.
- **Data growth.** The payout ledger is append-only and grows fastest; index it by campaign and submission and archive old entries.
- **Infrastructure.** Run several stateless API instances behind a load balancer, use Atlas read replicas for dashboards, and shard by campaign id if a single replica set is outgrown.
- **Spikes** move to the same pipeline as a stream check rather than running inside the payout transaction.
