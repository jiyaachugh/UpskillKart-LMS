# LearnHub

A learning management system where instructors publish courses and students enroll, learn lesson by lesson, track progress and take quizzes.

## Features
- JWT authentication with student and instructor roles; role-based route and API protection
- Course catalogue with search and category/level filters
- Instructor dashboard, course editor (modules, lessons, quiz questions), enrolled-student view with progress
- Student dashboard, learning page with persisted lesson completion, MCQ quizzes with stored attempts

## Tech stack
React 18, Vite, React Router, Express, MongoDB, Mongoose, JWT, bcryptjs

## Architecture
React SPA calls a REST API (`VITE_API_URL`). Express handles auth and business rules. A course embeds its modules, lessons and quiz questions; an enrollment stores a student's completed lessons and quiz attempts.

## Folder structure
```
client/  src/{api.js, common.jsx, App.jsx, main.jsx, styles.css, pages/{Public,Student,Instructor}.jsx}
server/  {server.js, models.js, seed.js}
```

## Local setup
Requires Node 18+ and a MongoDB instance (local or Atlas).
```
cd server && npm install && cp .env.example .env
cd ../client && npm install && cp .env.example .env
```

## Environment variables
Server: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`. Client: `VITE_API_URL` (must end with `/api`).

## Seed and run
```
cd server && npm run seed && npm run dev
cd client && npm run dev
```
Open http://localhost:5173. The seed script wipes the database and recreates the demo data.

## Demo credentials (password for all: `demo1234`)
| Role | Email |
|---|---|
| Instructor | aarav@learnhub.test, neha@learnhub.test |
| Student | rohan@learnhub.test, isha@learnhub.test, kabir@learnhub.test |

## API overview
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/courses`, `GET /api/courses/:id`, `POST|PUT|DELETE /api/courses[/:id]` (instructor, owner only), `GET /api/courses/:id/manage`
- `POST /api/courses/:id/enroll`, `GET /api/courses/:id/enrollment`
- `POST /api/courses/:id/lessons/:lessonId/complete`
- `POST /api/courses/:id/quiz/submit`
- `GET /api/student/courses`, `GET /api/instructor/courses`, `GET /api/instructor/courses/:id/students`

## Deployment
1. **MongoDB Atlas:** create a free cluster, add a database user, allow network access from anywhere (0.0.0.0/0), copy the connection string (add `/learnhub` as the database name).
2. **Render (backend):** New Web Service from your GitHub repo, root directory `server`, build command `npm install`, start command `npm start`. Set `MONGODB_URI`, `JWT_SECRET` (long random string) and `CLIENT_URL` (your Vercel URL, no trailing slash). To seed the Atlas database, run `npm run seed` once locally with `MONGODB_URI` pointing at Atlas.
3. **Vercel (frontend):** import the repo, root directory `client`, framework Vite (build `npm run build`, output `dist`). Set `VITE_API_URL=https://<your-render-service>.onrender.com/api`.
4. Update `CLIENT_URL` on Render with the final Vercel URL and redeploy. The free Render tier sleeps, so the first request can take around a minute.

## Future improvements
Pagination, lesson attachments and video, course reviews, certificates on completion, automated tests.
