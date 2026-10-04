# WARUNG POS WEB APPLICATION — DEVELOPMENT PROMPT

## 1. PROJECT OVERVIEW

Build a modern, cute, pink-themed web-based Point of Sale (POS) application for a small food/drink shop.

The application should work as a real usable POS system, not merely a static UI prototype.

The primary goals are:

1. Display a product catalog.
2. Allow users/cashiers to select products.
3. Add products to cart.
4. Checkout transactions.
5. Automatically calculate totals.
6. Store transaction history.
7. Display transaction details.
8. Manage products.
9. Provide a simple sales dashboard.
10. Work extremely well on mobile devices.
11. Be deployable directly to Vercel.

The UI should feel:

- Cute
- Pink
- Clean
- Modern
- Friendly
- Minimal
- Not childish
- Not overly flashy
- Comfortable to use for daily cashier operations

Avoid excessive gradients, excessive animations, excessive shadows, or overly decorative UI.

The application should prioritize usability and speed over decoration.

---

# 2. REQUIRED TECH STACK

Use the following technology stack:

### Frontend / Full-stack

- Next.js
- App Router
- TypeScript
- React

### Styling

- Tailwind CSS
- shadcn/ui
- CSS variables for theme colors

### Backend / Database

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage

### Libraries

- Lucide React for icons
- React Hook Form for forms
- Zod for validation
- Recharts for charts if dashboard charts are needed

### Deployment

- Vercel

Do NOT introduce unnecessary backend technologies such as:

- Express
- NestJS
- Laravel
- separate Node.js backend
- separate REST API server

The application should remain a single Next.js full-stack project connected to Supabase.

---

# 3. ARCHITECTURE

Use a clean Next.js App Router architecture.

Suggested structure:

```text
src/
├── app/
│   ├── page.tsx
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── dashboard/
│   │   └── page.tsx
│   │
│   ├── pos/
│   │   └── page.tsx
│   │
│   ├── products/
│   │   └── page.tsx
│   │
│   ├── transactions/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   └── settings/
│       └── page.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── products/
│   ├── pos/
│   ├── transactions/
│   └── dashboard/
│
├── lib/
│   ├── supabase/
│   ├── validations/
│   └── utils/
│
├── types/
│
└── hooks/
```

Keep components reusable and avoid putting all application logic inside a single page component.

---

# 4. DATABASE

Use Supabase PostgreSQL.

Design a normalized relational database.

Minimum tables:

## products

Fields:

```text
id
name
description
category_id
price
cost_price
stock
image_url
is_available
created_at
updated_at
```

## categories

Fields:

```text
id
name
description
created_at
updated_at
```

## transactions

Fields:

```text
id
transaction_code
total_amount
payment_method
payment_amount
change_amount
status
created_at
created_by
```

## transaction_items

Fields:

```text
id
transaction_id
product_id
product_name
quantity
price
subtotal
created_at
```

Store `product_name` and `price` inside transaction_items as historical snapshots so that old transaction records remain correct even when product data changes later.

## profiles

Fields:

```text
id
full_name
role
created_at
updated_at
```

Roles:

```text
owner
cashier
```

---

# 5. DATABASE RELATIONSHIPS

Use these relationships:

```text
categories
    │
    └── products
            │
            └── transaction_items
                    │
                    └── transactions
```

A transaction can contain many transaction items.

A product can appear in many transaction items.

A category can contain many products.

A profile can create many transactions.

Use foreign keys appropriately.

Use database constraints where appropriate.

---

# 6. SUPABASE SECURITY

Use Row Level Security (RLS).

Do NOT expose sensitive database operations without authorization.

Users should only access data according to their role.

At minimum:

### Owner

Can:

- View dashboard
- View transactions
- Manage products
- Manage categories
- View reports
- Manage users if implemented

### Cashier

Can:

- View products
- Create transactions
- View transaction history
- View transaction details

Cashiers should not be able to modify sensitive business settings.

Never expose Supabase service role keys to the client.

Use environment variables.

Expected environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

If a server-only secret is required, keep it server-side and never expose it through `NEXT_PUBLIC_*`.

---

# 7. AUTHENTICATION

Implement authentication using Supabase Auth.

Login page:

```text
WARUNG NAME

Welcome back! 👋

Email
[________________]

Password
[________________]

[ Login ]

Forgot password?
```

