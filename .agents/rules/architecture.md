# Antigravity Rule: Project Architecture & Invariants

This rule outlines the structural invariants of the **Rquest** full-stack monorepo.

---

## 1. Directory Organization

```
rquest/
├── .agents/                   # Antigravity rules, agents, skills, and settings
├── src/
│   ├── server.js              # Express HTTP + Socket.IO bootstrap
│   ├── api/                   # Backend Application Layer
│   │   ├── auth/              # JWT sign/verify, bcrypt hashing
│   │   ├── config/            # Database configs (PostgreSQL connection)
│   │   ├── migrations/        # Sequelize migration files
│   │   ├── models/            # Sequelize models & associations
│   │   ├── routes/            # REST API route handlers (/api/v1/*)
│   │   └── seeders/           # Initial fixtures (roles, default users)
│   ├── app/                   # Frontend Core Layer
│   │   ├── components/        # Shared components (Leaflet, Chat, Cards)
│   │   ├── routes/            # React Router v5 config & PrivateRoute
│   │   ├── services/          # Zustand global & chat stores
│   │   └── utils/             # Fetch client, socket client, helpers
│   └── screens/               # Screen Views (Home, Login, Register, Client, Admin)
├── public/                    # Static assets (icons, manifest.json, images)
├── vite.config.js             # Vite 5 client bundling & PWA configuration
└── package.json               # Monorepo dependencies and unified scripts
```

---

## 2. Port Allocation & Services

- **Port 3000**: Vite Frontend Dev Server (`npm run client:dev`). Proxies API requests to `http://localhost:3001` or connects directly via CORS.
- **Port 3001**: Express Backend & Socket.IO Gateway (`npm run server:dev`).
- **PostgreSQL**: Stores relational data, using `earthdistance` + `cube` extensions for latitude/longitude bounding box queries.
- **AWS S3**: Object storage for shop and product image assets (`rquest` bucket).

---

## 3. Communication & Data Flow Invariants

1. **REST API Base Path**:
   All endpoints must be mounted under `/api/v1` in [`src/server.js`](file:///home/dev/Freelance/rquest/src/server.js) via [`src/api/routes/index.js`](file:///home/dev/Freelance/rquest/src/api/routes/index.js).
2. **WebSocket Gateway**:
   The Socket.IO instance runs alongside the HTTP server in `src/server.js`. The global `socketData` object maps `user_id` to the active socket connection.
3. **Database Transactions**:
   Multi-step database updates (e.g. creating a shop alongside categories or address records) should use Sequelize managed transactions (`sequelize.transaction()`).
4. **Environment Variables**:
   Loaded via `dotenv` in `src/server.js` and `src/api/config/config.js`. Client-side variables exposed through Vite must begin with `VITE_`.

