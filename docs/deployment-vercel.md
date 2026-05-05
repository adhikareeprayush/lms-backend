# Deploying on Vercel

This repo includes a serverless entry for [Vercel](https://vercel.com): `api/index.js` wraps the Express app with [`serverless-http`](https://github.com/dougmoscrop/serverless-http). `vercel.json` rewrites all requests to that function.

## Requirements

- **MongoDB Atlas** (or another network-accessible MongoDB). Serverless cannot reach `localhost`; use a URI that allows Vercel’s egress IPs (Atlas: allow `0.0.0.0/0` for development or restrict by IP for production).
- Environment variables configured in the Vercel dashboard.

### Internal notes (fixes common `500 FUNCTION_INVOCATION_FAILED`)

- **Winston** does not write to `src/logs/` on Vercel (read-only filesystem); the logger uses **console only** when `VERCEL` or `AWS_LAMBDA_FUNCTION_NAME` is set.
- **Swagger** JSDoc globs use paths relative to `src/` (`__dirname`) so OpenAPI generation works in the serverless bundle.
- **MongoDB** connection is opened per request on serverless (cached after first connect); set **`MONGODB_URI`** in Vercel or every invocation will error.

## Environment variables (Vercel)

In **Project → Settings → Environment Variables**, set at least:

| Name | Example |
|------|---------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/lms-backend` |
| `JWT_SECRET` | Long random string |
| `CORS_ORIGIN` | Your frontend URL, e.g. `https://my-app.vercel.app` |

Optional: `JWT_EXPIRE`, rate limits, etc. (see [Environment](./environment.md)).

Vercel provides:

- `VERCEL` — set by Vercel on invocations (along with **trust proxy**, Mongo middleware, console-only logging).
- `VERCEL_URL` — deployment hostname (used in Swagger “Servers” when present).

## Deploy

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel (framework preset can stay **Other**).
3. Set environment variables.
4. Deploy.

Root directory should be the repository root (where `vercel.json` lives).

## How routing works

- `vercel.json` rewrites every path to the `/api` serverless function (`api/index.js`).
- The Express app handles `/health`, `/api-docs`, `/api/v1/...` as usual.

If anything returns 404 for valid routes, confirm the rewrite destination matches your Vercel version (`/api` vs `/api/index.js`); adjust `vercel.json` if needed.

## Limits

- **Function duration**: `vercel.json` sets `maxDuration` to 30s for `api/index.js` (adjust per your plan; hobby tier may cap lower).
- **Cold starts**: First request after idle may be slower; Mongo connection is reused when the Node process stays warm.
- **File uploads**: Heavy Multer/local file flows may need external storage (e.g. S3/Cloudinary), not Vercel’s ephemeral filesystem.

## Swagger / OpenAPI

Swagger UI is available at `https://<your-deployment>/api-docs`. The OpenAPI “Servers” entry uses `https://` + `VERCEL_URL` when that variable is set.

## Local vs Vercel

| Concern | Local (`npm start`) | Vercel |
|--------|---------------------|--------|
| Entry | `src/server.js` listens on `PORT` | `api/index.js` only |
| MongoDB | Connect in `server.js` | Connect via middleware when `VERCEL` / Lambda (cached connection) |
