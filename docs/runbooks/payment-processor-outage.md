# Runbook: Payment Processor (Snippe) Outage

**Severity:** P1 — hosts cannot collect ticket revenue, guests cannot RSVP to paid events  
**Owner:** On-call engineer

---

## Symptoms
- `POST /api/snippe/checkout` returns 500 or times out
- Webhook endpoint stops receiving events
- `initiateCollection()` throws `"Snippe collection failed"` in logs
- Guests report USSD prompt not appearing

## Immediate Actions (< 5 minutes)

1. **Confirm the outage**
   ```
   curl https://api.snippe.sh/health   # or check their status page
   ```

2. **Disable paid event RSVPs** to stop creating PENDING payments that will never complete:
   - Set a maintenance flag in the DB:
     ```sql
     INSERT INTO "Flag" (key, value) VALUES ('payments_disabled', 'true')
     ON CONFLICT (key) DO UPDATE SET value = 'true';
     ```
   - Or deploy a temporary env var `DISABLE_PAYMENTS=true` and gate
     `/api/snippe/checkout` behind it.

3. **Notify affected hosts** via the admin panel or direct email:
   > "Ticket payments are temporarily unavailable due to a payment processor
   > issue. Free RSVP events are unaffected. We expect to restore service within
   > X hours."

## During Outage

- Free events (no `ticketPrice`) continue to work normally — zero impact.
- Guest list management, check-in, and all other features remain available.
- Monitor `Payment.status = 'PENDING'` count — if it grows, guests are still
  attempting checkout. Direct them to free RSVP flow if possible.

## Recovery

1. Confirm Snippe API is healthy.
2. Re-enable payments (remove maintenance flag / env var).
3. Run the cleanup cron to clear stale PENDING payments from the outage period:
   ```
   POST /api/cron/cleanup   (x-cron-secret: <secret>)
   ```
   The cleanup cron now verifies each payment's status with Snippe before
   deleting, so legitimate delayed completions are preserved.

4. Check `PayoutLog` for any payouts that failed during the outage period and
   manually trigger the payout cron:
   ```
   POST /api/cron/payouts   (x-cron-secret: <secret>)
   ```

## Post-Incident

- File an incident report within 24 hours.
- Consider integrating a secondary payment processor (Pesapal, Flutterwave).
- Update this runbook with any new findings.
