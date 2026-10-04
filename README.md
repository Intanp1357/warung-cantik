# Warung POS 💗

A cute, modern, pink-themed **Point of Sale (POS)** web app for small food and drink shops.
It is a real, usable POS: products, cart, checkout, stock, transaction history, printable receipts and a sales dashboard — built as a single Next.js full-stack app connected to Supabase.

## Tech stack

| Layer | Tools |
| --- | --- |
| Framework | Next.js (App Router) + React + TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui + semantic CSS variables |
| Backend / DB | Supabase — PostgreSQL, Auth, Storage, RLS |
| Forms | React Hook Form + Zod |
| State | Zustand (cart, persisted to `localStorage`) |
| Icons | Lucide React |
| Charts | Recharts |
| Deploy | Vercel |

## Features

- 🔐 Login with Supabase Auth, **owner** and **cashier** roles
- 🛍️ Product catalog with search + category filters
- 🧁 **Toppings**: flag a category as your *topping* category, switch on *Add toppings* per product, and the cashier picks toppings (with their own quantities) right in the POS — the price grows by each topping and the choice travels to the receipt and the queue
- 🛒 Cart that persists across navigation (desktop panel, mobile bottom sheet)
- 💳 Checkout with **Cash / QRIS / Transfer**, change calculation and validation
- 🔒 Checkout runs server-side (`create_transaction` RPC): prices, availability, stock and totals are re-read from the database — the browser is never trusted
- ♻️ **Idempotent checkout**: a retried payment (network hiccup) returns the transaction that was already recorded — never a duplicate sale or a double stock deduction
- 🧾 Human-readable transaction codes (`TRX-20261004-001`) and printable receipts
- 📋 **Product queue**: every checked-out product enters a queue (with a **live** nav badge — Supabase Realtime + polling fallback), and the cashier marks each one **Done** or **Cancel** — cancelling returns the stock automatically
- 🕘 Transaction history with search, date and payment-method filters + pagination
- 📦 Product management (CRUD, image upload to Supabase Storage, stock, availability)
- 🏷️ Category management
- 📊 Owner dashboard: sales, transactions, products sold, average ticket + sales chart (aggregated in Postgres, streamed in with Suspense)
- ⚡ Fast by design: cached catalog queries (tag-invalidated on every mutation), client-side search/filter, deferred chart bundle, no auth round-trips on navigation — see [PERFORMANCE_REQUIREMENTS.md](./PERFORMANCE_REQUIREMENTS.md)
- 📱 Mobile-first responsive layout (bottom navigation, bottom-sheet cart, 2-column grid)
- 🎨 Soft pink design system driven by CSS variables (easy to re-skin)
- 🚫 Friendly loading, empty and error states — raw database errors are never shown

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/0001_schema.sql` — tables, relationships, RLS policies, storage bucket and the atomic `create_transaction` RPC
   - `supabase/migrations/0002_seed.sql` — categories, products, shop settings and demo accounts
   - `supabase/migrations/0003_queue.sql` — product queue columns and the `set_queue_status` RPC (Done / Cancel with stock sync)
   - `supabase/migrations/0004_realtime.sql` — publishes `transaction_items` changes so the queue badge updates in realtime
   - `supabase/migrations/0005_dashboard.sql` — `dashboard_summary` RPC: revenue, counts and the chart series are aggregated inside Postgres
   - `supabase/migrations/0006_checkout_idempotency.sql` — idempotent checkout: a retried payment returns the first transaction instead of creating a duplicate
   - `supabase/migrations/0007_toppings.sql` — toppings: category/product flags, `transaction_item_toppings` and the checkout/queue/dashboard RPCs with topping prices and stock
3. Open **Project Settings → API** and copy the Project URL and the publishable/anon key.

### 3. Environment variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
```

> Only publishable/anon keys are used in the browser. Never put a service-role/secret key in a `NEXT_PUBLIC_*` variable — Row Level Security is what protects the data.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

