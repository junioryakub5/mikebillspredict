# 🧙‍♂️ Wagaring Wizards

> Premium football predictions platform — powered by Paystack, Next.js, Express & MongoDB.

---

## Project Structure

```
wagering wizards/
├── frontend/          ← Next.js 14 + Tailwind CSS
└── backend/           ← Node.js + Express + MongoDB
```

---

## Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- Paystack account (free at paystack.com)

---

## Quick Setup

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and edit env
cp .env.example .env
# → Fill in MONGO_URI, PAYSTACK_SECRET_KEY, ADMIN_TOKEN

# Start dev server
npm run dev
# Runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit env
cp .env.local.example .env.local
# → Fill in NEXT_PUBLIC_PAYSTACK_KEY

# Start dev server
npm run dev
# Runs on http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (sk_live_... or sk_test_...) |
| `ADMIN_TOKEN` | Secret token for admin access |
| `CLIENT_URL` | Frontend URL (for CORS) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_PAYSTACK_KEY` | Paystack public key (pk_live_... or pk_test_...) |

---

## Paystack Setup

1. Sign up at [paystack.com](https://paystack.com)
2. Go to **Settings → API Keys & Webhooks**
3. Copy **Test Public Key** → `NEXT_PUBLIC_PAYSTACK_KEY`
4. Copy **Test Secret Key** → `PAYSTACK_SECRET_KEY`
5. Use test card: `4084084084084081`, CVV `408`, Expiry `01/99`, OTP `123456`

---

## MongoDB Setup

**Option A — Local MongoDB:**
```bash
brew install mongodb-community
brew services start mongodb-community
# MONGO_URI=mongodb://localhost:27017/wagaring-wizards
```

**Option B — MongoDB Atlas (free cloud):**
1. Create account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster
3. Get connection string → paste into `MONGO_URI`

---

## Admin Dashboard

- Go to `http://localhost:3000/admin`
- Enter your `ADMIN_TOKEN` from `.env`
- Create, edit, delete predictions
- Mark predictions as Win/Loss when completed

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Active predictions with unlock |
| Unlock | `/unlock/[reference]` | View paid prediction |
| History | `/history` | Completed predictions + results |
| Admin | `/admin` | Dashboard (password protected) |

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/predictions` | None | Active tips (content hidden) |
| GET | `/api/predictions/history` | None | Completed tips |
| GET | `/api/access/:reference` | Payment | Unlocked prediction |
| POST | `/api/payment/verify` | None | Verify Paystack payment |
| GET | `/api/admin/predictions` | Admin token | All predictions |
| POST | `/api/admin/predictions` | Admin token | Create prediction |
| PUT | `/api/admin/predictions/:id` | Admin token | Update prediction |
| DELETE | `/api/admin/predictions/:id` | Admin token | Delete prediction |

---

## Security Notes

- Prediction content is **never** returned on the public API
- All payments are verified **server-side** with the Paystack API
- Admin routes require a **Bearer token** in the `Authorization` header
- Access tokens expire after **7 days**
- Amount is validated against the prediction price to prevent underpayment

---

Made with ✨ by Wagaring Wizards
