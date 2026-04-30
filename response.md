# Response

## Requirement Completion Rate

- [x] List pharmacies, optionally filtered by specific time and/or day of the week.
  - Implemented at `GET /pharmacies?day=Mon&time=14:00`
- [x] List all masks sold by a given pharmacy with an option to sort by name or price.
  - Implemented at `GET /pharmacies/:id/masks?sort=name|price`
- [x] List all pharmacies that offer a number of mask products within a given price range, where the count is above, below, or between given thresholds.
  - Implemented at `GET /pharmacies/mask-count?minPrice=10&maxPrice=50&countMin=3&countMax=10`
- [x] Show the top N users who spent the most on masks during a specific date range.
  - Implemented at `GET /users/top-spenders?start=2024-12-01&end=2025-01-31&limit=10`
- [x] Process a purchase where a user buys masks from multiple pharmacies at once.
  - Implemented at `POST /purchases`
- [x] Update the stock quantity of an existing mask product by increasing or decreasing it.
  - Implemented at `PATCH /masks/:id/stock`
- [x] Create or update multiple mask products for a pharmacy at once, including name, price, and stock quantity.
  - Implemented at `PUT /pharmacies/:id/masks`
- [x] Search for pharmacies or masks by name and rank the results by relevance to the search term.
  - Implemented at `GET /search?q=棉護`

---

## API Document

Interactive Swagger UI is available at **`http://localhost:3000/docs`** after startup. Every endpoint documents its path, method, request parameters, response schema with examples, and error codes.

### Endpoint Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check |
| GET | `/pharmacies` | List pharmacies. Query: `day` (Mon/Tue/…), `time` (HH:MM) |
| GET | `/pharmacies/:id/masks` | List masks for a pharmacy. Query: `sort=name\|price` |
| GET | `/pharmacies/mask-count` | Pharmacies by mask count in price range. Query: `minPrice`*, `maxPrice`*, `countMin`, `countMax` |
| PUT | `/pharmacies/:id/masks` | Batch create/update masks |
| GET | `/users/top-spenders` | Top N spenders. Query: `start`*, `end`* (YYYY-MM-DD), `limit` (default 10) |
| POST | `/purchases` | Atomic purchase transaction |
| PATCH | `/masks/:id/stock` | Adjust mask stock |
| GET | `/search` | Search by name with relevance ranking. Query: `q`* |

`*` = required

### Error Response Format

All errors follow a unified format:

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Insufficient stock for mask id 3"
}
```

| Code | Meaning | Example Trigger |
|------|---------|-----------------|
| 400 | Bad Request | Missing required param, invalid format, empty array |
| 404 | Not Found | Pharmacy / mask / user does not exist |
| 422 | Unprocessable Entity | Insufficient balance or stock |

---

## Import Data Commands

### Docker (recommended — runs automatically)

```bash
docker compose up -d
# migrate + seed execute automatically inside the container on every start
```

### Local

```bash
# Apply database schema migrations
npx prisma migrate deploy

# Import pharmacy and user seed data (idempotent — safe to re-run)
npm run seed
```

The seed script (`prisma/seed/index.ts`) reads `data/pharmacies.json` and `data/users.json`, parses and cleans the data (opening hours, price formats, datetime strings), then upserts all records atomically via `prisma.$transaction`.

Seeded data:

| Dataset | Records |
|---------|---------|
| Pharmacies | 20 (with opening hours) |
| Masks | 95 |
| Users | 20 |
| Purchase histories | 101 (2024-12 ～ 2025-01) |

---

## Test Coverage Report

I wrote 79 tests covering all primary success and failure scenarios.

```bash
# Unit tests — no database required (38 tests)
npm test

# Integration tests — requires running PostgreSQL (41 tests)
npm run test:integration

# All tests
npm run test:all

# Generate coverage report
npm run test:coverage
```

| Layer | Tests | Coverage |
|-------|-------|----------|
| `services/` unit tests | 38 | ~95% |
| `routes/` integration tests (real DB) | 41 | ~75% |

Coverage targets: `services/` > 80% ✅ · `routes/` > 70% ✅

---

## Deployment

### Docker (one-click)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
git clone https://gitlab.com/think4u-internal/pharmamask.git
cd pharmamask
```

**Windows:**
```bat
start.bat
```

**macOS / Linux:**
```bash
chmod +x start.sh
./start.sh
```

The script automatically: starts PostgreSQL 16 → runs `prisma migrate deploy` → seeds data → starts Fastify server → opens browser when ready.

| Service | URL |
|---------|-----|
| Frontend SPA | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| Health check | http://localhost:3000/healthz |

```bash
# Stop all services
docker compose down
```

### Local Development (without Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 16

```bash
npm install
cp .env.example .env        # edit DATABASE_URL if needed
npx prisma migrate deploy
npm run seed
npm run dev                 # hot-reload dev server on port 3000
```

### Environment Variables

> All secrets are managed via environment variables. `.env` is excluded from version control. No secrets are hardcoded in source code.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/phantom_mask?schema=public` |
| `PORT` | Server listen port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |

See `.env.example` for the full template.

---

## Additional Data

### Entity Relationship Diagram

```mermaid
erDiagram
    Pharmacy ||--o{ PharmacyHours : has
    Pharmacy ||--o{ Mask : sells
    Pharmacy ||--o{ PurchaseHistory : receives
    User ||--o{ PurchaseHistory : makes
    Mask ||--o{ PurchaseHistory : included_in

    Pharmacy {
        int id PK
        string name UK
        decimal cash_balance
    }
    PharmacyHours {
        int id PK
        int pharmacy_id FK
        string day_of_week
        string open_time
        string close_time
    }
    Mask {
        int id PK
        int pharmacy_id FK
        string name
        decimal price
        int stock_quantity
    }
    User {
        int id PK
        string name UK
        decimal cash_balance
    }
    PurchaseHistory {
        int id PK
        int user_id FK
        int pharmacy_id FK
        int mask_id FK
        string mask_name
        int quantity
        decimal total_price
        datetime transaction_date
    }
```

### Key Design Decisions

**Why normalize opening hours into a separate table?**
The raw JSON stores hours as strings like `"Mon 08:00 - 17:00, Fri 09:00 - 18:00"`. A separate `PharmacyHours` table with `(dayOfWeek, openTime, closeTime)` columns makes time-based filtering a simple indexed `WHERE` clause and correctly handles midnight-spanning hours.

**Why store `maskName` as a snapshot in `PurchaseHistory`?**
Mask names and prices can change. Storing the name at purchase time ensures historical records remain accurate even after product updates.

**Why use PostgreSQL full-text search with ILIKE fallback?**
`to_tsvector` + `to_tsquery` + `ts_rank` provides relevance-ranked results and leverages GIN indexes for performance. The `ILIKE` fallback catches search terms that the English-configured tsvector misses (e.g. non-Latin characters).
