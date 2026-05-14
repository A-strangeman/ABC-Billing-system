# ABC Billing System

Production-focused billing system with:

- **Frontend:** React + Vite (`frontend/`)
- **API gateway for Vercel:** Node serverless proxy (`api/index.js`)
- **Backend:** Django (`django_backend/`)

## Project structure

- `frontend/` - UI and client-side logic
- `api/` - Vercel serverless function that forwards `/api/*` to Django
- `django_backend/` - Django app and business APIs
- `vercel.json` - deployment rewrites/build config

## Local development

### 1) Django backend

From repo root:

```bash
npm run dev:django
```

This runs Django on `http://localhost:8000`.

### 2) Frontend

From repo root:

```bash
npm run dev:frontend
```

Frontend runs on `http://localhost:5173` and proxies `/api` to Django.

For real phone testing on same Wi-Fi:

```bash
npm --prefix frontend run dev:host
```

## Standard scripts (repo root)

- `npm run dev` - frontend dev server
- `npm run dev:frontend` - frontend dev server
- `npm run dev:django` - Django dev server
- `npm run lint` - frontend lint
- `npm run build` - frontend build
- `npm run check` - lint + build

## Deployment (Vercel)

- Frontend build output: `frontend/dist`
- API routes: `/api/*` -> `api/index.js`
- Set `DJANGO_API_URL` in Vercel project environment variables
