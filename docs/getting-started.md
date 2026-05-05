# Getting started

## Prerequisites

- Node.js 16+
- MongoDB 4.4+ (local process, Docker, or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

## Install

```bash
cd lms-backend
npm install
```

## Configuration

```bash
cp .env.example .env
```

Set at least:

- `MONGODB_URI` — connection string (Atlas or `mongodb://127.0.0.1:27017/lms-backend`)
- `JWT_SECRET` — strong secret for signing JWTs
- `PORT` — optional; defaults to `5000` locally

Optional: `CORS_ORIGIN` (default `http://localhost:5173`) for browser clients.

See [Environment variables](./environment.md).

## MongoDB must be reachable

If `npm run seed` fails with `ECONNREFUSED` to `127.0.0.1:27017`, MongoDB is not listening locally. Either start `mongod`, run Mongo in Docker, or point `MONGODB_URI` at Atlas.

## Seed demo data

Creates users, courses, enrollments, and sample module/lessons/assignment/quiz on the JavaScript demo course:

```bash
npm run seed
```

Sample logins after seed (see seed script / Postman doc):

- Admin: `admin@lms.com` / `Admin123!`
- Instructor: `instructor@lms.com` / `Instructor123!`
- Student: `student@lms.com` / `Student123!`

## Run the API

```bash
npm run dev
# or
npm start
```

`npm start` runs `src/scripts/startup.js` (checks `.env` and MongoDB), then `src/server.js`.

- Health: `GET http://localhost:5000/health`
- Swagger UI: `GET http://localhost:5000/api-docs`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Startup checks + server |
| `npm run dev` | Same with nodemon |
| `npm run seed` | Seed database |
| `npm run reset-password` | Set a user's password in MongoDB: `npm run reset-password -- user@example.com NewPass123` |
| `npm test` | Jest tests |
| `npm run lint` | ESLint |

## Project layout

```
src/
├── app.js           # Express app (middleware, routes, Swagger; no listen)
├── server.js        # connectDB + HTTP server
├── config/
├── middleware/
├── models/
├── routes/
├── utils/
└── scripts/         # startup, seedData, reset-password
api/
└── index.js         # Vercel serverless entry (re-exports app)
tests/
docs/
└── postman/         # Postman collection & environment JSON
```
