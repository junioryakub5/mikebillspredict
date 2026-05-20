# Mike Bills Predict

Sports prediction platform with Paystack payments and Supabase backend.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS → **Vercel** |
| Backend | Node.js + Express → **Railway / VPS** |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Payments | Paystack (GHS) |

---

## Local Development

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/MIKEBILLSPREDICT.git
cd MIKEBILLSPREDICT

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Backend env (`backend/.env`)

```env
PORT=5003
PAYSTACK_SECRET_KEY=sk_test_...
ADMIN_TOKEN=your-secret-admin-password
CLIENT_URL=http://localhost:3000

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...
```

### 3. Frontend env (`frontend/.env.local`)

```env
# Leave empty for local dev — Next.js proxies /api to localhost:5003
NEXT_PUBLIC_API_URL=
```

### 4. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend → http://localhost:3000  
Admin panel → http://localhost:3000/portal

---

## Supabase Setup (first time)

1. Create a project at [supabase.com](https://supabase.com)
2. Run `backend/supabase-schema.sql` in **SQL Editor**
3. Create a **public** Storage bucket named `mikebills`
4. Copy **Project URL** + **service_role key** into `backend/.env`
5. `node backend/setup-supabase.js` — creates bucket + migrates any SQLite data

---

## Deployment

### Backend → Railway

1. Connect this GitHub repo in [Railway](https://railway.app)
2. Set **Root Directory** to `backend`
3. Set environment variables (same as `backend/.env` above)
4. Deploy — Railway auto-detects Node.js

### Frontend → Vercel

1. Connect this GitHub repo in [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Set environment variables:
   - `BACKEND_URL` = your Railway backend URL (e.g. `https://mikebills-api.up.railway.app`)
4. Deploy

### Admin panel

Visit `https://your-site.vercel.app/portal` and log in with your `ADMIN_TOKEN`.

---

## Security

- All sensitive fields (tips, booking codes) stripped from public API responses
- Rate limiting on auth (5/15min), payments (10/min), general (60/min)
- Paystack webhook verified with HMAC-SHA512
- Payment amounts verified server-side before granting access
- Admin routes protected with Bearer token
