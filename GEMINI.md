# Rquest - Antigravity Agent Guidelines & Workspace Invariants

Welcome to the **Rquest** workspace. This repository is a full-stack hyper-local marketplace application connecting retail merchants with nearby consumers via geospatial search and real-time messaging.

---

## 🚨 MANDATORY BUILD EXECUTION POLICY (CRITICAL)

> [!IMPORTANT]
> **NEVER run `npm run build`, `npm build`, `npm run client:build`, `npm run server:build`, or full bundling commands automatically at the end of a prompt, after editing files, or as an unrequested verification step.**
>
> **Execution Rule**:
> - **ONLY** run build commands when the user **EXPLICITLY requests it in the prompt** (e.g., *"build the app"*, *"run npm build"*, *"check production build"*).
> - In routine development, Vite Fast Refresh (HMR) and Nodemon handle live reload during `npm run dev`. Full builds are expensive, run as background tasks, and slow down development cycles.
> - To verify edits without a full build:
>   - Review changes with `git diff`.
>   - Run targeted, single-file linting if requested (e.g. `npx eslint <path-to-file>`).
>   - Inspect syntax and exports directly in code.

---

## 1. Monorepo Architecture Overview

- **Monorepo Layout**:
  - `src/server.js`: Express HTTP server + Socket.IO server entry point.
  - `src/api/`: Backend REST API (`/api/v1`), Sequelize ORM models, migrations, auth, and database config.
  - `src/app/`: Frontend core (React 17, Vite 5, React Router v5, Zustand stores, Leaflet components).
  - `src/screens/`: Application views (`home`, `login`, `register`, `client_register`, `admin`).
- **Ports & Environment**:
  - Frontend Client dev server: Port `3000` (Vite)
  - Backend API & WebSockets: Port `3001` (Express + Socket.IO)
  - Unified dev command: `npm run dev` (launches client and server concurrently)

---

## 2. Technology Stack & Strict Constraints

| Layer | Technology | Version | Constraints & Guidelines |
|---|---|---|---|
| **Frontend Framework** | React | `17.0.2` | **Do NOT use React 18+ exclusive hooks or APIs** (e.g., `useId`, `useTransition`, `createRoot`). Stick to React 17 compatible APIs and patterns. |
| **Bundler & Dev Server** | Vite | `5.0.8` | Configured in [`vite.config.js`](file:///home/dev/Freelance/rquest/vite.config.js) with `vite-plugin-pwa` and `@vitejs/plugin-react`. |
| **UI Library** | Ant Design (`antd`) | `5.8.3` | Use Ant Design 5 components (`Button`, `Form`, `Input`, `Modal`, `Table`, `Drawer`, `Select`). |
| **Mapping Engine** | Leaflet & React-Leaflet | `1.9.4` / `4.2.1` | Map rendering with OpenStreetMap tiles. Leaflet pins and search use `leaflet-geosearch` `3.11.0`. |
| **State Management** | Zustand | `4.4.7` | Persisted via `createJSONStorage(() => sessionStorage)`. Use `useGlobalStore` for user session and `useChatStore` for chat overlay. |
| **Backend Framework** | Node.js Express | `4.17.1` | REST endpoints mounted under `/api/v1`. CORS enabled. JSON body parser limit is `50mb`. |
| **Database & ORM** | PostgreSQL + Sequelize | `8.11.3` / `6.35.1` | UUID primary keys for users, shops, roles, chats. Integer PKs for taxonomy. Geospatial distance powered by PostgreSQL `earthdistance` + `cube`. |
| **Real-time Gateway** | Socket.IO | `4.7.2` | Bi-directional messaging. In-memory `socketData` map tracks active sockets by `user_id`. |
| **Cloud Storage** | AWS SDK (S3) | `2.1565.0` | File uploads handled via Multer and uploaded to AWS S3 bucket `rquest`. |

---

## 3. Core Development Practices

1. **Preserve Existing Code**:
   - Maintain existing docstrings, comments, and utility functions unless explicitly asked to modify them.
   - Do not wipe out legacy routes or fallback behaviors when extending endpoints.
2. **Database Integrity**:
   - Always check migrations in [`src/api/migrations/`](file:///home/dev/Freelance/rquest/src/api/migrations/) before altering models in [`src/api/models/`](file:///home/dev/Freelance/rquest/src/api/models/).
   - Ensure foreign keys and association aliases match across models (`as: 'userShops'`, `as: 'shopCategory'`, etc.).
3. **Security Standards**:
   - Never commit or expose `.env` credentials (AWS keys, DB passwords, JWT secrets).
   - Passwords must be hashed using `bcrypt` (10 salt rounds).
   - Authenticated routes must validate the Bearer JWT token against `SECRET_KEY`.
4. **Clickable Links**:
   - Always link to files and line numbers using `[filename](file:///path/to/file#L1-L10)` format in Antigravity responses.

