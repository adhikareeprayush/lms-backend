# Postman collection

Postman assets live under **`docs/postman/`**:

- `docs/postman/LMS_Backend_API.postman_collection.json`
- `docs/postman/LMS_Backend_Environment.postman_environment.json`

## Import

1. Postman → **Import** → select `docs/postman/LMS_Backend_API.postman_collection.json`.
2. **Environments** → **Import** → select `docs/postman/LMS_Backend_Environment.postman_environment.json`.
3. Choose **LMS Backend Environment** from the environment dropdown.

## Base URL

Default `base_url` is `http://localhost:5000`. For a deployed API (e.g. Vercel), set `base_url` to `https://your-deployment.vercel.app`.

## Seed data (optional)

```bash
npm run seed
```

## Sample credentials (after seed)

- Admin: `admin@lms.com` / `Admin123!`
- Instructor: `instructor@lms.com` / `Instructor123!`
- Student: `student@lms.com` / `Student123!`

## Authentication flow

1. **Login** or **Register** — JWT is saved to `auth_token` in the environment (per collection scripts).
2. Protected requests send `Authorization: Bearer <token>`.

## Collection areas

- Authentication, Users, Courses, Enrollments, Health.
- Extend the collection for modules, lessons, assignments, quizzes, submissions, and reviews as needed (same paths as [API reference](./api-reference.md)).

## Newman (CLI)

```bash
newman run docs/postman/LMS_Backend_API.postman_collection.json -e docs/postman/LMS_Backend_Environment.postman_environment.json
```

## Troubleshooting

- Confirm the API is running and `base_url` is correct.
- Check MongoDB is reachable from your machine (local or Atlas).
- Refresh the token by logging in again if requests return `401`.

For HTTP details and status codes, use **Swagger UI** at `/api-docs` or see the main [API reference](./api-reference.md).
