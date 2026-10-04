# PERFORMANCE-FIRST REQUIREMENTS

Performance is a first-class requirement of this application.

The application must feel extremely responsive, especially on mobile devices.

## Core Principle

Do not make the entire application a Client Component.

Use the Next.js App Router architecture properly.

Prefer:

- Server Components for data-heavy/static UI
- Client Components only for interactive UI
- Server Actions for mutations
- Supabase for persistent data
- Client-side state for temporary POS cart state
- Caching for product/category data
- Streaming/Suspense for slow dashboard sections

---

## POS Performance

The POS must feel like a fast mobile application.

The following interactions must NOT trigger a database request:

- Add product to cart
- Remove product from cart
- Increase quantity
- Decrease quantity
- Clear cart
- Open cart
- Calculate subtotal
- Filter products
- Search products when product dataset is already loaded

These operations should happen locally in the browser.

Use lightweight client-side state such as Zustand or React Context.

Database communication should primarily happen when:

- User logs in
- User loads initial product data
- User checks out
- User loads transaction history
- User updates product
- User creates product
- User deletes product
- User loads dashboard data

---

## Client/Server Boundary

Follow this pattern:

```text
Server Component
│
├── Product data
├── Categories
├── Transaction history
└── Dashboard data

Client Component
│
├── Cart
├── Search interaction
├── Category filtering
├── Quantity controls
├── Checkout modal
└── Interactive UI
```

Do not add `"use client"` to parent layouts/pages unless absolutely necessary.

Keep the client bundle as small as possible.

---

## Product Catalog

For a small catalog, load the product dataset efficiently and perform lightweight filtering/search on the client.

Avoid sending a request to Supabase for every:

- search keystroke
- category click
- quantity change

If the catalog becomes large, implement server-side pagination/search.

---

## Caching

Cache product and category data where appropriate.

Product/category data does not change frequently.

When an owner modifies a product/category:

1. Update Supabase.
2. Invalidate the relevant cache.
3. Ensure the updated data becomes available immediately.

Do not cache user-specific transaction data incorrectly.

Never share private user-specific data between users through a public/shared cache.

---

## Database Performance

Avoid:

```sql
SELECT *
```

when unnecessary.

Select only required columns.

Use:

- pagination
- indexes
- efficient joins
- aggregation queries
- date filters

Transaction history must be paginated.

Recommended initial page size:

```text
20–30 transactions
```

Add pagination or infinite loading for older transactions.

Embedded relations (a transaction and its items, a queue line and its toppings) must come back from the same request — never one query per line or per topping.

---

## Dashboard Performance

Do not execute a separate database request for every dashboard card if the data can be aggregated efficiently.

Prefer a dedicated dashboard summary query/function that returns:

```text
revenue
transaction_count
products_sold
average_transaction
```

Use parallel data fetching when independent queries are unavoidable.

Use Suspense/streaming for dashboard sections that do not need to block the entire page.

---

## Images

All product images must use:

```tsx
next/image
```

Do not use large raw `<img>` elements for product images.

Product images should:

- have appropriate dimensions
- use responsive sizing
- lazy-load when outside viewport
- use modern formats where supported
- avoid unnecessarily large source files

Product image cards should not download multi-megapixel images when only a small thumbnail is required.

---

## Fonts

Use `next/font`.

Do not load many external fonts.

Use one primary font unless another font is absolutely necessary.

---

## Animations

Keep animations lightweight.

Prefer:

```text
CSS transitions
opacity
transform
scale
```

Avoid heavy animation libraries unless the interaction genuinely requires them.

Do not animate every product card or page element.

---

## Mobile Performance

Mobile performance is more important than desktop performance.

Test at:

```text
320px
375px
390px
414px
```

The POS must remain responsive on mid-range Android devices.

Avoid:

- huge JavaScript bundles
- unnecessary client components
- huge images
- excessive animation
- unnecessary network requests

---

## Navigation

Use Next.js Link for internal navigation.

