# LMS Backend API

<img width="1918" height="1078" alt="image" src="https://github.com/user-attachments/assets/85ba181c-f555-489c-a8e3-7a0716669f3e" />


Learning Management System REST API: **Node.js**, **Express**, **MongoDB** (Mongoose). Includes courses, modules, lessons, assignments, quizzes, enrollments, reviews, JWT auth, and **Swagger UI** at `/api-docs`.

## Quick start

```bash
npm install
cp .env.example .env   # set MONGODB_URI, JWT_SECRET
npm run dev
```

- Health: `GET /health`
- Docs: `GET /api-docs`

## Documentation

All technical docs live in **[`docs/`](./docs/README.md)**:

- [Getting started](./docs/getting-started.md)
- [Environment variables](./docs/environment.md)
- [API reference](./docs/api-reference.md)
- [Deploying on Vercel](./docs/deployment-vercel.md)
- [Postman](./docs/postman.md)

## Deploy on Vercel

Configure `MONGODB_URI` (Atlas recommended), `JWT_SECRET`, and `CORS_ORIGIN` in Vercel. See **[docs/deployment-vercel.md](./docs/deployment-vercel.md)**.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Startup checks + server |
| `npm run dev` | Development (nodemon) |
| `npm run seed` | Seed database |
| `npm run reset-password` | Reset a user password in DB (dev/support): `npm run reset-password -- email pass` |
| `npm test` | Tests |

## License

MIT