Use a cute but professional pink design.

After login:

- owner → dashboard
- cashier → POS

Protect authenticated routes.

Unauthenticated users should be redirected to `/login`.

---

# 8. MAIN POS PAGE

The POS page is the most important page.

It should be optimized for fast cashier operation.

Desktop layout:

```text
┌──────────────────────────────────────────────────────┐
│ Logo / Warung Name                         User       │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Categories                                           │
│ [All] [Food] [Drink] [Snack] ...                    │
│                                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │ Product│ │ Product│ │ Product│ │ Product│        │
│ │ Image  │ │ Image  │ │ Image  │ │ Image  │        │
│ │ Name   │ │ Name   │ │ Name   │ │ Name   │        │
│ │ Rp10k  │ │ Rp15k  │ │ Rp8k   │ │ Rp12k  │        │
│ │ [+]    │ │ [+]    │ │ [+]    │ │ [+]    │        │
│ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                      │
├──────────────────────────────────────────────────────┤
│ CART                                                 │
│                                                      │
│ Product A       -  2  +             Rp20.000         │
│ Product B       -  1  +             Rp15.000         │
│                                                      │
│ Subtotal                             Rp35.000         │
│                                                      │
│ [ Checkout ]                                         │
└──────────────────────────────────────────────────────┘
```

On mobile, change the layout to:

```text
┌───────────────────────┐
│ ☰  WARUNG       🛒 3  │
├───────────────────────┤
│ 🔍 Search product     │
├───────────────────────┤
│ [All] [Food] [Drink]  │
├───────────────────────┤
│                       │
│ Product cards         │
│                       │
│ Product cards         │
│                       │
├───────────────────────┤
│ Total: Rp35.000       │
│ [ VIEW CART ]          │
└───────────────────────┘
```

The cart should become a bottom sheet or drawer on mobile.

---

# 9. PRODUCT CATALOG

Create a product catalog page.

Features:

- Search product
- Category filter
- Product cards
- Product image
- Product name
- Product price
- Availability status
- Add to cart

Example:

```text
Search products...

[All] [Food] [Drink] [Snack]

┌───────────────────┐
│                   │
│    PRODUCT IMAGE  │
│                   │
├───────────────────┤
│ Es Teh Manis      │
│ Rp 5.000          │
│                   │
│ [ + Add ]         │
└───────────────────┘
```

---

# 10. CART

Cart functionality:

- Add product
- Remove product
- Increase quantity
- Decrease quantity
- Clear cart
- Calculate subtotal
- Calculate total
- Prevent quantity from becoming negative
- Show empty cart state

Example:

```text
Your Cart 🛒

Es Teh
Rp5.000

[-] 2 [+]

Subtotal
Rp10.000

[ Checkout ]
```

The cart must persist during navigation.

Use a lightweight client-side state solution.

Prefer:

- React Context

or

- Zustand

Do not over-engineer this.

---

# 11. CHECKOUT

When clicking checkout, show checkout interface.

Fields:

```text
Total
Rp35.000

Payment Method

○ Cash
○ QRIS
○ Transfer

Payment Amount
[ Rp50.000 ]

Change
Rp15.000

[ CONFIRM PAYMENT ]
```

For cash payments:

```text
change = payment_amount - total_amount
```

Do not allow checkout when payment amount is less than total.

For QRIS / Transfer:

Payment amount can automatically equal the transaction total.

After successful checkout:

1. Create transaction.
2. Create transaction items.
3. Update stock if stock management is enabled.
4. Clear cart.
5. Show success confirmation.
6. Display transaction code.
7. Provide option to view transaction details.

---

# 12. TRANSACTION CODE

Generate a human-readable transaction code.

Example:

```text
TRX-20261004-001
```

The transaction code should be unique.

Prefer generating the final unique identifier server-side.

---

# 13. TRANSACTION HISTORY

Create `/transactions`.

Features:

- Search transaction
- Filter by date
- Filter payment method
- View transaction
- Display total
- Display transaction code
- Display cashier
- Display transaction date

Example:

```text
Transaction History

🔍 Search transaction

[Today] [This Week] [This Month]

┌────────────────────────────────────┐
│ TRX-20261004-001                   │
│ 04 Oct 2026 • 09:32                │
│ Cash                                │
│                                     │
│ 3 Items                  Rp35.000   │
│                                     │
│ [ View Detail ]                     │
└────────────────────────────────────┘
```

