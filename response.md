# PharmaMask — Response

## 1. Requirement Completion Rate

| # | Feature | Status |
|---|---------|--------|
| 1 | List pharmacies, optionally filtered by day / time | ✅ `GET /pharmacies?day=Mon&time=14:00` |
| 2 | List masks sold by a pharmacy, sortable by name or price | ✅ `GET /pharmacies/:id/masks?sort=name\|price` |
| 3 | Pharmacies with mask count in a price range | ✅ `GET /pharmacies/mask-count?minPrice=&maxPrice=&countMin=` |
| 4 | Top N users by spending in a date range | ✅ `GET /users/top-spenders?start=&end=&limit=` |
| 5 | Purchase transaction (atomic, multi-pharmacy capable) | ✅ `POST /purchases` |
| 6 | Adjust mask stock quantity | ✅ `PATCH /masks/:id/stock` |
| 7 | Batch create / update masks for a pharmacy | ✅ `PUT /pharmacies/:id/masks` |
| 8 | Search pharmacies and masks by name, ranked by relevance | ✅ `GET /search?q=` |

---

## 2. API Documentation

Interactive Swagger UI is available at **`http://localhost:3000/docs`** after startup.

### Endpoint Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check — returns `{ status: "ok" }` |
| GET | `/pharmacies` | List all pharmacies. Optional: `?day=Mon&time=14:00` to filter by operating hours |
| GET | `/pharmacies/:id/masks` | List masks for a pharmacy. Optional: `?sort=name\|price` |
| GET | `/pharmacies/mask-count` | Filter pharmacies by mask count in price range. Required: `minPrice`, `maxPrice`. Optional: `countMin`, `countMax` |
| PUT | `/pharmacies/:id/masks` | Batch create/update masks. Body: `{ masks: [{name, price, stockQuantity}] }` |
| GET | `/users/top-spenders` | Top N spenders. Required: `start`, `end` (YYYY-MM-DD). Optional: `limit` (default 10) |
| POST | `/purchases` | Purchase transaction. Body: `{ userId, items: [{maskId, quantity}] }` |
| PATCH | `/masks/:id/stock` | Adjust stock. Body: `{ adjustment: number }` (positive = add, negative = deduct) |
| GET | `/search` | Search pharmacies and masks by name. Required: `q` |
| GET | `/docs` | Swagger UI |

### Response / Error Codes

| Code | Meaning | Trigger |
|------|---------|---------|
| 200 | OK | Successful GET / PATCH / PUT |
| 201 | Created | Successful POST /purchases |
| 400 | Bad Request | Missing required params, invalid format, empty array |
| 404 | Not Found | Pharmacy / mask / user does not exist |
| 422 | Unprocessable Entity | Insufficient balance or stock |

All error responses follow this format:
```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Insufficient stock for mask id 3"
}
```

---

## 3. Data Import Commands

### Docker (recommended)

Data is imported automatically on every container start:

```bash
docker compose up -d
# migrate + seed runs automatically inside the container
```

### Local

```bash
# 1. Apply database migrations
npx prisma migrate deploy

# 2. Import pharmacy and user seed data (idempotent — safe to re-run)
npm run seed
```

The seed script (`prisma/seed/index.ts`) reads `data/pharmacies.json` and `data/users.json`, cleans and transforms the data, then upserts all records into PostgreSQL via Prisma.

Seed data imported:

| Dataset | Count |
|---------|-------|
| Pharmacies | 20 (with opening hours) |
| Masks | 95 |
| Users | 20 |
| Purchase histories | 101 (2024-12 ～ 2025-01) |

---

## 4. Test Coverage Report

```bash
# Run unit tests (no database required)
npm test

# Run integration tests (requires Docker DB)
npm run test:integration

# Run all tests
npm run test:all

# Generate coverage report
npm run test:coverage
```

| Layer | Tests | Coverage |
|-------|-------|----------|
| `services/` (unit) | 38 | ~95% |
| `routes/` (integration, real DB) | 41 | ~75% |
| **Total** | **79** | |

Coverage targets: `services/` > 80% ✅ · `routes/` > 70% ✅

---

## 5. Deployment Instructions

### Docker (one-click, recommended)

**Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running**

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

