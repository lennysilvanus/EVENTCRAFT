# EventCraft — Architecture Reference

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Standalone output for Docker |
| Runtime | Node.js 22 | |
| Database | PostgreSQL 17 | Prisma 7 ORM |
| Cache / Rate-limit | Redis 7 | Optional; falls back to DB |
| Payments | Snippe API | Mobile money + bank transfer (TZ) |
| Email | Resend (primary) + SMTP (fallback) | nodemailer as fallback transport |
| AI | Anthropic Claude API | Invite text generation |
| File storage | Local disk (dev) / S3-compatible (prod) | Bespoke AWS Sig V4 signing |
| Auth | JWT (jsonwebtoken) in httpOnly cookies | 30-day expiry; token blocklist in DB |
| QR codes | qrcode library | PNG + SVG |

## Key Design Decisions

### Auth — JWT with a server-side blocklist
JWTs are stateless by design; we add a `BlockedToken` table so we can revoke
individual tokens and entire user sessions. The `isUserBlocked` sentinel covers
the "revoke all sessions for a user" case without tracking every token.

**Why not sessions?** Server-side session storage requires sticky sessions or a
shared session store. JWT + Redis blocklist achieves the same revocability
without coupling the app to a session store for every request.

### Payment — Snippe only, transaction-per-guest
Each RSVP has exactly one `Payment` record. The checkout uses a
`REPEATABLE READ` transaction to check capacity and create the guest
atomically, preventing double-booking races.

Payout flow:
1. Webhook receives `payment.completed` → marks guest CONFIRMED
2. Cron `POST /api/cron/payouts` runs every N minutes → disburses host net
3. `PayoutLog` stores every disbursement attempt for dispute resolution

**Why not immediate payout in webhook?** The webhook handler is on the
hot path for guest RSVP confirmation. Moving payout to the cron means a webhook
timeout doesn't prevent the guest from being confirmed.

### Rate limiting — Redis with DB fallback
All rate-limited endpoints use a Redis sliding-window counter when
`REDIS_URL` is set. When Redis is unavailable the system falls back to the
`RateLimit` PostgreSQL table. This means rate limiting never takes the app down
if Redis hiccups, at the cost of slightly looser enforcement during fallback.

### File uploads — S3-compatible storage abstraction
`src/lib/storage.ts` selects S3 when `STORAGE_S3_BUCKET` is set; otherwise
writes to `public/uploads/`. Filenames are 16-byte random hex values — never
derived from user IDs or timestamps — to prevent enumeration.

**Production requirement:** Always configure S3 (or R2/MinIO). Local-disk
uploads are lost if the container is recreated.

### Multi-tenancy
Events are owned by a `User` (hostId FK). `EventMember` provides team
collaboration with four roles: VIEWER, CHECKIN, MANAGER, CO_HOST. There is no
organisation-level entity — all limits are per-user.

### Plan enforcement
Plan limits are checked at event creation and RSVP time. `getEffectivePlan()`
downgrades expired paid plans to FREE automatically. ADMIN and SECURITY_ADMIN
roles are treated as BUSINESS plan (no limits).

### PDPA compliance posture
- Consent is captured at registration (`ConsentRecord` table)
- Right to erasure: `DELETE /api/auth/erasure` anonymises all PII and deletes
  `LoginAttempt` records immediately
- AI processing disclosure: every AI-generated response includes `aiDisclosure`
- Data minimisation: audit logs carry actorEmail but this is overwritten on erasure

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 256-bit random secret for token signing |
| `CRON_SECRET` | Yes | Shared secret for cron endpoint authentication |
| `REDIS_URL` | No | Redis connection string; enables fast rate limiting |
| `RESEND_API_KEY` | No | Resend email provider API key |
| `SMTP_HOST` | No | SMTP fallback host |
| `SMTP_PORT` | No | SMTP port (default 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SNIPPE_API_KEY` | No | Snippe payment API key |
| `SNIPPE_WEBHOOK_SECRET` | No | HMAC secret for webhook verification |
| `ANTHROPIC_API_KEY` | No | Anthropic Claude API key |
| `SENTRY_DSN` | No | Sentry error tracking DSN (server) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry error tracking DSN (browser) |
| `STORAGE_S3_BUCKET` | No | S3 bucket name (enables S3 storage) |
| `STORAGE_S3_REGION` | No | S3 region |
| `STORAGE_S3_ACCESS_KEY_ID` | No | S3 access key |
| `STORAGE_S3_SECRET_ACCESS_KEY` | No | S3 secret key |
| `STORAGE_S3_ENDPOINT` | No | Custom endpoint for R2/MinIO |
| `STORAGE_S3_PUBLIC_URL` | No | Public CDN URL prefix for uploaded files |

## Data Flow: Ticket Purchase

```
Guest submits phone + network
  → POST /api/snippe/checkout
    → validate event capacity (REPEATABLE READ tx)
    → create Guest (PENDING) + Payment (PENDING)
    → initiateCollection() → Snippe USSD push
  → Guest approves on phone
  → Snippe sends webhook to POST /api/snippe/webhook
    → verify HMAC signature
    → idempotency guard (ProcessedWebhookEvent status=PROCESSING)
    → update Payment (COMPLETED) + Guest (CONFIRMED) in single tx
    → send RSVP confirmation email (with retry)
    → trigger payout (or defer to cron)
    → mark ProcessedWebhookEvent status=DONE
```

## Known Limitations / Future Work

- Single payment processor (Snippe). Add Pesapal or Flutterwave as fallback.
- No horizontal scaling for uploads — S3 is required above 1 app instance.
- No real-time check-in push (polling only). WebSocket or SSE upgrade needed
  for large events with many simultaneous check-ins.
- Admin role is binary (ADMIN / not ADMIN). Future: split into ADMIN_READ and
  ADMIN_WRITE to restrict financial data exposure.
