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