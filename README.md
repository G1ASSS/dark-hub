# Dark Hubb — Premium 18+ Video Streaming

Next.js 16 + Postgres + Redis (optional) + Telegram origin storage + FFmpeg pipeline.

## 1. What is already done on this machine

- Postgres 16 running (`brew services`), database `darkhubb` migrated + seeded
  (12 categories, free + premium plans, admin `admin@darkhubb.com`)
- FFmpeg installed, transcode + HLS pipeline verified (`npm run verify:backend`)
- Secrets generated in `.env.local` (gitignored, never commit)

## 2. First run

```bash
npm run dev          # app on http://localhost:3000
```

Log in with `admin@darkhubb.com` / `ChangeMeImmediately123!` and **change the
password immediately**.

Useful commands:

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run verify:backend` | Full self-test: auth crypto, plans, tokens, FFmpeg, rate limits |
| `npm run telegram:test`  | Check Telegram bot token + storage chat access |
| `npm run db:studio`      | Browse the database                              |
| `npm run db:seed`        | Re-seed categories / plans / admin               |

`migrate`/`studio`/`generate` need `DATABASE_URL` exported first:

```bash
export DATABASE_URL="postgresql://darkhubb:darkhubb_dev_password@localhost:5432/darkhubb"
```

## 3. The one thing only you can do: Telegram (5 min)

The app cannot create these — they live in your Telegram account:

1. Message **@BotFather** → `/newbot` → copy the token into `.env.local`
   as `TELEGRAM_BOT_TOKEN`.
2. Create a **private** channel (e.g. `darkhubb-origin`), add your bot as
   **administrator**.
3. Forward any channel message to **@userinfobot** → copy the `-100…` id
   into `.env.local` as `TELEGRAM_STORAGE_CHAT_ID`.
4. Run `npm run telegram:test`, then `npm run verify:backend` — the Telegram
   round-trip check should PASS (it uploads, re-streams, and deletes a
   1-second probe clip).

## 4. How video flows (once Telegram is connected)

```
Creator:  /upload page → POST /api/upload/init → file → /complete (PROCESSING)
Worker:   POST /api/worker/process (x-worker-secret) — scan → FFmpeg ladder →
          Telegram → HLS segments → PENDING_REVIEW
Staff:    POST /api/admin/videos/[id]/moderate {APPROVE} → PUBLISHED
Viewer:   /watch → POST /api/stream/token → HLS via signed proxy URLs
Premium:  Download button → POST /api/download/token → /api/download/file
          (logged + watermarked, 10-min expiry, daily limits)
```

Run the worker on a schedule (cron every minute, pointed at your domain):

```bash
curl -X POST -H "x-worker-secret: $WORKER_SECRET" https://yourdomain.com/api/worker/process
```

## 5. Production checklist

- New secrets everywhere (`SESSION_SECRET`, `WORKER_SECRET`, …), real
  `ADMIN_INITIAL_PASSWORD`, `APP_BASE_URL=https://yourdomain.com`
- Managed Postgres + `prisma migrate deploy`, Redis for rate limits
- `PAYMENT_PROVIDER` — `manual` works today; add Stripe/etc. by implementing
  `PaymentProvider` in `src/lib/payments/`
- Never expose `TELEGRAM_BOT_TOKEN` to the browser — all bytes flow through
  `/api/stream/*` and `/api/download/file`
- Honest limits: browser playback can always be screen-captured. Protection
  here is short-lived user-bound URLs + limits + watermarked audit trail.
