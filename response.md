# Technical Response

## Database Design

### Why split PharmacyHours into a separate table?

The raw data stores opening hours as a single string per pharmacy (e.g., `"Mon 08:00 - 17:00, Tue 08:00 - 17:00, ..."`). Storing this as a string would make time-based filtering impossible without expensive string parsing at query time.

By normalizing into `PharmacyHours(pharmacyId, dayOfWeek, openTime, closeTime)`, we can:
- Filter pharmacies open at a given day/time with a simple `WHERE` clause
- Index on `(dayOfWeek, openTime, closeTime)` for efficient lookups
- Handle midnight-spanning hours (e.g., `17:00 - 05:00`) correctly in application logic

### Index Strategy

| Index | Purpose |
|-------|---------|
| `PharmacyHours(dayOfWeek, openTime, closeTime)` | Day/time availability queries |
| `Mask(pharmacyId, price)` | Price-range filter + pharmacy join |
| `PurchaseHistory(userId, transactionDate)` | User spending analytics by date |
| GIN on `Mask(name)` | Full-text search on mask names |
| GIN on `Pharmacy(name)` | Full-text search on pharmacy names |

## ETL Data Cleaning

The opening hours parser handles these observed format variations:
- Single day: `"Mon 08:00 - 17:00"`
- Multi-day comma list: `"Mon 08:00 - 17:00, Fri 09:00 - 18:00, Sat 10:00 - 20:00"`
- `"Thur"` abbreviation (not standard `"Thu"`)
- Midnight-spanning hours: `"17:00 - 05:00"`, `"23:00 - 12:00"`
- `"24:00"` as close time (treated as end of day)
- Extra whitespace around commas: `"Mon 08:00 - 22:00 , Thur 08:00 - 22:00"`

The seed script uses `prisma.$transaction` for atomic imports — if any record fails, the entire import rolls back.

## Search Implementation

Search uses PostgreSQL's built-in full-text search:

```sql
SELECT id, name,
  ts_rank(to_tsvector('english', name), to_tsquery('english', 'mask:*')) AS rank
FROM masks
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'mask:*')
   OR name ILIKE '%mask%'
ORDER BY rank DESC, name ASC
```

- `to_tsvector` + `to_tsquery` with prefix matching (`:*`) enables partial word matches
- `ts_rank` provides relevance scoring
- ILIKE fallback catches cases the tsvector misses
- Results are ordered by rank descending (most relevant first), then alphabetically
- GIN indexes on both tables make these queries fast even at scale

## Transaction Design

The purchase endpoint uses Prisma's interactive transaction (`$transaction(async tx => {...})`) to guarantee atomicity across multiple operations:

1. Validate user exists
2. Validate all masks exist and have sufficient stock
3. Validate user has sufficient balance
4. Within the same transaction:
   - Deduct user balance
   - Decrement each mask's stock
   - Increment each pharmacy's balance
   - Create purchase history records

If any step fails, all changes are rolled back. The `totalPrice` in `PurchaseHistory` stores the price at time of purchase (snapshot), not a reference to the current mask price — this prevents price changes from corrupting historical records.

## Testing Strategy

### Unit Tests (`tests/unit/`)
Test business logic in isolation by mocking the repository layer with `vi.mock()`. These tests run without a database and verify:
- Input validation (400/404/422 error cases)
- Correct delegation to repositories
- Edge cases (midnight hours, empty queries, zero adjustment)

### Integration Tests (`tests/integration/`)
Test the full HTTP layer using Fastify's `app.inject()` (in-process HTTP, no network). The repository layer is still mocked so tests run without a database, but we verify:
- HTTP status codes
- Request/response JSON shapes
- Schema validation (Fastify rejects invalid inputs before the handler runs)
- Error response format consistency

This layered approach gives high confidence in the contract between layers while keeping tests fast and reproducible.