---

# 14. TRANSACTION DETAIL

Show:

```text
Transaction Detail

TRX-20261004-001

04 October 2026
09:32

Items
────────────────────────
Es Teh       2 x 5.000
                       10.000

Tahu        1 x 10.000
                       10.000
────────────────────────
TOTAL                  20.000

Payment
Cash                   50.000

Change                  30.000
```

Include:

```text
[ Back ]
[ Print / Receipt ]
```

If browser printing is implemented, create a clean receipt print layout.

---

# 15. PRODUCT MANAGEMENT

Create product management for owner.

Features:

- Add product
- Edit product
- Delete product
- Upload product image
- Change price
- Change stock
- Set availability
- Assign category

Product form:

```text
Product Name
Description
Category
Price
Cost Price
Stock
Product Image
Available

[ Save Product ]
```

Use React Hook Form + Zod.

Validate:

- Name required
- Price >= 0
- Cost price >= 0
- Stock >= 0

---

# 16. CATEGORY MANAGEMENT

Owner can:

- Add category
- Edit category
- Delete category

Example categories:

```text
Food
Drink
Snack
Other
```

---

# 17. DASHBOARD

Create a simple owner dashboard.

Show:

```text
Good morning! 👋

Today's Sales
Rp 450.000

Today's Transactions
32

Products Sold
87

Average Transaction
Rp 14.062
```

Add a sales chart:

```text
Sales Overview

       ╭────╮
  ╭────╯    ╰──╮
──╯            ╰──
```

Filters:

```text
Today
This Week
This Month
```

Dashboard should not be overly complex.

Focus on useful information.

---

# 18. DESIGN SYSTEM

The entire application must have a consistent pink theme.

Suggested palette:

```text
Primary Pink:
#EC4899

Light Pink:
#FCE7F3

Soft Pink:
#FDF2F8

Dark Pink:
#BE185D

Text:
#3F3F46

Background:
#FFF7FB

White:
#FFFFFF
```

However, do not hardcode these colors everywhere.

Create semantic CSS variables:

```text
--primary
--primary-foreground
--background
--foreground
--card
--muted
--border
--accent
```

This makes the theme easy to change later.

---

# 19. VISUAL STYLE

The design should feel:

"cute pink modern POS"

Think:

- Soft pink
- Rounded cards
- Rounded buttons
- Small cute decorative elements
- Clean typography
- Simple icons
- Friendly empty states
- Subtle shadows
- Generous spacing
- White surfaces
- Pink accents

Avoid:

- Neon pink
- Excessive gradients
- Excessive glassmorphism
- Excessive animations
- Huge text
- Too many decorative elements
- Cluttered dashboard
- Anime/cartoon-heavy appearance
- Childish UI

The result should look like a modern startup/product interface with a cute pink personality.

---

# 20. RESPONSIVE DESIGN

Mobile-first development is mandatory.

The application must work properly on:

- 320px
- 375px
- 390px
- 414px
- 768px
- 1024px
- 1280px+

Do not simply shrink the desktop layout.

Create dedicated responsive behavior.

For mobile:

- Bottom navigation can be used.
- Cart should become a bottom sheet/drawer.
- Product grid should become 2 columns.
- Buttons should have comfortable touch targets.
- Tables should become cards or horizontally scrollable.
- Dashboard cards should stack vertically.

For desktop:

- Sidebar navigation
- Multi-column product grid
- Persistent cart panel

---

# 21. NAVIGATION

Desktop sidebar:

```text
♡ WARUNG

Dashboard
POS
Products
Transactions
Categories
Settings
```

Mobile navigation:

```text
Home
POS
Transactions
More
```

Use Lucide icons.

---

# 22. EMPTY STATES

Create friendly empty states.

Example:

```text
🛒

Your cart is empty

Start adding delicious products
to your order.

[ Browse Products ]
```

Transaction empty state:

```text
♡ No transactions yet

Your transaction history
will appear here.
```

---

# 23. LOADING STATES

Use skeleton loading states.

Do not leave pages blank while fetching data.

Examples:

- Product card skeleton
- Transaction skeleton
- Dashboard card skeleton

---

# 24. ERROR HANDLING

Handle errors gracefully.

Never expose raw database errors to users.

Example:

Instead of:

```text
PostgrestError: duplicate key value...
```

Show:

```text
Oops! Something went wrong.

Please try again.
```

Use toast notifications for actions.

Examples:

```text
✓ Product added successfully

✓ Transaction completed

✓ Product updated

✕ Failed to save product
```

---

# 25. ACCESSIBILITY

Follow basic accessibility principles:

- Semantic HTML
- Proper labels
- Keyboard navigation
- Visible focus states
- Good color contrast
- Accessible buttons
- `alt` text for product images
- Do not rely only on color to communicate status

---

# 26. PERFORMANCE

Prioritize performance.

Use:

- Server Components where appropriate
- Client Components only when interaction requires them
- Optimized Next.js Image
- Lazy loading where appropriate
- Efficient Supabase queries
- Pagination for large transaction history
- Debounced search if needed

Avoid unnecessary client-side fetching.

---

# 27. SECURITY

Important security requirements:

- Never expose Supabase service role key.
- Use RLS.
- Validate all user input.
- Validate transaction data server-side.
- Do not trust prices sent from the client.
- Re-fetch product prices server-side when creating transactions.
- Calculate transaction totals server-side.
- Verify product availability server-side.
- Verify stock server-side.
- Prevent unauthorized transaction creation.
- Protect owner-only routes.

The client cart is only a temporary UI state.

The database/server should be the source of truth during checkout.

---

# 28. TRANSACTION CREATION LOGIC

Checkout must not simply insert whatever total the browser sends.

Correct flow:

```text
Client Cart
     ↓
Checkout
     ↓
Server-side validation
     ↓
Fetch products from database
     ↓
Validate product availability
     ↓
Validate quantities
     ↓
Calculate subtotal
     ↓
Calculate total
     ↓
Validate payment
     ↓
Create transaction
     ↓
Create transaction items
     ↓
Update stock
     ↓
Return successful transaction
```

Use an atomic database transaction/RPC approach where appropriate so that partial transactions do not occur.

---

# 29. RECEIPT

Create a printable receipt layout.

Example:

```text
        WARUNG NAME
      Jl. Example No. 10

TRX-20261004-001
04 Oct 2026 09:32

Es Teh
2 x 5.000             10.000

Tahu
1 x 10.000            10.000

----------------------------
TOTAL                  20.000

CASH                   50.000
CHANGE                 30.000

    Thank you! ♡
```

Receipt should be optimized for:

- Browser printing
- Thermal receipt if possible
- Mobile viewing

---

# 30. SAMPLE DATA

Create seed/sample data so the UI can be tested immediately.

Example products:

```text
Es Teh Manis
Rp5.000

Es Jeruk
Rp7.000

Kopi Hitam
Rp8.000

Tahu Kocek Biasa
Rp5.000

Tahu Kocek Mercon
Rp7.000

Tahu Kocek Kerikil
Rp10.000

Tahu Walik
Rp12.000
```

Categories:

```text
Food
Drink
Snack
```

Use placeholder images if actual product images are not available.

---

# 31. DATA FETCHING

Use Supabase directly from appropriate Next.js server/client contexts.

Do not create unnecessary API endpoints.

Use:

- Server Components for read-heavy pages where possible.
- Server Actions or Route Handlers for mutations where appropriate.
- Client Components for interactive POS/cart functionality.

Keep database access logic organized inside `lib/`.

---

# 32. COMPONENT PRINCIPLES

Create reusable components.

Examples:

```text
ProductCard
ProductGrid
CategoryTabs
SearchInput
Cart
CartItem
CheckoutDialog
PaymentMethodSelector
TransactionCard
TransactionTable
DashboardCard
SalesChart
EmptyState
LoadingSkeleton
ConfirmDialog
```

Do not duplicate UI code unnecessarily.

---

# 33. CODE QUALITY

Follow these principles:

- TypeScript strict mode
- No `any` unless absolutely necessary
- Reusable components
- Clear naming
- Small functions
- No duplicated logic
- No unnecessary dependencies
- Proper error handling
- Proper loading states
- Proper empty states

Do not generate one giant component containing the entire application.

---

# 34. DEVELOPMENT PHASES

Build the application incrementally.

## Phase 1 — Project Setup

Set up:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- ESLint
- project structure

Make sure the project runs.

---

## Phase 2 — Database

Create:

- categories
- products
- profiles
- transactions
- transaction_items