Allow Next.js prefetching to work naturally.

Do not replace normal Next.js navigation with custom client-side routing.

---

## Loading Experience

Do not show a completely blank screen while data is loading.

Use:

- Suspense
- skeleton loaders
- streaming
- optimistic UI where appropriate

For cart operations, update the UI immediately.

For checkout, show clear progress and success/error feedback.

---

## Checkout Performance

The checkout request must be optimized but correctness has higher priority than raw speed.

Checkout flow:

```text
Cart
 ↓
Server Action
 ↓
Validate products
 ↓
Calculate authoritative total
 ↓
Validate payment
 ↓
Create transaction
 ↓
Create transaction items
 ↓
Update stock
 ↓
Return transaction
```

Do not trust totals calculated only on the client.

---

## Queue Performance

The product queue shows which checked-out products are still waiting, and it
drives the live count badge in the sidebar/bottom nav. It is often left open on
a counter screen, so it must stay fresh without user interaction.

Required behavior:

```text
Checkout / Done / Cancel / Undo
        ↓
Postgres (atomic RPC, stock fixed in the same call)
        ↓
Supabase Realtime  ──→  badge + queue board update (< ~1 s)
        ↓ (fallback)
Low-frequency poll (~20 s) + refresh on tab focus
```

Rules:

- The badge must **never** require a manual page refresh.
- Badge state lives in a client provider (React context + realtime/poll),
  never in a blocking server query on the root layout. A page render must not
  wait for the queue count.
- Realtime (`postgres_changes` on `transaction_items`) is the primary channel.
  Polling is only a fallback for a broken connection — keep it slow (≥ 15 s)
  and skip it while the tab is hidden.
- Fire an immediate local refresh after each local action (checkout, Done,
  Cancel, Undo) so the UI feels instant even if the event is still in flight.
- One tap on Done/Cancel = exactly one RPC (`set_queue_status`), which also
  returns/decrements stock atomically. Never N round-trips for one tap.
- Queue queries are bounded (≤ ~150 rows per status tab), use the
  `(queue_status, created_at)` index, and select only the columns the board
  renders. No `SELECT *`, no full-table scans, no `COUNT(*)` on every load.
- Status changes update local component state immediately (button disabled →
  spinner → row moves); do not refetch the whole queue to reflect one change.
- Cancel an interval when the tab is hidden (`document.hidden`) — a queue
  screen left open overnight must not generate a request every few seconds.
- Never send the queue through the public route cache in a way that could leak
  one cashier's view to another user.

Verification:

- Two devices open: checkout on device A, badge changes on device B without
  refreshing.
- Badge settles with the network throttled to Slow 3G / offline (poll fallback).
- A queue tab in the background generates no requests until it is focused.

---

## Avoid Waterfalls

Avoid:

```text
Request A
   ↓
Request B
   ↓
Request C
   ↓
Request D
```

when the requests are independent.

Instead use parallel fetching where possible.

Example:

```text
Products ──────┐
Categories ────┼──→ render
Dashboard ─────┘
```

---

## Bundle Size

Do not install libraries unnecessarily.

Before adding a dependency, ask:

> Can this functionality be implemented with React, Next.js, Tailwind CSS, or a small utility?

Prefer lightweight dependencies.

Do not install a large UI/animation/state library when a small solution is sufficient.

---

## Performance Verification

Before considering the application complete, verify:

- Lighthouse Performance
- Mobile Lighthouse
- First Contentful Paint
- Largest Contentful Paint
- Cumulative Layout Shift
- Total Blocking Time
- JavaScript bundle size
- Network request count
- Supabase query latency

The POS should feel instant for common interactions even when the network connection is not perfect.

---

## Performance Priority

When making implementation decisions, use this priority:

```text
1. Correctness
2. Mobile responsiveness
3. Perceived speed
4. Actual loading performance
5. Database efficiency
6. Accessibility
7. Visual design
8. Decorative effects
```

Never sacrifice transaction correctness for performance.