The script starts PostgreSQL, runs migrations, imports seed data, starts the API server, and opens the browser automatically.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| Health check | http://localhost:3000/healthz |

To stop:
```bash
docker compose down
```

### Local Development (without Docker)

**Prerequisites: Node.js 20+, PostgreSQL 16**

```bash
npm install
cp .env.example .env        # edit DATABASE_URL if needed
npx prisma migrate deploy
npm run seed
npm run dev                 # hot-reload dev server
```

---

## 6. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/phantom_mask?schema=public` |
| `PORT` | Server listen port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |

All secrets are managed via environment variables. The `.env` file is excluded from version control (`.gitignore`). No secrets are hardcoded in source code.

See `.env.example` for a complete template.

---

## 7. Technical Decisions

### Database Design

The raw data stores opening hours as a single string per pharmacy (e.g. `"Mon 08:00 - 17:00, Fri 09:00 - 18:00"`). Storing this as a string would make time-based filtering impossible without expensive string parsing at query time.

By normalizing into `PharmacyHours(pharmacyId, dayOfWeek, openTime, closeTime)`:
- Day/time filtering is a simple `WHERE` clause
- `(dayOfWeek, openTime, closeTime)` index enables efficient lookups
- Midnight-spanning hours (e.g. `17:00 - 05:00`) are handled correctly in application logic

**Index strategy:**

| Index | Purpose |
|-------|---------|
| `PharmacyHours(dayOfWeek, openTime, closeTime)` | Day/time availability queries |
| `Mask(pharmacyId, price)` | Price-range filter + pharmacy join |
| `PurchaseHistory(userId, transactionDate)` | User spending analytics by date |
| GIN on `Mask(name)` | Full-text search on mask names |
| GIN on `Pharmacy(name)` | Full-text search on pharmacy names |

### ETL Data Cleaning

The opening hours parser handles all observed format variations:
- Single day: `"Mon 08:00 - 17:00"`
- Multi-day comma list: `"Mon 08:00 - 17:00, Fri 09:00 - 18:00"`
- `"Thur"` abbreviation (non-standard — normalised to `"Thu"`)
- Midnight-spanning: `"17:00 - 05:00"`, `"23:00 - 12:00"`
- `"24:00"` close time (treated as end of day)
- Extra whitespace: `"Mon 08:00 - 22:00 , Thur 08:00 - 22:00"`

The seed script wraps all inserts in `prisma.$transaction` for atomic imports — if any record fails, the entire import rolls back.

### Search Implementation

Search uses PostgreSQL built-in full-text search:

```sql
SELECT id, name,
  ts_rank(to_tsvector('english', name), to_tsquery('english', 'mask:*')) AS rank
FROM masks
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'mask:*')
   OR name ILIKE '%mask%'
ORDER BY rank DESC, name ASC
```

- `to_tsvector` + `to_tsquery` with prefix matching (`:*`) enables partial-word matches
- `ts_rank` provides relevance scoring for results ordering
- `ILIKE` fallback catches terms the tsvector misses (e.g. non-Latin characters)
- GIN indexes on both tables keep queries fast at scale

### Transaction Design

`POST /purchases` uses Prisma interactive transaction (`$transaction(async tx => {...})`) to guarantee atomicity:

1. Validate user exists
2. Validate all masks exist and have sufficient stock
3. Validate user has sufficient balance
4. Within the same transaction: deduct user balance · decrement mask stock · increment pharmacy balance · create purchase history records

If any step fails, all changes roll back. `totalPrice` in `PurchaseHistory` stores the price snapshot at purchase time — price changes never corrupt historical records.

### Testing Strategy

**Unit tests** (`tests/unit/`) — 38 tests, no database required

Mock the repository layer with `vi.mock()` and test business logic in isolation:
- Input validation (400 / 404 / 422 error paths)
- Correct delegation to repositories
- Edge cases (midnight hours, empty queries, zero adjustment)

**Integration tests** (`tests/integration/`) — 41 tests, requires PostgreSQL

Connect to a real PostgreSQL instance using an isolated `schema=test` (separate from development data). Each test file truncates all tables in `beforeAll`, inserts its own fixtures, then asserts against real query results. Tests run sequentially to avoid cross-file interference.

This layered approach gives high confidence in both business logic and the full HTTP stack, while keeping unit tests fast and runnable without infrastructure.
