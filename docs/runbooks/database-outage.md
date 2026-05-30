# Runbook: Database Outage

**Severity:** P1 — entire platform unavailable  
**Owner:** On-call engineer

---

## Symptoms
- `GET /api/health` returns `503 { status: "degraded" }`
- All API routes return 500
- Prisma logs: `"Can't reach database server"` or connection timeout
- Application logs: `PrismaClientKnownRequestError` with code `P1001`

## Immediate Actions (< 5 minutes)

1. **Check database health**
   ```bash
   # Docker Compose deployment
   docker compose ps db
   docker compose logs db --tail 50

   # Managed DB (Supabase / Neon / RDS)
   # Check provider dashboard / status page
   ```

2. **Check disk space** (common cause of Postgres refusing connections)
   ```bash
   df -h   # on the DB host or docker volume
   ```

3. **Check connection limits**
   ```sql
   SELECT count(*), max_conn FROM pg_stat_activity
   CROSS JOIN (SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections') s;
   ```
   If near limit: restart the application container to release idle connections.

## Recovery Paths

### Scenario A — Container crash
```bash
docker compose restart db
docker compose logs db -f   # watch for "database system is ready to accept connections"
```

### Scenario B — Data volume full
```bash
# Identify large tables
psql $DATABASE_URL -c "SELECT schemaname, relname, pg_size_pretty(pg_total_relation_size(relid)) AS size FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"

# Free space: truncate LoginAttempt (30-day retention anyway)
psql $DATABASE_URL -c "DELETE FROM \"LoginAttempt\" WHERE \"createdAt\" < NOW() - INTERVAL '7 days';"

# Free space: delete expired blocked tokens
psql $DATABASE_URL -c "DELETE FROM \"BlockedToken\" WHERE \"expiresAt\" < NOW();"
```

### Scenario C — Migration failure on deploy
The CI pipeline runs migrations in a separate `migrate` job before the app
deploys. If the migration job fails:
1. The Docker build step is blocked — the old version continues running.
2. Fix the migration SQL in `prisma/migrations/`.
3. Re-run the pipeline.

Never run `prisma migrate reset` on production.

## Offline Check-In Fallback
If the database is unreachable on event day:

1. Before the event, hosts can export the guest list as CSV:
   `GET /api/events/{id}/guests/export`

2. Use the CSV for manual check-in until the database recovers.

3. After recovery, bulk-import check-in records via the admin panel or a
   one-off SQL UPDATE.

## Post-Incident
- Verify data integrity: check `Payment` table for PROCESSING payouts that
  may have been interrupted.
- Run the payout cron to resume any stuck disbursements.
- Review DB connection pooling configuration; consider adding PgBouncer.
