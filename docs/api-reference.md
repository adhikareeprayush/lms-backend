# API reference

Base URL: `/api/v1` (unless noted).

Full request/response schemas: **Swagger UI** at `/api-docs`.

## Authentication

Send JWT on protected routes:

```http
Authorization: Bearer <token>
```

## Route overview

| Area | Method | Path | Notes |
|------|--------|------|--------|
| Auth | POST | `/auth/register`, `/auth/login` | Public |
| Auth | GET/PUT/POST | `/auth/me`, `/auth/update-profile`, `/auth/change-password`, `/auth/logout`, `/auth/verify-token` | Bearer |
| Users | GET | `/users`, `/users/:id` | Admin / own profile rules |
| Courses | GET | `/courses` | Catalog (optional auth) |
| Courses | GET | `/courses/categories`, `/courses/stats` | Stats: admin |
| Courses | GET/PATCH/DELETE | `/courses/:id`, `/courses/:id/publish` | Instructor/admin rules |
| Courses | POST | `/courses` | Instructor/admin |
| Modules | GET | `/modules/course/:courseId` | Optional auth |
| Modules | CRUD | `/modules`, `/modules/:id` | Instructor/admin |
| Lessons | GET | `/lessons/course/:courseId` | Query `module`; optional auth |
| Lessons | PATCH | `/lessons/:id/complete` | Student enrolled |
| Lessons | CRUD | `/lessons`, `/lessons/:id`, `/lessons/:id/publish` | Instructor/admin |
| Enrollments | POST | `/enrollments` | Student |
| Enrollments | GET | `/enrollments/my` | Bearer |
| Enrollments | GET/DELETE | `/enrollments/:id` | Owner / instructor / admin |
| Assignments | GET | `/assignments/course/:courseId` | Optional auth |
| Assignments | CRUD | `/assignments`, `/assignments/:id` | Instructor/admin |
| Submissions | GET | `/submissions/my` | Student |
| Submissions | GET | `/submissions/assignment/:assignmentId` | Instructor/admin |
| Submissions | POST | `/submissions` | Student |
| Submissions | PATCH | `/submissions/:id/grade` | Instructor/admin |
| Submissions | GET | `/submissions/:id` | Owner or staff |
| Quizzes | GET | `/quizzes/course/:courseId` | Answers hidden for non-staff |
| Quizzes | POST | `/quizzes/:id/attempt` | Student enrolled |
| Quizzes | CRUD | `/quizzes`, `/quizzes/:id` | Instructor/admin |
| Reviews | GET | `/reviews/course/:courseId` | Optional auth |
| Reviews | POST/DELETE | `/reviews`, `/reviews/:id` | Student / owner or admin |

## Other endpoints

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness |
| GET | `/api-docs` | Swagger UI |
