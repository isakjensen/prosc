# Running locally (Next.js app + scraper)

This repo contains two apps:

- `nextjs/`: the Next.js web app (default `http://localhost:3000`)
- `scraping-api/`: the scraping API + BullMQ workers (default `http://localhost:3100`)

Both use **MySQL** (via Prisma). The scraper also requires **Redis** (BullMQ).

## Localhost (testing)

### Prereqs

- Node.js (use whatever version your team standardizes on)
- MySQL-compatible database running locally (commonly **MySQL** or **MariaDB** on Windows)
- Redis running locally (commonly **Memurai** on Windows, or Redis on Linux/macOS)

Windows notes (no Docker):

- **Database**: install **MySQL Server** (via “MySQL Installer”) *or* **MariaDB** (often the “M…” you’re thinking of). Ensure it’s listening on `localhost:3306`.
- **Redis**: install **Memurai** (Windows-native Redis-compatible server). Ensure it’s listening on `localhost:6379`.

Memurai quick check:

- Open “Memurai” from the Start menu and confirm the service is running (defaults to `127.0.0.1:6379`).
- Set `REDIS_URL=redis://localhost:6379` in `scraping-api/.env`
- Optional CLI test (if you have `redis-cli` available):

```bash
redis-cli -h localhost -p 6379 ping
```

Expected output: `PONG`

### 1) Configure env vars

#### `scraping-api/`

- Copy `scraping-api/.env.example` → `scraping-api/.env`
- Ensure these are set:
  - `DATABASE_URL` (MySQL connection string)
  - `REDIS_URL` (`redis://localhost:6379` for Memurai default)
  - `API_KEY` (shared secret the Next.js app uses)
  - `PORT` (defaults to `3100`)

#### `nextjs/`

Create `nextjs/.env.local` (recommended) with at least:

```bash
DATABASE_URL="mysql://user:password@localhost:3306/fullstack"
AUTH_SECRET="change-me"

SCRAPING_API_URL="http://localhost:3100"
SCRAPING_API_KEY="your-secret-api-key-here"
```

Notes:

- `SCRAPING_API_KEY` must match `scraping-api`’s `API_KEY`.
- Don’t commit real secrets. Use `.env.local` for local dev.

### 2) Install dependencies

```bash
cd scraping-api && npm install
cd ../nextjs && npm install
```

### 3) Set up databases (Prisma)

Run Prisma commands for **each** app (they each have their own `prisma/schema.prisma`).

```bash
# scraping-api DB
cd scraping-api
npm run db:generate
npm run db:push

# nextjs DB
cd ../nextjs
npm run db:push
```

If you prefer migrations for Next.js instead of `db:push`:

```bash
cd nextjs
npm run db:migrate
```

### 4) Run the scraper API + workers

In one terminal:

```bash
cd scraping-api
npm run dev
```

Sanity check:

- Health endpoint: `http://localhost:3100/health`
- Most `/api/...` endpoints require an `Authorization: Bearer <API_KEY>` header (the health route is public).

### 5) Run the Next.js app

In a second terminal:

```bash
cd nextjs
npm run dev
```

Open:

- App: `http://localhost:3000`

### Quick “is it wired up?” check

- If the UI calls the scraper, make sure:
  - `SCRAPING_API_URL` points to `http://localhost:3100`
  - `SCRAPING_API_KEY` matches `scraping-api`’s `API_KEY`
  - Redis is running (BullMQ workers start on `scraping-api` boot)

## Production

### High-level architecture

- `nextjs/`: build once, run behind a reverse proxy (or on a platform like Vercel)
- `scraping-api/`: Node server + background workers; must have Redis + MySQL available

### Environment variables

#### `scraping-api/`

- `DATABASE_URL`: production MySQL
- `REDIS_URL`: production Redis
- `API_KEY`: long random secret (used by Next.js)
- `PORT`: set by your process manager / container runtime (or keep `3100`)

#### `nextjs/`

- `DATABASE_URL`: production MySQL
- `AUTH_SECRET`: long random secret
- `SCRAPING_API_URL`: the reachable URL of `scraping-api` (internal service URL is fine)
- `SCRAPING_API_KEY`: must match `scraping-api`’s `API_KEY`

### Build & run

#### `scraping-api/`

```bash
cd scraping-api
npm ci
npm run build
npm run db:generate
npm run db:push
npm run start
```

Run it under a process manager (e.g. systemd/PM2) or as a container.

### `tmux` cheat-sheet (VPS)

Use this on the VPS (inside your SSH session) to keep processes running after you close the SSH window.

Create a new session:

```bash
tmux new -s scraper
```

Detach (leave it running):

- Press `Ctrl+b`, release, then press `d`

Reattach later:

```bash
tmux attach -t scraper
```

List sessions:

```bash
tmux ls
```

Kill a session:

```bash
tmux kill-session -t scraper
```

#### `nextjs/`

```bash
cd nextjs
npm ci
npm run build
npm run start
```

### Operational notes

- The scraper starts BullMQ workers at boot, so Redis must be reachable before `scraping-api` is started.
- Run at least one `scraping-api` instance that includes workers. If you later split “API” and “worker” processes, ensure only the worker process starts the BullMQ consumers.
- If you deploy multiple worker replicas, make sure that’s intended (BullMQ will distribute jobs, but you should understand concurrency and rate limits for the scraped sites).
