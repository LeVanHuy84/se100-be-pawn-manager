# Pawn Manager Backend

A NestJS backend for managing pawn shop operations, including loans, customers, collateral, and payments.

## 🚀 Quick Start (Development Mode)

This project is set up to run the **database and services in Docker** while the **backend runs locally** for faster development and debugging.

### 1. Prerequisites

- Docker & Docker Desktop
- Node.js (v20+)
- PowerShell (for Windows users)

### 2. Environment Setup

Copy the example environment file and fill in the required keys:

```bash
cp .env.example .env
```

_Crucial: Ensure `CLERK_SECRET_KEY` and other external service keys are provided._

### 3. Spin up Infrastructure

Start the PostgreSQL database and Redis internal services:

```bash
docker compose up -d
```

### 4. Run the Backend

Use the optimized local development script which automatically handles database schema sync and seeding:

```bash
npm run dev:local
```

_This script will:_

1. Sync the Prisma schema with your local database (`npx prisma db push`).
2. Intelligently seed the database if it's empty (`npx tsx prisma/seed.ts`).
3. Start the NestJS server in watch mode.

---

## 🛠 Database & Seeding

### Seeding Logic

The seeder is "intelligent" and will only insert data if the corresponding table is empty. This prevents duplicate data during repeated restarts.

- **Seed Data Source:** `prisma/seed-data.json`
- **Seeder Script:** `prisma/seed.ts` (Executed via `tsx`)

To manually trigger a seed:

```bash
npx prisma db seed
```

### Resetting the Database

If you need to wipe the database and start fresh:

```bash
npx prisma db push --force-reset
npm run dev:local
```

---

## 🏗 Project Structure (Key Folders)

- `src/modules`: Core business logic (Loans, Customers, etc.)
- `prisma/`: Database schema and seeding logic.
- `docker-compose.yml`: Infrastructure configuration (DB/Redis only).
- `run-dev.ps1`: Automation script for local development.

## 📜 License

This project is [UNLICENSED](LICENSE).
