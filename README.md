# credit-disputor

## Backend API

The API lives in [`backend/`](backend/). It uses **Node.js**, **Express**, **TypeScript**, **Prisma**, and **PostgreSQL**. Docker Compose in that folder runs Postgres for local development.

### Prerequisites

- Node.js 20+
- Docker (for Postgres)

### Setup

From the `backend` directory:

1. Start the database:

   ```bash
   cd backend
   docker compose up -d
   ```

2. Install dependencies and configure the environment:

   ```bash
   npm install
   cp .env.example .env
   ```

   Set `JWT_SECRET` in `.env` to a long random string. `DATABASE_URL` should match the Postgres credentials in `.env` / `docker-compose.yml` (defaults work out of the box).

   Environment validation uses **envalid**. Important variables (see `backend/.env.example`):

   - `JWT_ACCESS_EXPIRES_IN` — access JWT lifetime (e.g. `15m`, `1h`).
   - `REFRESH_TOKEN_EXPIRES_IN` — refresh token storage TTL (e.g. `7d`; **ms**-compatible string).
   - `LOG_LEVEL`, `LOG_PRETTY` — **Pino** logging (`LOG_PRETTY=true` for readable local logs).

3. Apply database migrations:

   ```bash
   npm run db:migrate
   ```

4. Run the server:

   ```bash
   npm run dev
   ```

The server listens on `http://localhost:3000` (or the `PORT` you set).

### API documentation

- **Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/signup` | Register with `email`, `password`, `fullName`, `phoneNumber` |
| `POST` | `/auth/signin` | Sign in with `email`, `password` |
| `POST` | `/auth/refresh` | Body `{ "refreshToken" }` — returns new `accessToken` and `refreshToken` (rotation) |
| `GET` | `/auth/me` | Current user; send header `Authorization: Bearer <accessToken>` |

Successful signup, signin, and refresh responses include `accessToken`, `refreshToken`, and `user` (no password fields). Store the refresh token securely; it is shown only once per issuance.

### Health

- `GET /health` — process liveness
- `GET /health/db` — database connectivity (returns `503` if the DB is down)

### Production notes

- Use TLS (HTTPS) in front of the API in production.
- Keep `JWT_SECRET` secret and rotate if compromised.

### Troubleshooting Postgres in Docker

If the database container exits with “database files are incompatible with server”, an old volume was created by a different major Postgres version. Remove the project volume and start again (this deletes local DB data):

```bash
cd backend
docker compose down -v
docker compose up -d
```
