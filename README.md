# Phantom Mask

A pharmacy management REST API platform built with Fastify, PostgreSQL, and Prisma.

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript (ESM)
- **Framework**: Fastify 4
- **Database**: PostgreSQL 16 via Prisma ORM
- **Testing**: Vitest + Fastify inject (no supertest)
- **Containerization**: Docker + Docker Compose
- **API Docs**: Swagger UI (`@fastify/swagger-ui`)
- **Security**: `@fastify/helmet`, `@fastify/rate-limit`

## Quick Start (Docker)

```bash
# Start the database and app
docker compose up -d

# Seed initial data
docker compose exec app npm run seed

# API is available at http://localhost:3000
# Swagger UI at http://localhost:3000/docs
```

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16

### Setup

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your database URL

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed data
npm run seed

# Start dev server (with hot reload)
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/phantom_mask?schema=public` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |

See `.env.example` for reference.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Health check |
| GET | `/pharmacies` | List pharmacies (optional `?day=Mon&time=14:00`) |
| GET | `/pharmacies/:id/masks` | List masks for a pharmacy (optional `?sort=name\|price`) |
| GET | `/pharmacies/mask-count` | Filter pharmacies by mask count in price range |
| PUT | `/pharmacies/:id/masks` | Bulk create/update masks |
| GET | `/users/top-spenders` | Top spenders by date range |
| POST | `/purchases` | Process a purchase transaction |
| PATCH | `/masks/:id/stock` | Adjust mask stock quantity |
| GET | `/search` | Search pharmacies and masks by name |
| GET | `/docs` | Swagger UI |

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

Coverage targets:
- `services/` → > 80% (actual: ~95%)
- `routes/` (integration) → > 70% (actual: ~75%)

## Project Structure

```
src/
├── app.ts              # Fastify app factory
├── server.ts           # Entry point
├── prisma.ts           # Prisma client singleton
├── routes/             # Route handlers
├── services/           # Business logic
├── repositories/       # Data access layer
└── schemas/            # JSON Schema validation

prisma/
├── schema.prisma       # Database schema
├── migrations/         # SQL migrations
└── seed/               # ETL seed scripts

tests/
├── unit/               # Unit tests (mocked dependencies)
├── integration/        # Integration tests (Fastify inject)
└── setup.ts            # Test setup

data/
├── pharmacies.json     # Raw pharmacy data
└── users.json          # Raw user data
```
