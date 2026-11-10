# Antigravity Rule: Build Execution Policy

> [!CAUTION]
> **STRICT INSTRUCTION: DO NOT RUN NPM BUILD AT PROMPT END**
> Under NO circumstances should an agent trigger `npm run build`, `npm run client:build`, `npm run server:build`, or `npm build` automatically at the end of a prompt or turn.

---

## 1. Problem Statement & Rationale

- Full project builds (`vite build` + `babel dist`) bundle thousands of modules, compile service workers with `workbox-build`, and take 30–60+ seconds.
- Automatically running builds on every turn:
  1. Blocks conversational flow.
  2. Spawns long-running background tasks.
  3. Consumes unnecessary compute and battery.
  4. Delays agent response times significantly.

---

## 2. Hard Execution Constraints

1. **Trigger Condition**:
   - `npm run build` (or client/server builds) must **ONLY** be executed when the user prompt explicitly requests a build.
   - Example valid user triggers:
     - *"Run npm run build"*
     - *"Test the production build"*
     - *"Build the client and server assets"*
     - *"Verify that vite build passes without errors"*
2. **Turn-End Prohibition**:
   - Never conclude an edit turn with an automated build command.
   - Never run a build just to "double check" if a code edit was clean.
3. **Alternative Verification Methods**:
   - Check modified files with `git diff`.
   - Perform static syntax checks or targeted single-file linting (e.g., `npx eslint src/path/to/modified.js`).
   - In active development, the running Vite dev server (`npm run dev` / `npm run client:dev`) automatically catches runtime errors and JSX compilation issues via Hot Module Replacement (HMR).

---

## 3. How to Respond When User Requests a Build

When the user *does* explicitly request a build:
1. Run `npm run build` (or `npm run client:build` / `npm run server:build` depending on what was asked).
2. Report the build status concisely, highlighting any bundling errors, missing dependencies, or chunk size alerts.
3. Verify that output files were generated in [`dist/`](file:///home/dev/Freelance/rquest/dist/).

