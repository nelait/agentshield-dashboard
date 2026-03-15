# Configuration Reference

AgentShield is configured via environment variables loaded from a `.env` file using `dotenv`. All variables have sensible development defaults.

> **Source**: [`src/config/index.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/config/index.js)

---

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server listen port |
| `NODE_ENV` | `development` | Environment name (`development`, `production`, `test`) |
| `LOG_LEVEL` | `info` | Winston log level (`debug`, `info`, `warn`, `error`) |

---

## Database (PostgreSQL)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `agentshield` | Database name |
| `DB_USER` | `agentshield` | Database user |
| `DB_PASSWORD` | `agentshield_secret` | Database password |
| `DB_SSL` | `false` | Enable SSL (`true` for production) |
| `DB_POOL_SIZE` | `20` | Maximum connection pool size |

**Connection pool settings (hardcoded):**
- Idle timeout: 30,000ms
- Connection timeout: 5,000ms
- Long checkout warning: 10s

---

## Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(none)* | Redis password (optional) |

---

## JWT Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-secret-change-me` | Secret key for token signing |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |

> **⚠️ Production**: Always set a strong, unique `JWT_SECRET`.

---

## Admin Account

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@agentshield.local` | Default admin login email |
| `ADMIN_PASSWORD` | `admin123` | Default admin login password |

The admin account is created by the database seed script (`npm run seed`).

---

## Health Check

| Variable | Default | Description |
|----------|---------|-------------|
| `HEALTH_CHECK_INTERVAL_MS` | `30000` | Interval between health checks (ms) |
| `HEALTH_CHECK_TIMEOUT_MS` | `5000` | Timeout for each health check request (ms) |
| `HEALTH_CHECK_UNHEALTHY_THRESHOLD` | `3` | Consecutive failures before marking unhealthy |

---

## Compliance

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPLIANCE_ENCRYPTION_KEY` | `32-byte-encryption-key-change-me!` | AES-256-GCM key for encrypting sampled data |
| `COMPLIANCE_DEFAULT_RETENTION_DAYS` | `2190` | Default sample retention (6 years for HIPAA) |

> **⚠️ Production**: Set a cryptographically random 32-byte encryption key.

---

## Cost Tracking

| Variable | Default | Description |
|----------|---------|-------------|
| `COST_SYNC_INTERVAL_MS` | `60000` | Budget counter sync interval (ms) |

---

## Infrastructure Prerequisites

### PostgreSQL

Required tables are created by running migrations:

```bash
npm run migrate
```

Migration files (`migrations/`):
1. `001_initial_schema.sql` — Core tables (agents, workflows, policies, budgets, compliance, audit)
2. `002_compliance_checks.sql` — Compliance check results
3. `003_settings_and_rules.sql` — Settings key-value store + compliance rules with seeds
4. `004_rule_sample_data.sql` — Additional rule sample data
5. `005_evaluation.sql` — Evaluation suites, runs, and reviews

### Redis

Used for rate limiting and caching. Required for production but optional in development (the server starts without it).

### Docker Compose

Start both PostgreSQL and Redis:

```bash
cd agentshield
docker compose up -d postgres redis
```

---

## Example `.env` File

```bash
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentshield
DB_USER=agentshield
DB_PASSWORD=agentshield_secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=my-super-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Admin
ADMIN_EMAIL=admin@agentshield.local
ADMIN_PASSWORD=admin123

# Compliance
COMPLIANCE_ENCRYPTION_KEY=32-byte-random-key-for-AES-256!!
COMPLIANCE_DEFAULT_RETENTION_DAYS=2190

# Health
HEALTH_CHECK_INTERVAL_MS=30000
HEALTH_CHECK_TIMEOUT_MS=5000
```
