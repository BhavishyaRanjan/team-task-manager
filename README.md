# Team Task Manager

A full-stack web app for managing team projects and tasks with role-based access control.

## Features

- **Authentication** — Signup/Login with JWT, passwords hashed with bcrypt
- **Projects** — Create projects, invite members by email, manage roles
- **Tasks** — Create, assign, update and delete tasks with status and priority
- **RBAC** — Admins manage everything; members can only update status of their assigned tasks
- **Dashboard** — Task stats (total, in-progress, overdue) and your assigned tasks at a glance

## Tech Stack

- **Backend:** Node.js, Express.js, MongoDB (Mongoose), JWT, bcryptjs
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Deployment:** Railway + MongoDB Atlas

## Local Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Fill in your `MONGO_URI` and a strong `JWT_SECRET`.

3. Start the server:
   ```bash
   npm start
   ```

4. Open `http://localhost:3000`

## Deployment on Railway

1. Push your code to a GitHub repository.

2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.

3. Add a **MongoDB** plugin inside Railway, or use MongoDB Atlas (recommended):
   - Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
   - Whitelist all IPs (`0.0.0.0/0`) under Network Access
   - Copy the connection string

4. Set environment variables in Railway's dashboard:
   ```
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_secret_here
   ```

5. Railway auto-deploys on every push. Your live URL appears in the dashboard.

## API Reference

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/signup` | Public | Register |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Auth | Get current user |
| GET | `/api/projects` | Auth | List my projects |
| POST | `/api/projects` | Auth | Create project |
| GET | `/api/projects/:id` | Member | Get project |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Add member |
| DELETE | `/api/projects/:id/members/:uid` | Admin | Remove member |
| GET | `/api/projects/:id/tasks` | Member | List tasks |
| POST | `/api/projects/:id/tasks` | Admin | Create task |
| PUT | `/api/projects/:id/tasks/:tid` | Admin/Assignee | Update task |
| DELETE | `/api/projects/:id/tasks/:tid` | Admin | Delete task |
| GET | `/api/dashboard` | Auth | Dashboard stats |

## Project Structure

```
team-task-manager/
├── server/
│   ├── models/
│   │   ├── User.js          # User schema + password hashing
│   │   ├── Project.js       # Project schema with member roles
│   │   └── Task.js          # Task schema with status/priority
│   ├── routes/
│   │   ├── auth.js          # Signup, login, /me
│   │   ├── projects.js      # CRUD + member management
│   │   ├── tasks.js         # CRUD with RBAC enforcement
│   │   └── dashboard.js     # Aggregated stats
│   ├── middleware/
│   │   ├── auth.js          # JWT verification
│   │   └── rbac.js          # projectAccess + adminOnly
│   └── index.js             # Express app + MongoDB connect
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js           # Fetch wrapper
│       └── app.js           # UI logic
├── .env.example
├── railway.json
└── README.md
```
