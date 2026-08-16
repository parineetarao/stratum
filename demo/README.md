# Stratum demo dataset (`demo_retail`)

A small, deterministic retail/e-commerce dataset used as the future source
behind Stratum's public demo. **This directory currently only defines and
populates the dataset.** It is not wired into the app: there is no demo
route, no demo `Project`/`Connection`, and nothing here runs automatically.

## Files

- `generate_demo_dataset.py` — deterministic generator (`random.Random(42)`,
  fixed generation order). Produces `demo_retail.sql`. Rerun it any time you
  want to see how the data is built or need to regenerate after an edit:
  ```
  python demo/generate_demo_dataset.py
  ```
  Output is byte-identical across runs.
- `demo_retail.sql` — generated output (checked in so it's reviewable
  without running Python). Creates the `demo_retail` schema, its 9 tables,
  and inserts all rows. Starts with `DROP SCHEMA IF EXISTS demo_retail
  CASCADE` so it's idempotent.
- `load_demo.py` — one-time loader for applying `demo_retail.sql` to an
  external Postgres database (e.g. the Render instance Stratum already
  uses). Reads the target from `DEMO_SETUP_DATABASE_URL`; never hardcodes
  credentials. Only ever touches the `demo_retail` schema — it never drops
  or alters `public`. Not called from FastAPI startup or anywhere else in
  the app yet.

  ```
  DEMO_SETUP_DATABASE_URL=postgresql://user:pass@host:port/dbname \
      python demo/load_demo.py
  ```

## Schema

```
customers ──┬── addresses
            └── orders ──┬── order_items ──┬── products ── categories
                          ├── payments      └── (products) ── suppliers
                          └── shipments
```

| Table       | Rows | Role |
|-------------|-----:|------|
| customers   | 75   | dimension |
| addresses   | 90   | dimension |
| categories  | 10   | dimension |
| suppliers   | 20   | dimension |
| products    | 90   | dimension |
| orders      | 100  | hub / fact-leaning |
| order_items | 216  | fact (transaction line) |
| payments    | 109  | fact |
| shipments   | 78   | fact |

Row counts land inside the ranges requested, with some natural variance from
the seeded random draws (e.g. only ~78 of 100 orders reach a shippable
status, since 22 are Cancelled/Processing by design).

## Explicit vs. undeclared relationships (deliberate)

Declared as real Postgres foreign keys:
- `addresses.customer_id → customers.customer_id`
- `order_items.order_id → orders.order_id`
- `products.category_id → categories.category_id`

Left undeclared, but with values that genuinely correspond:
- `orders.customer_id → customers.customer_id`
- `orders.shipping_address_id → addresses.address_id`
- `order_items.product_id → products.product_id`
- `products.supplier_id → suppliers.supplier_id`
- `payments.order_id → orders.order_id`
- `shipments.order_id → orders.order_id`

This split exists so that when Stratum's metadata discovery runs against
`demo_retail`, it will see exactly the 3 declared FKs — and relationship
inference (`backend/app/engine/relationship_inference.py`) then has real,
non-trivial work to do finding the other 6. The naming and value overlap
were chosen with that engine's actual scoring in mind (see inline comments
in `generate_demo_dataset.py`):

- Most undeclared FKs use the `<entity>_id` convention the engine's entity-
  token extraction is built around (`customer_id`, `product_id`,
  `supplier_id`, `order_id`), so they should resolve as high-confidence,
  well-targeted matches once value overlap is factored in.
- `orders.shipping_address_id` is a deliberately harder case — the token
  `shipping_address` doesn't cleanly name-match the `addresses` table, so
  it's expected to land as a medium-confidence inference carried mostly by
  value overlap rather than naming. This is intentional: it's a good
  demonstration of the engine's documented value-overlap signal (and its
  documented limitation around not weighing value distribution).
- `payments.order_id` and `shipments.order_id` are close to a 1:1
  relationship with orders, so the cardinality modifier should visibly
  temper their confidence relative to `order_items.product_id`, which is
  clearly many-to-one. That's a useful, honest illustration of the engine's
  cardinality-based confidence reduction rather than something to avoid.

## Business variation baked in

- **Segments**: Consumer / Corporate / Small Business / Premium, with
  Corporate and Premium customers biased toward more frequent, larger
  orders (`SEGMENT_ORDER_BIAS`).
- **Geography**: 5 regions (West, Northeast, Midwest, South, Southwest);
  West and Northeast are over-represented in the customer base, so
  region-level revenue is visibly uneven.
- **Categories**: 10 categories with distinct price/margin profiles set via
  `CATEGORY_ECONOMICS` — e.g. Electronics is high-revenue/thin-margin,
  Beauty & Personal Care is low-volume/high-margin.
- **Profitability**: a handful of products are marked as clearance-priced
  (cost close to or above list price), and heavy discounts (35-55%) on a
  "heavy" discount tier produce ~20 genuinely loss-making order line items.
- **Discounts**: per-order discount tier — 70% light (0-10%), 22% moderate
  (20-30%), 8% heavy (35-55%).
- **Order status**: Delivered dominant (~58%), with meaningful Shipped,
  Processing, Cancelled (~12-15%) and Returned (~7-10%) rates.
- **Seasonality**: orders span Oct 2024 - Jul 2025 (10 months), with
  November and March weighted noticeably higher for a visible time-series
  bump.
- **Payments**: 5 methods (Credit Card, Debit Card, UPI, Net Banking, COD);
  Cancelled orders resolve to Failed/Refunded, Returned orders to Refunded;
  a few orders include an extra Failed attempt before the real payment.

## What's intentionally not here yet

No demo mode, routes, auth changes, frontend changes, seeding into
Stratum's own application tables (`Project`, `Connection`, etc.), or
reuse of the existing Pagila-based demo seed (`backend/app/demo/`). This
directory only defines and populates the source dataset that a later task
will point a Stratum project at.
