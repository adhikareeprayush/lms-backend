# Environment variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | HTTP port locally (default `5000`; Vercel sets this automatically) |
| `MONGODB_URI` | MongoDB connection string (**required**) |
| `JWT_SECRET` | Secret for JWT signing (**required**) |
| `JWT_EXPIRE` | Token expiry (e.g. `7d`) |
| `JWT_COOKIE_EXPIRE` | Cookie expiry (days) if using cookies |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window per IP |
| `CORS_ORIGIN` | Allowed browser origin(s) for CORS |

Optional integrations (see `.env.example`):

- Email (`EMAIL_*`, `nodemailer`)
- Cloudinary (`CLOUDINARY_*`)

## Vercel

Set `MONGODB_URI`, `JWT_SECRET`, and `CORS_ORIGIN` (your frontend URL) in the Vercel project **Settings → Environment Variables**.

`VERCEL` and `VERCEL_URL` are injected automatically by Vercel.
