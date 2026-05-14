# ABC Billing Frontend

React + Vite frontend for the ABC Billing System.

## Scripts

- `npm run dev` - start local frontend dev server
- `npm run dev:host` - start dev server on local network (for phone testing)
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm run lint:fix` - auto-fix lint issues
- `npm run check` - lint + build

## API during development

Vite proxies `/api/*` to Django at `http://localhost:8000` (see `vite.config.js`).
