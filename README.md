# 🔗 URL Shortener API

A production-ready REST API for shortening URLs, built with **Node.js**, **Express**, and **PostgreSQL**. Features JWT authentication, per-user URL management, click analytics, expiry dates, and rate limiting.

[![CI](https://github.com/YOUR_USERNAME/url-shortener-api/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/url-shortener-api/actions)

---

## Features

- **JWT Authentication** — Register, login, and protect endpoints with Bearer tokens
- **URL Shortening** — Generate 7-character short codes (or supply your own custom code)
- **Click Tracking** — Records IP, user agent, and referrer for every redirect
- **Analytics** — Per-URL stats with 30-day daily breakdown
- **Expiry Dates** — Set URLs to auto-expire at a specific datetime
- **Active Toggle** — Deactivate a URL without deleting it
- **Pagination** — Paginated list of your URLs
- **Rate Limiting** — Tiered limits per route (auth, creation, general)
- **Input Validation** — Clean error messages for all invalid inputs
- **Docker Support** — One-command local setup with `docker compose`
- **CI Pipeline** — GitHub Actions runs tests on every push

---

## Tech Stack

| Layer       | Technology                     |
|-------------|-------------------------------|
| Runtime     | Node.js 20                    |
| Framework   | Express 4                     |
| Database    | PostgreSQL 15                 |
| Auth        | JSON Web Tokens (jsonwebtoken)|
| Passwords   | bcryptjs (12 salt rounds)     |
| Short codes | nanoid                        |
| Rate limit  | express-rate-limit            |
| Testing     | Jest + Supertest              |
| Container   | Docker + Docker Compose       |

---

## Getting Started

### Option A — Docker (recommended)

```bash
git clone https://github.com/YOUR_USERNAME/url-shortener-api.git
cd url-shortener-api
docker compose up --build
```

The API will be live at `http://localhost:3000`. The database is created automatically.

Run migrations once the containers are up:

```bash
docker compose exec app npm run db:migrate
```

### Option B — Local Setup

**Prerequisites:** Node.js 20+, PostgreSQL 15+

```bash
git clone https://github.com/YOUR_USERNAME/url-shortener-api.git
cd url-shortener-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Run database migrations
npm run db:migrate

# Start the development server
npm run dev
```

---

## API Reference

### Authentication

| Method | Endpoint              | Auth     | Description              |
|--------|-----------------------|----------|--------------------------|
| POST   | `/api/auth/register`  | Public   | Create a new account     |
| POST   | `/api/auth/login`     | Public   | Login and receive a JWT  |
| GET    | `/api/auth/me`        | Required | Get current user info    |

### URLs

| Method | Endpoint                | Auth     | Description                    |
|--------|-------------------------|----------|-------------------------------|
| POST   | `/api/urls`             | Required | Create a short URL             |
| GET    | `/api/urls`             | Required | List your URLs (paginated)     |
| GET    | `/api/urls/:id/stats`   | Required | Get click analytics for a URL  |
| PATCH  | `/api/urls/:id`         | Required | Toggle active / set expiry     |
| DELETE | `/api/urls/:id`         | Required | Delete a URL                   |

### Redirect

| Method | Endpoint        | Auth   | Description                        |
|--------|-----------------|--------|------------------------------------|
| GET    | `/:shortCode`   | Public | Redirect to original URL + log click|

---

## Example Usage

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword"}'
```

**Create a short URL:**
```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://example.com/some/very/long/path"}'

# Response:
# {
#   "message": "Short URL created.",
#   "data": {
#     "short_code": "aB3xK9m",
#     "short_url": "http://localhost:3000/aB3xK9m",
#     "original_url": "https://example.com/some/very/long/path"
#   }
# }
```

**Get click stats:**
```bash
curl http://localhost:3000/api/urls/URL_ID/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Database Schema

```
users
  id UUID PK | email UNIQUE | password | created_at | updated_at

urls
  id UUID PK | user_id FK | original_url | short_code UNIQUE
  expires_at | is_active | created_at | updated_at

clicks
  id UUID PK | url_id FK | ip_address | user_agent | referer | clicked_at
```

---

## Running Tests

Tests use Jest + Supertest with a fully mocked database — no real PostgreSQL needed.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

---

## Project Structure

```
url-shortener-api/
├── src/
│   ├── config/
│   │   ├── database.js       # PostgreSQL connection pool
│   │   └── migrate.js        # Database migration script
│   ├── controllers/
│   │   ├── authController.js # Register, login, me
│   │   └── urlController.js  # CRUD + redirect + stats
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   ├── rateLimiter.js    # Tiered rate limiting
│   │   └── validate.js       # Request body validation
│   ├── models/
│   │   ├── User.js           # User queries
│   │   ├── Url.js            # URL queries
│   │   └── Click.js          # Click recording & stats
│   ├── routes/
│   │   ├── auth.js           # Auth route definitions
│   │   └── urls.js           # URL route definitions
│   └── index.js              # App entry point
├── tests/
│   ├── auth.test.js
│   └── urls.test.js
├── .github/workflows/ci.yml  # GitHub Actions CI
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Design Decisions

- **Clicks are recorded asynchronously** — the redirect fires immediately without waiting for the DB write, keeping latency low.
- **Parameterized queries throughout** — all user input is passed as parameters, never interpolated, preventing SQL injection.
- **Passwords use bcrypt with 12 rounds** — balances security and performance.
- **Auth errors are deliberately vague** — "Invalid email or password" rather than identifying which field is wrong, to prevent user enumeration.
- **Rate limits are tiered** — auth routes are far stricter (10/15min) than general API routes (100/15min) to resist brute force.

---

## Deployment

This app is ready to deploy on [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io) — all offer free PostgreSQL tiers.

Set the following environment variables in your deployment:
- `DATABASE_URL`
- `JWT_SECRET` (use a long random string)
- `BASE_URL` (your live domain, e.g. `https://myapp.railway.app`)
- `NODE_ENV=production`

---

## License

MIT
