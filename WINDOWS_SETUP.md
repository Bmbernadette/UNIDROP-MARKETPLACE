# UniDrop Marketplace — Windows Setup Guide

This guide walks you through running the full UniDrop project on **Windows 10/11** without issues.

---

## Prerequisites

### 1. Install Node.js

Download the **LTS version** from [nodejs.org](https://nodejs.org):

- Click the left (LTS) button — currently Node.js 20.x or 22.x
- Run the installer, accept defaults, check **"Automatically install the necessary tools"**
- Verify after install:

```powershell
node --version
npm --version
```

### 2. Install Git

Download from [git-scm.com](https://git-scm.com/download/win):

- Use the **64-bit Git for Windows Setup**
- Accept defaults (use bundled OpenSSH, checkout Windows-style / commit Unix-style)
- Verify:

```powershell
git --version
```

### 3. Install PostgreSQL

Download from [postgresql.org](https://www.postgresql.org/download/windows/):

- Click **Download the installer**
- Choose the latest version (16.x or 15.x)
- **IMPORTANT during installation:**
  - Set password: `postgres` (remember this)
  - Port: `5432` (default)
  - Uncheck **"Stack Builder"** at the end
- Add PostgreSQL to PATH:

```powershell
# Open PowerShell as Administrator and run:
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\16\bin", "Machine")
```

- Restart your terminal, then verify:

```powershell
psql --version
```

### 4. Install Stripe CLI

Download from [stripe.com/docs/stripe-cli](https://docs.stripe.com/stripe-cli):

- Download the **Windows .exe** file
- Place it in `C:\Windows\System32\` or add its folder to PATH
- Verify:

```powershell
stripe version
```

---

## Project Setup

### 1. Clone the Repository

```powershell
git clone <repo-url>
cd UNIDROP-MARKETPLACE
```

### 2. Install Backend Dependencies

```powershell
cd backend
npm install
```

### 3. Install Frontend Dependencies

```powershell
cd ..\frontend
npm install
```

### 4. Create the Database

Open **pgAdmin** (installed with PostgreSQL) or use PowerShell:

```powershell
# Using psql (enter password "postgres" when prompted)
psql -U postgres -c "CREATE DATABASE unidrop_marketplace;"
```

If that fails with "role does not exist", use pgAdmin:
- Open pgAdmin → enter your password
- Right-click **Databases → Create → Database**
- Name: `unidrop_marketplace`
- Owner: `postgres`
- Click **Save**

### 5. Configure Environment Variables

Edit `backend\.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unidrop_marketplace
DB_USER=postgres
DB_PASSWORD=postgres
# ^ MUST match the password you set during PostgreSQL installation

JWT_SECRET=unidrop_jwt_secret_change_in_production
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development

# Stripe keys from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

COMMISSION_FEE_PERCENTAGE=3
```

### 6. Run Migrations & Seed

```powershell
cd backend
npm run migrate
npm run seed
```

---

## Running the Project

Open **three separate terminals** (PowerShell or Command Prompt):

### Terminal 1 — Backend

```powershell
cd UNIDROP-MARKETPLACE\backend
npm run dev
```

You should see: `[UniDrop] Server running on http://localhost:5000`

### Terminal 2 — Frontend

```powershell
cd UNIDROP-MARKETPLACE\frontend
npm run dev
```

You should see: `Local: http://localhost:3000/`

### Terminal 3 — Stripe Webhook Listener

```powershell
stripe login
# Follow the browser prompt to authenticate

stripe listen --forward-to localhost:5000/api/payments/webhook
```

Open **http://localhost:3000** in your browser.

---

## Common Windows Issues & Fixes

### Issue: `psql` command not found

**Fix:** Add PostgreSQL to PATH manually:
1. Press `Win + R`, type `sysdm.cpl`, go to **Advanced → Environment Variables**
2. Under **System Variables**, find `Path` → Edit → New
3. Add: `C:\Program Files\PostgreSQL\16\bin`
4. Restart your terminal

### Issue: `npm install` fails with `node-gyp` errors

**Fix:** Install Windows build tools:

```powershell
# Run PowerShell as Administrator
npm install --global windows-build-tools
```

Or install Visual Studio Build Tools from [visualstudio.com](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) — select "Desktop development with C++".

### Issue: PostgreSQL connection refused / password authentication failed

**Fix:** Edit `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`:
- Find all `scram-sha-256` entries
- Change them to `md5`
- Restart PostgreSQL service:

```powershell
# Run PowerShell as Administrator
Restart-Service postgresql-x64-16
```

### Issue: Port 5000 or 3000 already in use

**Fix:** Find and kill the process:

```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill it (replace XXXX with the PID shown)
taskkill /PID XXXX /F
```

### Issue: Stripe payment form shows "Loading secure payment..." forever

**Fix:** Check Windows Firewall isn't blocking Stripe:
1. Open **Windows Security → Firewall & network protection**
2. Click **Allow an app through firewall**
3. Make sure **Node.js** and your **browser** are allowed

Also verify `https://js.stripe.com` is reachable by opening it in your browser — you should see JavaScript code, not an error.

### Issue: Line ending warnings (CRLF vs LF)

**Fix:** Configure Git to handle line endings:

```powershell
git config --global core.autocrlf true
```

### Issue: `npm run dev` says "Cannot find module" or `MODULE_NOT_FOUND`

**Fix:** Delete `node_modules` and reinstall:

```powershell
cd backend
rm -r -force node_modules
npm install

cd ..\frontend
rm -r -force node_modules
npm install
```

---

## Quick Restart After System Reboot

```powershell
# 1. Start PostgreSQL (should auto-start, but if not:)
#    Run Services.msc → find "postgresql-x64-16" → Start

# 2. Terminal 1
cd UNIDROP-MARKETPLACE\backend
npm run dev

# 3. Terminal 2
cd UNIDROP-MARKETPLACE\frontend
npm run dev

# 4. Terminal 3
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@unidrop.co.tz` | `admin123` |
| Buyer | `john@udsm.ac.tz` | `test123` |

## Stripe Test Cards

| Result | Card Number |
|--------|-------------|
| Success | `4242 4242 4242 4242` |
| Decline | `4000 0000 0000 0002` |

Any future expiry date, any 3-digit CVC.

---

If you encounter an issue not listed here, check the Windows Event Viewer or run the commands with `--verbose` for more detailed error output.
