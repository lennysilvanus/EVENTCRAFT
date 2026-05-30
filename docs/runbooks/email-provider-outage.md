# Runbook: Email Provider Outage

**Severity:** P2 — no data loss, but guests miss confirmations and hosts miss notifications  
**Owner:** On-call engineer

---

## Symptoms
- Guests report not receiving RSVP confirmation emails
- Password reset emails not arriving
- Application logs: `[Email] Resend failed — attempting SMTP fallback`
- Sentry alert: `Email send error` spike

## Email Provider Architecture

EventCraft uses a two-tier email delivery:
1. **Primary:** Resend (configured via `RESEND_API_KEY`)
2. **Fallback:** SMTP (configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)

If Resend fails, the system automatically retries via SMTP. If both fail, the
email is silently dropped and an error is logged.

## Immediate Actions

### 1. Confirm Resend outage
- Check [status.resend.com](https://status.resend.com)
- Test API key manually:
  ```bash
  curl -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"from":"test@yourdomain.com","to":"oncall@example.com","subject":"Test","html":"ok"}'
  ```

### 2. Ensure SMTP fallback is configured
Check that `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` are set in the
deployment environment. If not:
```bash
# Docker Compose: add to .env file and restart
docker compose up -d --force-recreate app
```
Recommended SMTP fallbacks:
- **AWS SES:** `email-smtp.{region}.amazonaws.com`, port 587
- **SendGrid:** `smtp.sendgrid.net`, port 587
- **Mailgun:** `smtp.mailgun.org`, port 587

### 3. Confirm fallback is working
Watch the app logs:
```
[Email] Resend failed — attempting SMTP fallback: <error>
```
If you see no further error after this line, SMTP delivery succeeded.

## Compensating Actions During Extended Outage

If both providers are down:

1. **Identify affected users** — guests who RSVPd in the last N hours without
   a received confirmation:
   ```sql
   SELECT g.name, g.email, e.title, g."createdAt"
   FROM "Guest" g
   JOIN "Event" e ON g."eventId" = e.id
   WHERE g."createdAt" > NOW() - INTERVAL '4 hours'
     AND g.status = 'CONFIRMED'
   ORDER BY g."createdAt" DESC;
   ```

2. **Re-send via backup method** — manually trigger the confirmation email
   once providers recover. The `qrToken` is stored in the `Guest` table;
   the checkin URL is `{APP_URL}/checkin/{qrToken}`.

3. **Password reset hold** — if the outage persists more than 2 hours, post
   a status message on the login page advising users that password reset
   emails may be delayed.

## Recovery

1. Confirm Resend is healthy and `RESEND_API_KEY` is valid.
2. If the key expired: rotate it in the Resend dashboard and update the env var.
3. Restart the app container to pick up the new env var.
4. Verify delivery by triggering a test RSVP.

## Monitoring

Set a Sentry alert for: `Email send error` occurring > 5 times in 10 minutes.
This triggers before hosts notice.

## Post-Incident

- Confirm SMTP fallback credentials are rotated annually.
- Consider adding email delivery status tracking (store sent/failed per guest).
