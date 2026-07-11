# AutoRent Full-Stack

React + Express + PostgreSQL car rental platform with hardened API security.

## Stack
- **Frontend:** React + Vite + TypeScript + React Router
- **Backend:** Express + TypeScript + Zod validation
- **Database:** PostgreSQL 16 + Prisma
- **Auth:** JWT in httpOnly cookies + bcrypt (cost 12)
- **Security:** Helmet, CORS whitelist, HPP, rate limiting, upload limits, parameterized Prisma queries

## Quick start (local)

### 1) Start database
```bash
docker compose up -d
```

### 2) Server setup
```bash
cd server
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

### 3) Client
```bash
cd client
npm install
npm run dev
```

Or from root after `npm install`:
```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:5000

## Production deploy (Vercel + Railway)
See **[DEPLOY.md](./DEPLOY.md)** for:
- Railway/Render backend
- Vercel frontend
- Domain `www.landixhelo.me`

## Admin seed
- Email: `landitir22@gmail.com`
- Password: `Admin@12345678` (change in production)
- Contractor demo: `contractor@autorent.al` / `Contractor@123`

## Security notes
- Never commit real secrets
- Set strong `JWT_SECRET` (>= 32 chars)
- Production cookies: `Secure` + `SameSite=None` (cross-origin Vercel ↔ API)
- Auth endpoints are rate-limited
- Uploads limited to 2MB (jpg/png/webp/pdf)

## Legacy
Previous HTML/JS prototype is in `legacy/`.