Create relationships.

Create RLS policies.

Create seed data.

---

## Phase 3 — Authentication

Implement:

- Login
- Logout
- Session handling
- Protected routes
- Role handling

---

## Phase 4 — Product Catalog

Implement:

- Product listing
- Search
- Categories
- Product cards
- Add to cart

---

## Phase 5 — POS / Cart

Implement:

- Cart
- Quantity controls
- Remove item
- Clear cart
- Total calculation

---

## Phase 6 — Checkout

Implement:

- Payment method
- Cash payment
- QRIS
- Transfer
- Change calculation
- Transaction creation
- Stock update
- Success state

---

## Phase 7 — Transaction History

Implement:

- Transaction list
- Search
- Filters
- Transaction detail
- Receipt

---

## Phase 8 — Product Management

Implement:

- CRUD products
- CRUD categories
- Image upload
- Stock management

---

## Phase 9 — Dashboard

Implement:

- Today's revenue
- Today's transactions
- Products sold
- Average transaction
- Sales chart

---

## Phase 10 — Responsive UI

Test all screens on:

- mobile
- tablet
- desktop

Pay special attention to:

- POS
- cart
- checkout
- transaction history

---

## Phase 11 — Final Polish

Add:

- loading states
- empty states
- error handling
- toast notifications
- accessibility improvements
- animations only where useful
- responsive improvements

---

# 35. DEPLOYMENT

The project must be Vercel-ready.

Requirements:

- No local-only backend dependency.
- No filesystem-based database.
- No hardcoded secrets.
- Environment variables documented.
- Build must succeed with:

```bash
npm run build
```

Deployment target:

```text
Vercel
```

Supabase:

```text
PostgreSQL
Auth
Storage
```

Document required environment variables in `.env.example`.

---

# 36. README

Create a complete README containing:

```text
Project overview
Tech stack
Installation
Environment variables
Supabase setup
Database setup
Seed data
Development
Build
Deployment to Vercel
```

Include commands such as:

```bash
npm install
npm run dev
npm run build
npm run start
```

---

# 37. IMPORTANT AGENT BEHAVIOR

You are an implementation agent.

Do NOT merely describe how to build the application.

Actually create and modify the project files.

Before implementing:

1. Inspect the existing repository.
2. Understand the current project structure.
3. Reuse existing components where appropriate.
4. Do not unnecessarily rewrite working code.
5. Check installed dependencies.
6. Check existing environment configuration.
7. Check existing Supabase configuration if available.

When implementing:

1. Build one feature at a time.
2. Keep the project runnable after each major change.
3. Run type checking.
4. Run linting.
5. Run build verification.
6. Fix errors before moving to the next phase.

Do not stop at mock UI.

The core features must actually work with Supabase.

---

# 38. FINAL ACCEPTANCE CRITERIA

The application is considered complete when:

- [ ] User can log in.
- [ ] Owner/cashier roles work.
- [ ] Products load from Supabase.
- [ ] Categories work.
- [ ] Product search works.
- [ ] Product filtering works.
- [ ] User can add products to cart.
- [ ] User can change quantity.
- [ ] User can remove products.
- [ ] Checkout works.
- [ ] Cash payment works.
- [ ] Change calculation works.
- [ ] QRIS/transfer payment option works.
- [ ] Transaction is saved to database.
- [ ] Transaction items are saved.
- [ ] Stock is updated correctly.
- [ ] Transaction history works.
- [ ] Transaction detail works.
- [ ] Receipt can be printed.
- [ ] Owner can manage products.
- [ ] Owner can manage categories.
- [ ] Dashboard works.
- [ ] Mobile responsive design works.
- [ ] Desktop responsive design works.
- [ ] Loading states exist.
- [ ] Error states exist.
- [ ] Empty states exist.
- [ ] RLS is configured.
- [ ] No secret keys are exposed.
- [ ] `npm run build` succeeds.
- [ ] Application can be deployed to Vercel.

---

# 39. DESIGN PRIORITY

When making design decisions, follow this priority:

```text
1. Usability
2. Mobile responsiveness
3. Performance
4. Accessibility
5. Consistency
6. Cute pink visual identity
7. Decorative elements
```

The application should feel like:

> "A cute, modern pink cashier application that is actually comfortable to use every day."

Do not sacrifice usability just to make the interface cute.