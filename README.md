# UniDrop Marketplace

**"Campus Trade Made Safe and Easy"**

A specialized peer-to-peer e-commerce platform for university students in Tanzania. UniDrop provides a verified, secure digital environment for campus commerce with identity verification and digital escrow payments.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router 6, Vite |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL |
| **Auth** | JWT (bcrypt hashed passwords) |
| **Payments** | Stripe (test mode) |
| **Icons** | Lucide React |
| **Uploads** | Multer |

---

## Features

- **Student Identity Verification** — Mandatory institutional ID verification for all users
- **Digital Escrow System** — Funds held securely until buyer inspects and approves the item
- **Campus-Based Filtering** — Filter products by university campus (UDSM, DIT, IFM, CBE, etc.)
- **Product Listings** — Create listings with photos, descriptions, condition, and meeting points
- **Secure Checkout** — 5-step flow: Confirm → Pay (Stripe) → Escrow → Approve → Complete
- **User Dashboard** — Manage listings, track orders, view purchase/sale history
- **Reviews & Ratings** — Post-transaction reviews with 5-star ratings
- **Premium Listings** — Boosted product visibility
- **Campus Advertisements** — Banner ads from local businesses

---

## Project Structure

```
UNIDROP-MARKETPLACE/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # PostgreSQL connection pool
│   │   │   └── stripe.js            # Stripe SDK initialization
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT authentication
│   │   │   └── upload.js            # Multer file uploads
│   │   ├── migrations/
│   │   │   ├── runMigrations.js     # Create database tables
│   │   │   └── seedData.js          # Seed initial data
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # Register, Login, Student Verification
│   │   │   ├── userRoutes.js        # Profile, Dashboard, Reviews
│   │   │   ├── productRoutes.js     # Product CRUD, Search, Filters
│   │   │   ├── orderRoutes.js       # Orders, Escrow Lifecycle
│   │   │   ├── paymentRoutes.js     # Stripe Payment Intents
│   │   │   ├── escrowRoutes.js      # Escrow Status & History
│   │   │   ├── categoryRoutes.js    # Product Categories
│   │   │   ├── advertisementRoutes.js # Campus Ads
│   │   │   └── uploadRoutes.js      # File Uploads
│   │   └── server.js                # Express app entry point
│   ├── uploads/                     # Product image storage
│   ├── package.json
│   └── .env                         # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # Navigation bar
│   │   │   ├── Footer.jsx           # Site footer
│   │   │   ├── ProductCard.jsx      # Product grid card
│   │   │   ├── StripePaymentForm.jsx # Stripe card input
│   │   │   └── AppErrorBoundary.jsx  # Error boundary
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global auth state
│   │   ├── pages/
│   │   │   ├── HomePage.jsx          # Landing page
│   │   │   ├── ProductCatalogPage.jsx # Browse & filter
│   │   │   ├── ProductDetailPage.jsx  # Product details
│   │   │   ├── CheckoutPage.jsx       # Stripe checkout
│   │   │   ├── DashboardPage.jsx      # User dashboard
│   │   │   ├── LoginPage.jsx          # Sign in
│   │   │   ├── RegisterPage.jsx       # Create account
│   │   │   ├── CreateListingPage.jsx  # Sell an item
│   │   │   ├── VerifyStudentPage.jsx  # ID verification
│   │   │   └── NotFoundPage.jsx       # 404 page
│   │   ├── services/
│   │   │   └── api.js                # Axios API client
│   │   ├── App.jsx                   # Routes & auth guards
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Design system
│   ├── public/
│   │   └── logo.png                  # UniDrop logo
│   ├── index.html
│   ├── package.json
│   └── vite.config.js                # Dev server proxy
│
├── BUSINESS CONCEPT DOCUMENT.docx     # Original requirements
├── .gitignore
└── README.md
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Student accounts with verification status |
| `categories` | Product classification (Textbooks, Electronics, etc.) |
| `products` | Items listed for sale |
| `product_images` | Multiple images per product |
| `orders` | Purchase transactions with escrow lifecycle |
| `escrow_transactions` | Payment holding/release tracking |
| `reviews` | Buyer/seller ratings |
| `advertisements` | Campus business banner ads |
| `premium_listings` | Paid boosted listings |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **Stripe CLI** (for webhook testing)

### 1. Clone & Install

```bash
git clone <repo-url>
cd UNIDROP-MARKETPLACE

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup PostgreSQL

```bash
# Create the database
sudo -u postgres createdb unidrop_marketplace

# Set password (optional, if using peer auth)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### 3. Configure Environment

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unidrop_marketplace
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

COMMISSION_FEE_PERCENTAGE=3
```

### 4. Run Migrations & Seed

```bash
cd backend

# Create database tables
npm run migrate

# Seed categories and demo data
npm run seed
```

### 5. Start the Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 6. Start Stripe Webhook Listener (for payments)

```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

---

## Usage

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@unidrop.co.tz` | `admin123` |
| Buyer | `john@udsm.ac.tz` | `test123` |

### Test Cards (Stripe Test Mode)

| Result | Card Number |
|--------|-------------|
| Success | `4242 4242 4242 4242` |
| Decline | `4000 0000 0000 0002` |

Any future expiry date, any 3-digit CVC.

### Payment Flow

1. **Browse** products or create a listing
2. **Click "Buy Now"** on a product
3. **Confirm meeting point** → creates order
4. **Enter card details** → Stripe processes payment
5. **Funds held in escrow** — meet the seller on campus
6. **Inspect the item** in person
7. **Approve Release** → funds sent to seller
8. **Or Cancel** → funds refunded

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new student |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/verify-student` | Submit ID verification |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (search, filter, paginate) |
| GET | `/api/products/featured` | Premium listings |
| GET | `/api/products/:id` | Product details |
| POST | `/api/products` | Create listing |
| PUT | `/api/products/:id` | Update listing |
| DELETE | `/api/products/:id` | Delete listing |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/create` | Create order |
| GET | `/api/orders/my-orders` | User's orders |
| GET | `/api/orders/:id` | Order details |
| PUT | `/api/orders/:id/approve` | Approve & release escrow |
| PUT | `/api/orders/:id/cancel` | Cancel & refund |

### Payments (Stripe)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/config` | Get publishable key |
| POST | `/api/payments/create-payment-intent` | Create Stripe PaymentIntent |
| POST | `/api/payments/confirm-payment` | Confirm payment success |
| POST | `/api/payments/release-escrow` | Release funds to seller |
| POST | `/api/payments/refund-escrow` | Refund to buyer |
| POST | `/api/payments/webhook` | Stripe webhook receiver |

---

## Brand

- **Name:** UniDrop Marketplace
- **Slogan:** "Campus Trade Made Safe and Easy"
- **Colors:** Sky Blue `#2B7BD6` + Golden Amber `#E8A817`
- **Target:** University students in Tanzania (UDSM, DIT, IFM, CBE, MUHAS, ARDHI, SUA)

---

## License

Proprietary — All rights reserved.
