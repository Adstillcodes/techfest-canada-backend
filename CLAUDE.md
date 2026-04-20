# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # production (node server.js)
npm run dev      # development with hot reload (nodemon server.js)
```

No build, test, or lint scripts are configured.

## Environment Variables

Copy these to a `.env` file (no `.env.example` exists):

```
MONGO_URI
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
JWT_SECRET
PORT                  # default 5000
FRONTEND_URL
API_URL
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
LINKEDIN_REDIRECT_URI
```

## Architecture

Node.js + Express REST API using **ES modules** (`"type": "module"` in package.json). MongoDB via Mongoose.

**Entry point:** `server.js` — mounts all routes, configures CORS, connects to MongoDB, and handles the Stripe webhook raw body parser (must stay before `express.json()`).

### Route → File Map

| Mount | File | Notes |
|-------|------|-------|
| `/api/auth` | `routes/auth.js` | JWT + bcrypt + Google/LinkedIn OAuth |
| `/api/payments` | `routes/payments.js` | Stripe checkout session creation |
| `/api/webhook` | `routes/webhook.js` | Stripe webhook; ticket PDF + QR code generation |
| `/api/checkin` | `routes/checkin.js` | QR code scan check-in |
| `/api/admin` | `routes/admin.js` | Sales analytics, inventory management |
| `/api/campaigns` | `routes/campaigns.js` | Email campaign CRUD, launch, batch send (~32 KB) |
| `/api/campaigns/automation` | `routes/campaignAutomation.js` | Automation template scheduling (~22 KB) |
| `/api/track` | `routes/tracking.js` | Email open pixel + click redirect + bounce webhook |
| `/api/kyc` | `routes/kyc.js` | Exhibitor/sponsor KYC forms |
| `/api/subscriptions` | `routes/subscriptions.js` | Newsletter subscriptions |
| `/api/agenda` | `routes/agenda.js` | Event agenda |
| `/api/brochure` | `routes/brochure.js` | Event brochures |

### Key Models (`models/`)

- **User** — auth, ticket ownership, reset tokens; roles: `user` / `admin`
- **Campaign** — email campaigns with open/click/bounce stats
- **CampaignTemplate** — 5-phase automation sequences
- **Audience** — contact lists with nested contact schema (CSV import via multer)
- **EmailTracking** — per-email engagement (opens, clicks, bounces with IP/UA)
- **TicketInventory** — ticket tiers with pricing and sold counts
- **Subscription, Kyc, Agenda, Brochure** — supporting data

### Email System (`routes/campaigns.js`, `services/`)

- Emails sent via **Resend** (`resend` package)
- `sanitizeEmailHtml()` strips `<title>` tags
- `wrapLinksWithTracking()` injects a 1×1 tracking pixel and rewrites `<a href>` links through `/api/track/click/:id`
- `sendBatchCampaignEmails()` handles rate-limited batch delivery
- Bounce events arrive via Resend webhook at `/api/track/bounce`

### Stripe Integration

- Automatic tax (HST/GST Canada) is enabled on checkout sessions
- Booth purchases vs. ticket purchases use different metadata and redirect URLs
- **Critical:** the webhook route must receive the raw body — `server.js` applies `express.raw()` before `express.json()` for that path

### Auth Middleware

`middleware/adminAuth.js` exports `requireAdmin()` — attach to any route that should be admin-only.

### CORS Allowed Origins

`thetechfestival.com`, `techfest-canada-frontend.vercel.app`, `techfest-canada-backend.onrender.com`, `techfest-api.onrender.com`, `localhost:5173`
