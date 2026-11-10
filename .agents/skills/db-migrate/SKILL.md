---
name: db-migrate
description: >-
  Run database migrations, seeders, and schema synchronization using Sequelize CLI in PostgreSQL.
  Use when the user asks to migrate the database, run seeders, or verify database tables.
---

# Database Migration & Seeding Skill

Use this skill when modifying database schemas, running Sequelize migrations, or populating test fixtures.

---

## 1. Prerequisites

Verify PostgreSQL connection credentials in `.env` or `src/api/config/config.js`:
- Host: `DB_HOST` (e.g. `localhost` or remote endpoint)
- Port: `DB_PORT` (default `5432`)
- Database: `DB_NAME` (e.g. `rquest`)
- User: `DB_USER`
- Password: `DB_PASSWORD`

---

## 2. Running Migrations

Run pending Sequelize migrations:
```bash
npx sequelize-cli db:migrate
```

To rollback the last migration:
```bash
npx sequelize-cli db:migrate:undo
```

To check migration status:
```bash
npx sequelize-cli db:migrate:status
```

---

## 3. Creating New Migrations

To generate a new migration file:
```bash
npx sequelize-cli migration:generate --name <descriptive-name>
```
Migration files land in [`src/api/migrations/`](file:///home/dev/Freelance/rquest/src/api/migrations/).

---

## 4. Database Seeders

To populate initial roles, categories, and test fixtures:
```bash
npx sequelize-cli db:seed:all
```
Seed files are located in [`src/api/seeders/`](file:///home/dev/Freelance/rquest/src/api/seeders/).

---

## 5. PostgreSQL Extensions Check

Verify that PostgreSQL has the required extensions enabled:
```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
```
These are mandatory for geospatial distance calculations in `src/api/routes/shops/search.js`.

