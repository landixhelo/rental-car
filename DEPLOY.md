# Deploy guide — AutoRent + www.landixhelo.me

## Arkitektura
- Frontend: Vercel (`client/`) → `https://www.landixhelo.me`
- Backend: Railway ose Render (`server/`)
- Database: PostgreSQL (Neon / Railway / Render)

---

## A) Backend në Railway (rekomanduar)

1. Hap [railway.app](https://railway.app) → New Project
2. **Add PostgreSQL**
3. **Add Service** → Deploy from GitHub repo `landixhelo/rental-car`
4. Service settings:
   - **Root Directory:** `server`
   - Build: `npm ci && npm run build`
   - Start: `npx prisma db push && npm run start`
5. Variables (Settings → Variables):

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<gjenero_sekret_te_gjate_32+_chars>
CLIENT_ORIGIN=https://www.landixhelo.me
CLIENT_ORIGINS=https://landixhelo.me,https://www.landixhelo.me
ADMIN_EMAIL=landitir22@gmail.com
ADMIN_PASSWORD=<fjalekalim_i_forte_10+_chars>
ADMIN_NAME=AutoRent Admin
CONTRACTOR_PASSWORD=<fjalekalim_i_forte_10+_chars>
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=8h
UPLOAD_DIR=uploads
```

> Mos i vendos fjalëkalimet e vjetra të demo (`Admin@12345678`) në production.

6. Pas deploy, hap URL e API (p.sh. `https://autorent-api-production.up.railway.app`)
7. Test: `https://YOUR-API/api/health` → `{ "ok": true }`
8. Seed admin (një herë), nga laptop:

```bash
cd server
DATABASE_URL="postgresql://..." NODE_ENV=production npx tsx prisma/seed.ts
```

Ose shto one-off command në Railway: `npx tsx prisma/seed.ts`

---

## B) Backend në Render (alternativa)

1. [render.com](https://render.com) → New → Blueprint / Web Service
2. Mund të përdorësh `server/render.yaml`
3. Root: `server`
4. Të njëjtat env vars si më sipër
5. Shto PostgreSQL në Render dhe lidh `DATABASE_URL`

---

## C) Frontend në Vercel + domain

1. Importo repo → Root Directory: `client`
2. Env:
```env
VITE_API_URL=https://YOUR-API.up.railway.app
```
3. Deploy
4. Domains → shto `www.landixhelo.me` (+ `landixhelo.me`)
5. Te Hostinger DNS (sipas Vercel):
   - `www` → CNAME `cname.vercel-dns.com`
   - apex `@` → A / ALIAS sipas Vercel

---

## D) Checklist pas deploy

- [ ] `GET /api/health` OK
- [ ] Hap `https://www.landixhelo.me`
- [ ] Login me Super Admin
- [ ] Cookies punojnë (HTTPS + SameSite=None)
- [ ] CORS lejon origin-in e domain-it

---

## Shënime

- Frontend dhe API janë në **domaine të ndryshme** → cookies auth përdorin `SameSite=None; Secure` në production.
- Mos e lër `VITE_API_URL=http://localhost:5000` në Vercel.
- Ndrysho `ADMIN_PASSWORD` dhe `JWT_SECRET` menjëherë.