### Demo accounts (created by the seed)

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@warung.test` | `owner123` |
| Cashier | `cashier@warung.test` | `cashier123` |

Prefer real accounts? Create users in **Supabase → Authentication → Users**, then assign a role:

```sql
update public.profiles set role = 'owner' where id = '<user-uuid>';
```

A profile row is created automatically for every new auth user (`handle_new_user` trigger), defaulting to `cashier`.

## Toppings

1. **Categories → Add category** — name it e.g. `Topping` and switch on **Topping category**.
2. Add each topping as a normal product (e.g. *Telur — Rp3.000*, *Kerupuk — Rp2.000*) in that category — they keep their own price, stock and image.
3. **Products → Edit** the product that should accept toppings (e.g. *Seblak*) and switch on **Add toppings**.
4. At the POS, tapping that product opens the topping picker: set the quantities and press **Add to cart**.

Notes:

- The order stays **one line** (`Seblak ×1` with `+ Telur ×2` underneath), so the receipt, the transaction detail and the kitchen queue show a single row per product — one *Done* / *Cancel* covers the whole bowl.
- The cashier can also order the product plain (no topping selected), and topping products can still be sold on their own from the grid.
- Totals, availability, stock and topping prices are re-read by `create_transaction` — the browser only sends ids and quantities. Topping stock is decremented with the sale and returned when the line is cancelled in the queue.
- Products in a topping category can never accept toppings themselves.

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build (used by Vercel)
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # typescript, no emit
```

## Project structure

```text
src/
├── app/
│   ├── page.tsx                 # redirects by role (owner → /dashboard, cashier → /pos)
│   ├── login/                   # login page
│   └── (app)/                   # authenticated shell (sidebar + bottom nav)
│       ├── dashboard/
│       ├── pos/
│       ├── products/
│       ├── categories/
│       ├── transactions/        # list + /transactions/[id] detail & receipt
│       ├── queue/               # product queue (pending / served / cancelled)
│       └── settings/
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── layout/                  # sidebar, mobile header, bottom nav, user menu, queue count provider
│   ├── products/                # catalog, cards, forms, image upload, managers
│   ├── pos/                     # pos view, cart panel, cart content, topping picker, checkout
│   ├── queue/                   # queue board with Done / Cancel actions
│   ├── transactions/            # cards, filters, receipt, print button
│   ├── dashboard/               # stat cards, sales chart
│   └── shared/                  # empty/error states, skeletons, form field
├── lib/
│   ├── actions/                 # server actions (checkout, products, categories, settings)
│   ├── queries/                 # server-side data fetching
│   ├── supabase/                # browser + server clients
│   ├── validations/             # zod schemas
│   ├── utils/                   # formatting + error mapping
│   └── auth.ts                  # session helpers / route protection
├── hooks/                       # use-cart (zustand), use-debounce
└── types/

supabase/migrations/             # SQL schema + seed (run in the SQL editor)
```

## Database

- `profiles` — user roles (`owner`, `cashier`)
- `categories` — product categories (`is_topping` marks the category that holds the toppings)
- `products` — price, cost, stock (`null` = tracking disabled), availability, image, `has_toppings`
- `transactions` — code, total, payment method/amount, change, status, cashier, idempotency keys
- `transaction_items` — historical snapshot of product name/price per sale + queue status (`pending` / `done` / `cancelled`)
- `transaction_item_toppings` — toppings booked on a line (name/price snapshot, quantity)
- `shop_settings` — shop name, address, receipt footer
- `transaction_code_counters` — guarantees unique `TRX-YYYYMMDD-NNN` codes

Every table has **Row Level Security**: staff can read, only owners manage catalog/settings, and transaction writes happen exclusively through the `create_transaction` SECURITY DEFINER RPC (topping rows are written by the same call). Queue status changes go through the `set_queue_status` RPC, which keeps stock in sync (a cancelled item returns its stock — including its toppings — to the products).

## Deployment (Vercel)

1. Push the repository to GitHub/GitLab and import it in Vercel.
2. Add the environment variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. In **Supabase → Authentication → URL Configuration**, add your Vercel domain to *Site URL* and *Redirect URLs* (for password-reset emails).
4. Deploy. `npm run build` runs automatically — no local-only backends, no filesystem database, no hardcoded secrets.

## Design system

Colors live in `src/app/globals.css` as semantic variables (`--primary`, `--background`, `--card`, `--muted`, `--border`, …). Change them once and the whole app follows:

```css
--primary: #ec4899;      /* pink */
--background: #fff7fb;   /* soft pink */
--secondary: #fce7f3;
--accent: #fce7f3;
```

Design priority: **usability → mobile responsiveness → performance → accessibility → consistency → cute pink identity**.
