# Rquest - Multi-Agent Operating Rules (`AGENTS.md`)

This file governs the behavior of all Antigravity agents operating in the **Rquest** workspace.

---

## 🛑 GLOBAL OPERATIONAL DIRECTIVE: BUILD EXECUTION

> [!WARNING]
> **DO NOT automatically execute `npm run build`, `npm run client:build`, `npm run server:build`, or any full build command at the conclusion of a turn or after editing files.**
>
> 1. Full production builds are compute-intensive and unnecessary for routine edits.
> 2. The local development environment uses Vite HMR and Nodemon (`npm run dev`), which provide instant feedback.
> 3. **Rule**: Run `npm run build` **ONLY IF** the user prompt specifically requests a build (e.g., *"run the build"*, *"execute npm run build"*, *"check build output"*).
> 4. For validating individual file edits, use static code inspection or targeted single-file lint checks.

---

## Agent Roles & Specialization

When operating on this project, adhere to role boundaries or delegate tasks to specialized agents:

1. **Full-stack Orchestrator (`fullstack-orchestrator`)**:
   - Manages end-to-end features spanning both frontend and backend.
   - Coordinates API contracts between [`src/api/routes/`](file:///home/dev/Freelance/rquest/src/api/routes/) and [`src/app/utils/network.js`](file:///home/dev/Freelance/rquest/src/app/utils/network.js).
   - Oversees database migration planning.

2. **Frontend Specialist (`frontend-specialist`)**:
   - Scoped to [`src/app/`](file:///home/dev/Freelance/rquest/src/app/) and [`src/screens/`](file:///home/dev/Freelance/rquest/src/screens/).
   - Enforces React 17 compatibility (no React 18 hooks).
   - Manages Ant Design 5 layouts, Leaflet map views, and Zustand store states.

3. **Backend Specialist (`backend-specialist`)**:
   - Scoped to [`src/server.js`](file:///home/dev/Freelance/rquest/src/server.js) and [`src/api/`](file:///home/dev/Freelance/rquest/src/api/).
   - Manages Express routing, Sequelize ORM models/migrations, and PostgreSQL `earthdistance` queries.
   - Oversees Socket.IO real-time event distribution and AWS S3 storage handling.

---

## Key Workspace Invariants

- **Routing Invariant**: All REST API routes are prefixed with `/api/v1`. Static files or client SPA routes must not collide with `/api/v1`.
- **Authentication**: Stateless JWT in Bearer header (`sessionStorage.getItem('auth_token')`). Protected client routes utilize [`PrivateRoute`](file:///home/dev/Freelance/rquest/src/app/routes/privateroute.jsx).
- **Geospatial Distance Formula**:
  ```sql
  (point(shops.longitude, shops.latitude) <@> point(:userLon, :userLat))
  ```
  Distances are computed in statute miles (multiply by 1.60934 for kilometers).
- **Real-Time Messaging**: The `socketData` map in [`src/server.js`](file:///home/dev/Freelance/rquest/src/server.js) maps `user_id` to `{ ...user, socket_id }`. Emitted messages use event `message_received`.

---

## Verification Strategy

- **Interactive Verification**: Rely on the running dev server (`npm run dev`).
- **Syntax Verification**: Check JS syntax and targeted linting with `npx eslint <modified_file>` if needed.
- **Git State**: Check modified files with `git status` and `git diff` to ensure clean, scoped changes.
- **DO NOT run monorepo builds at turn end.**

