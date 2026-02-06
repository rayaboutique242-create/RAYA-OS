# Raya React (scaffold)

Minimal React + Vite scaffold to reproduce onboarding → PDG dashboard flow.

Run:

1. cd raya-react
2. npm install
3. npm run dev

This app includes a basic `AuthContext` with `launchRole(role)` that sets the role and navigates to `/dashboard` and adds class `pdg-dark` when launching PDG.

Testing steps:

1. cd raya-react
2. npm install
3. npm run dev
4. Open http://localhost:5173
5. Click "Créer" → fill form → submit. You should be redirected to `/dashboard` and the `<html>` element should have class `pdg-dark`.

Backend (optional - recommended for integration testing):

1. cd ../raya-backend-dev
2. npm install
3. npm run dev
4. Frontend will use http://localhost:4000 by default; set VITE_API_BASE if different (e.g., `VITE_API_BASE=http://localhost:4000 npm run dev`).

Use this scaffold as a starting point for migrating the original app into a modern SPA.
