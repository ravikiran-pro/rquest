---
name: build-and-verify
description: >-
  Build the client and server assets using npm run build.
  USE THIS SKILL ONLY WHEN THE USER EXPLICITLY REQUESTS A BUILD IN THEIR PROMPT.
  Do not trigger automatically on prompt completion.
---

# Build and Verification Skill

Use this skill **ONLY when the user explicitly asks to run the build** or verify the production bundle. Do not run this automatically after routine code edits.

---

## Prerequisites

Ensure all dependencies are installed:
```bash
npm install
```

---

## Build Execution Steps

### 1. Full Production Build (Client + Server)
To build both client (Vite) and server (Babel):
```bash
npm run build
```
- **Client Build (`npm run client:build`)**: Runs `vite build`, bundling React assets into `dist/` and generating PWA service workers via `workbox-build`.
- **Server Build (`npm run server:build`)**: Runs Babel to transpile `src/server.js`, `src/api/` into `dist/`.

### 2. Client-Only Build (Faster Verification)
If the user only requested checking the frontend bundle:
```bash
npm run client:build
```

### 3. Server-Only Build
If the user only requested checking the backend transpilation:
```bash
npm run server:build
```

---

## Verification & Troubleshooting

1. **Verify Artifact Output**:
   Check that `dist/index.html` and `dist/server.js` exist:
   ```bash
   ls -la dist/
   ```
2. **Common Build Failures**:
   - *Rollup Dynamic Import / JSX Errors*: Check for unclosed JSX tags or unsupported syntax in `src/app/` or `src/screens/`.
   - *Babel Transpilation Errors*: Check for syntax errors in `src/server.js` or `src/api/`.
   - *Out of Memory*: If Node runs out of memory during bundling, set `NODE_OPTIONS="--max-old-space-size=4096"`.

