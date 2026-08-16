"""
Deterministic generator for Stratum's public demo dataset (schema: demo_retail).

Regenerating produces byte-identical output because every random draw comes
from a single seeded `random.Random(42)` instance and generation order never
changes. Run:

    python demo/generate_demo_dataset.py

from the repo root (or anywhere — paths are resolved relative to this file).
It writes demo/demo_retail.sql. Nothing here touches a live database; this
script only produces the SQL text that demo/load_demo.py later applies.

Design notes (see demo/README.md for the full rationale):
  - customers -> addresses, categories -> products, orders -> order_items
    are declared as real Postgres foreign keys.
  - orders.customer_id, orders.shipping_address_id, order_items.product_id,
    products.supplier_id, payments.order_id, shipments.order_id are
    deliberately left undeclared even though the values genuinely
    correspond, so Stratum's relationship inference has real work to do.
  - order_items is generated first (per order), and orders.discount_amount /
    total_amount are derived by aggregating its own items, so the fact
    table and its header row are always numerically consistent.
"""
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 42
OUT_PATH = Path(__file__).resolve().parent / "demo_retail.sql"

rng = random.Random(SEED)

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Daniel", "Nancy", "Matthew", "Lisa",
    "Anthony", "Betty", "Mark", "Margaret", "Paul", "Sandra", "Steven", "Ashley",
    "Andrew", "Kimberly", "Kenneth", "Emily", "Joshua", "Donna", "Kevin", "Michelle",
    "Brian", "Dorothy", "George", "Carol", "Edward", "Amanda", "Ronald", "Melissa",
    "Timothy", "Deborah", "Jason", "Stephanie", "Jeffrey", "Rebecca", "Ryan", "Sharon",
    "Jacob", "Laura", "Gary", "Cynthia", "Nicholas", "Kathleen", "Eric", "Amy",
    "Jonathan", "Angela", "Stephen", "Shirley", "Larry", "Anna", "Justin", "Brenda",
    "Scott", "Pamela", "Brandon", "Emma", "Benjamin", "Nicole",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts",
]

REGIONS = ["West", "Northeast", "Midwest", "South", "Southwest"]
# West and Northeast are deliberately over-represented and skew toward
# higher-value segments, so region-level revenue is visibly uneven.
REGION_CUSTOMER_WEIGHTS = {"West": 28, "Northeast": 24, "Midwest": 18, "South": 18, "Southwest": 12}
REGION_STATES = {
    "West": ["CA", "WA", "OR", "NV"],
    "Northeast": ["NY", "MA", "NJ", "PA"],
    "Midwest": ["IL", "OH", "MI", "WI"],
    "South": ["TX", "GA", "FL", "NC"],
    "Southwest": ["AZ", "NM", "CO", "UT"],
}
REGION_CITIES = {
    "West": ["Los Angeles", "San Diego", "Seattle", "Portland", "Sacramento"],
    "Northeast": ["New York", "Boston", "Newark", "Philadelphia", "Albany"],
    "Midwest": ["Chicago", "Columbus", "Detroit", "Milwaukee", "Indianapolis"],
    "South": ["Houston", "Atlanta", "Miami", "Charlotte", "Dallas"],
    "Southwest": ["Phoenix", "Albuquerque", "Denver", "Salt Lake City", "Tucson"],
}

SEGMENTS = ["Consumer", "Corporate", "Small Business", "Premium"]
SEGMENT_WEIGHTS = [40, 20, 20, 20]
# Higher-value segments place bigger, more frequent orders.
SEGMENT_ORDER_BIAS = {"Consumer": 1, "Corporate": 3, "Small Business": 2, "Premium": 4}

CATEGORIES = [
    ("Electronics", "Tech"),
    ("Furniture", "Home"),
    ("Office Supplies", "Office"),
    ("Clothing", "Apparel"),
    ("Home & Kitchen", "Home"),
    ("Sports & Outdoors", "Lifestyle"),
    ("Books & Media", "Media"),
    ("Beauty & Personal Care", "Health"),
    ("Toys & Games", "Lifestyle"),
    ("Grocery", "Consumables"),
]
# margin_range = (cost_ratio_low, cost_ratio_high) as fraction of unit_price;
# price_range = typical unit price band for the category.
CATEGORY_ECONOMICS = {
    "Electronics": {"price_range": (40, 900), "cost_ratio": (0.70, 0.85)},       # high revenue, thin margin
    "Furniture": {"price_range": (60, 700), "cost_ratio": (0.55, 0.70)},
    "Office Supplies": {"price_range": (3, 60), "cost_ratio": (0.60, 0.75)},     # high volume, thin margin
    "Clothing": {"price_range": (12, 120), "cost_ratio": (0.35, 0.55)},
    "Home & Kitchen": {"price_range": (10, 200), "cost_ratio": (0.45, 0.65)},
    "Sports & Outdoors": {"price_range": (15, 300), "cost_ratio": (0.40, 0.60)},
    "Books & Media": {"price_range": (6, 40), "cost_ratio": (0.55, 0.70)},
    "Beauty & Personal Care": {"price_range": (5, 70), "cost_ratio": (0.20, 0.40)},   # low volume, high margin
    "Toys & Games": {"price_range": (8, 90), "cost_ratio": (0.35, 0.55)},
    "Grocery": {"price_range": (2, 25), "cost_ratio": (0.65, 0.80)},
}

SUPPLIER_NAME_STEMS = [
    "Northgate", "Summit", "Pioneer", "Vanguard", "Harborline", "Crescent", "Meridian",
    "Foundry", "Redwood", "Anchor", "Bright Peak", "Sterling", "Union Square", "Ironclad",
    "Cobalt", "Lakeside", "Prairie", "Coral", "Granite", "Willow",
]
SUPPLIER_SUFFIXES = ["Supply Co.", "Distributors", "Wholesale", "Trading Group", "Industries"]

ORDER_STATUSES = ["Delivered", "Shipped", "Processing", "Cancelled", "Returned"]
ORDER_STATUS_WEIGHTS = [58, 12, 8, 12, 10]

PAYMENT_METHODS = ["Credit Card", "Debit Card", "UPI", "Net Banking", "COD"]
PAYMENT_METHOD_WEIGHTS = [35, 25, 18, 12, 10]

SHIPPING_METHODS = ["Standard", "Express", "Overnight", "Pickup"]

# 10 months, Oct 2024 - Jul 2025, with Nov (holiday) and Mar (spring promo)
# noticeably stronger than the rest so time-series charts aren't flat.
ORDER_MONTHS = [
    date(2024, 10, 1), date(2024, 11, 1), date(2024, 12, 1), date(2025, 1, 1),
    date(2025, 2, 1), date(2025, 3, 1), date(2025, 4, 1), date(2025, 5, 1),
    date(2025, 6, 1), date(2025, 7, 1),
]
ORDER_MONTH_WEIGHTS = [8, 15, 10, 8, 8, 15, 9, 9, 9, 9]


def days_in_month(d: date) -> int:
    if d.month == 12:
        nxt = date(d.year + 1, 1, 1)
    else:
        nxt = date(d.year, d.month + 1, 1)
    return (nxt - d).days


def sql_str(value) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def sql_val(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int,)):
        return str(value)
    if isinstance(value, float):
        return f"{value:.2f}"
    if isinstance(value, date):
        return sql_str(value.isoformat())
    return sql_str(value)


def insert_stmt(table: str, columns, rows) -> str:
    col_list = ", ".join(columns)
    lines = [f"INSERT INTO demo_retail.{table} ({col_list}) VALUES"]
    value_lines = []
    for row in rows:
        value_lines.append("    (" + ", ".join(sql_val(v) for v in row) + ")")
    lines.append(",\n".join(value_lines) + ";")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# customers
# ---------------------------------------------------------------------------

N_CUSTOMERS = 75

weighted_regions = []
for region, weight in REGION_CUSTOMER_WEIGHTS.items():
    weighted_regions.extend([region] * weight)

customers = []
used_names = set()
signup_start = date(2023, 6, 1)
signup_span_days = (date(2025, 6, 1) - signup_start).days

for cid in range(1, N_CUSTOMERS + 1):
    while True:
        first = FIRST_NAMES[rng.randrange(len(FIRST_NAMES))]
        last = LAST_NAMES[rng.randrange(len(LAST_NAMES))]
        full = f"{first} {last}"
        if full not in used_names:
            used_names.add(full)
            break
    email = f"{first.lower()}.{last.lower()}{cid}@example.com"
    segment = rng.choices(SEGMENTS, weights=SEGMENT_WEIGHTS, k=1)[0]
    region = weighted_regions[rng.randrange(len(weighted_regions))]
    signup_date = signup_start + timedelta(days=rng.randrange(signup_span_days))
    customers.append({
        "id": cid, "name": full, "email": email,
        "segment": segment, "signup_date": signup_date, "region": region,
    })

# ---------------------------------------------------------------------------
# addresses (customers -> addresses is the one EXPLICIT FK on this table)
# ---------------------------------------------------------------------------

N_EXTRA_ADDRESSES = 15  # customers who get a 2nd (shipping) address
addresses = []
customer_addresses = {c["id"]: [] for c in customers}
address_id = 1

for c in customers:
    state = rng.choice(REGION_STATES[c["region"]])
    city = rng.choice(REGION_CITIES[c["region"]])
    postal = f"{rng.randrange(10000, 99999)}"
    addresses.append({
        "id": address_id, "customer_id": c["id"], "city": city, "state": state,
        "postal_code": postal, "country": "USA", "address_type": "billing",
    })
    customer_addresses[c["id"]].append(address_id)
    address_id += 1

extra_customers = [c for i, c in enumerate(customers) if i % 5 == 0][:N_EXTRA_ADDRESSES]
for c in extra_customers:
    state = rng.choice(REGION_STATES[c["region"]])
    city = rng.choice(REGION_CITIES[c["region"]])
    postal = f"{rng.randrange(10000, 99999)}"
    addresses.append({
        "id": address_id, "customer_id": c["id"], "city": city, "state": state,
        "postal_code": postal, "country": "USA", "address_type": "shipping",
    })
    customer_addresses[c["id"]].append(address_id)
    address_id += 1

# ---------------------------------------------------------------------------
# categories
# ---------------------------------------------------------------------------

categories = [
    {"id": i + 1, "name": name, "department": dept}
    for i, (name, dept) in enumerate(CATEGORIES)
]

# ---------------------------------------------------------------------------
# suppliers
# ---------------------------------------------------------------------------

N_SUPPLIERS = 20
suppliers = []
used_supplier_names = set()
for sid in range(1, N_SUPPLIERS + 1):
    while True:
        name = f"{rng.choice(SUPPLIER_NAME_STEMS)} {rng.choice(SUPPLIER_SUFFIXES)}"
        if name not in used_supplier_names:
            used_supplier_names.add(name)
            break
    region = rng.choice(REGIONS)
    rating = round(rng.uniform(2.5, 5.0), 1)
    suppliers.append({"id": sid, "name": name, "region": region, "rating": rating})

# ---------------------------------------------------------------------------
# products (category_id EXPLICIT FK, supplier_id UNDECLARED)
# ---------------------------------------------------------------------------

N_PRODUCTS = 90
PRODUCT_ADJECTIVES = [
    "Classic", "Premium", "Compact", "Deluxe", "Essential", "Pro", "Everyday",
    "Modern", "Heavy-Duty", "Portable", "Ultra", "Signature", "Basic", "Advanced",
]
PRODUCT_NOUNS = {
    "Electronics": ["Wireless Earbuds", "Bluetooth Speaker", "USB-C Charger", "Laptop Stand",
                    "Smart Watch", "Webcam", "Power Bank", "Noise-Cancelling Headphones"],
    "Furniture": ["Office Chair", "Standing Desk", "Bookshelf", "Filing Cabinet",
                  "Sofa", "Coffee Table", "Bed Frame"],
    "Office Supplies": ["Notebook", "Stapler", "Desk Organizer", "Sticky Notes",
                         "Ballpoint Pen Set", "Whiteboard", "Binder Clips"],
    "Clothing": ["Cotton T-Shirt", "Denim Jacket", "Running Shoes", "Wool Sweater",
                 "Rain Jacket", "Chino Pants"],
    "Home & Kitchen": ["Blender", "Cookware Set", "Air Fryer", "Coffee Maker",
                        "Cutlery Set", "Storage Containers"],
    "Sports & Outdoors": ["Yoga Mat", "Camping Tent", "Water Bottle", "Hiking Backpack",
                           "Dumbbell Set", "Bicycle Helmet"],
    "Books & Media": ["Hardcover Novel", "Cookbook", "Puzzle Set", "Vinyl Record",
                       "Board Game", "Journal"],
    "Beauty & Personal Care": ["Face Serum", "Shampoo Bar", "Electric Toothbrush",
                                "Moisturizer", "Perfume", "Hair Dryer"],
    "Toys & Games": ["Building Blocks", "Remote Control Car", "Card Game", "Plush Toy",
                      "Action Figure", "Puzzle Cube"],
    "Grocery": ["Organic Coffee", "Trail Mix", "Olive Oil", "Pasta Pack",
                "Herbal Tea", "Granola Bars"],
}

products = []
category_cycle = []
for cat in categories:
    category_cycle.extend([cat["id"]] * 9)  # 10 categories * 9 = 90 products
rng.shuffle(category_cycle)

for pid in range(1, N_PRODUCTS + 1):
    category_id = category_cycle[pid - 1]
    category_name = next(c["name"] for c in categories if c["id"] == category_id)
    supplier_id = rng.randrange(1, N_SUPPLIERS + 1)
    noun = rng.choice(PRODUCT_NOUNS[category_name])
    adjective = rng.choice(PRODUCT_ADJECTIVES)
    product_name = f"{adjective} {noun}"

    econ = CATEGORY_ECONOMICS[category_name]
    low, high = econ["price_range"]
    unit_price = round(rng.uniform(low, high), 2)
    cost_low, cost_high = econ["cost_ratio"]
    cost_price = round(unit_price * rng.uniform(cost_low, cost_high), 2)
    stock_quantity = rng.randrange(5, 500)

    products.append({
        "id": pid, "name": product_name, "category_id": category_id,
        "supplier_id": supplier_id, "unit_price": unit_price,
        "cost_price": cost_price, "stock_quantity": stock_quantity,
    })

# A handful of deliberately loss-making-on-clearance products (low price,
# high relative cost) so heavily discounted order_items show negative margin.
CLEARANCE_PRODUCT_IDS = {products[i]["id"] for i in (4, 19, 33, 47, 61, 75)}
for p in products:
    if p["id"] in CLEARANCE_PRODUCT_IDS:
        p["cost_price"] = round(p["unit_price"] * rng.uniform(0.88, 0.97), 2)

# ---------------------------------------------------------------------------
# orders + order_items (order_items generated first, per order, then rolled
# up into the order header so amounts are always internally consistent)
# ---------------------------------------------------------------------------

N_ORDERS = 100

# Build the customer sequence: ~15 frequent/high-value customers ordering
# multiple times, the rest ordering at most once (repeat vs one-time mix).
frequent_customers = [c["id"] for c in customers if c["segment"] in ("Premium", "Corporate")][:15]
other_customers = [c["id"] for c in customers if c["id"] not in frequent_customers]
rng.shuffle(other_customers)

customer_sequence = []
for cid in frequent_customers:
    bias = SEGMENT_ORDER_BIAS[next(c["segment"] for c in customers if c["id"] == cid)]
    customer_sequence.extend([cid] * min(bias, 4))
remaining_slots = N_ORDERS - len(customer_sequence)
customer_sequence.extend(other_customers[:remaining_slots])
while len(customer_sequence) < N_ORDERS:
    customer_sequence.append(rng.choice(other_customers))
customer_sequence = customer_sequence[:N_ORDERS]
rng.shuffle(customer_sequence)

# Build the month assignment for each order from the weighted month list.
month_sequence = []
for month_start, weight in zip(ORDER_MONTHS, ORDER_MONTH_WEIGHTS):
    month_sequence.extend([month_start] * weight)
while len(month_sequence) < N_ORDERS:
    month_sequence.append(ORDER_MONTHS[-1])
month_sequence = month_sequence[:N_ORDERS]
rng.shuffle(month_sequence)

status_sequence = rng.choices(ORDER_STATUSES, weights=ORDER_STATUS_WEIGHTS, k=N_ORDERS)

# Best-selling products get picked more often than the long tail.
product_weight_pool = []
for p in products:
    weight = 6 if p["id"] % 7 == 0 else rng.randrange(1, 4)
    product_weight_pool.extend([p["id"]] * weight)

orders = []
order_items = []
order_item_id = 1

for i in range(N_ORDERS):
    order_id = i + 1
    customer_id = customer_sequence[i]
    month_start = month_sequence[i]
    order_date = month_start + timedelta(days=rng.randrange(0, days_in_month(month_start)))
    status = status_sequence[i]
    shipping_address_id = rng.choice(customer_addresses[customer_id])

    n_items = rng.choices([1, 2, 3, 4], weights=[25, 40, 25, 10], k=1)[0]
    chosen_product_ids = set()
    subtotal = 0.0
    discount_total = 0.0

    # Discount tier: mostly light, some moderate, a few heavy (weaker margin).
    discount_tier = rng.choices(
        ["light", "moderate", "heavy"], weights=[70, 22, 8], k=1
    )[0]

    for _ in range(n_items):
        product_id = product_weight_pool[rng.randrange(len(product_weight_pool))]
        while product_id in chosen_product_ids and len(chosen_product_ids) < len(products):
            product_id = product_weight_pool[rng.randrange(len(product_weight_pool))]
        chosen_product_ids.add(product_id)

        product = next(p for p in products if p["id"] == product_id)
        quantity = rng.randrange(1, 6)

        if discount_tier == "light":
            item_discount_pct = rng.uniform(0.0, 0.10)
        elif discount_tier == "moderate":
            item_discount_pct = rng.uniform(0.20, 0.30)
        else:
            item_discount_pct = rng.uniform(0.35, 0.55)

        unit_price = product["unit_price"]
        line_subtotal = round(unit_price * quantity, 2)
        line_discount = round(line_subtotal * item_discount_pct, 2)

        order_items.append({
            "id": order_item_id, "order_id": order_id, "product_id": product_id,
            "quantity": quantity, "unit_price": unit_price, "discount": line_discount,
        })
        order_item_id += 1

        subtotal += line_subtotal
        discount_total += line_discount

    total_amount = round(subtotal - discount_total, 2)
    orders.append({
        "id": order_id, "customer_id": customer_id, "order_date": order_date,
        "status": status, "shipping_address_id": shipping_address_id,
        "discount_amount": round(discount_total, 2), "total_amount": total_amount,
    })

# ---------------------------------------------------------------------------
# payments (order_id UNDECLARED FK)
# ---------------------------------------------------------------------------

payments = []
payment_id = 1

# A handful of orders get an extra failed attempt before the real payment,
# to add realistic noise and push the row count up toward ~110.
RETRY_ORDER_IDS = {orders[i]["id"] for i in range(0, N_ORDERS, 11)}  # ~9 orders

for order in orders:
    payment_date = order["order_date"] + timedelta(days=rng.randrange(0, 2))
    method = rng.choices(PAYMENT_METHODS, weights=PAYMENT_METHOD_WEIGHTS, k=1)[0]

    if order["id"] in RETRY_ORDER_IDS and order["status"] != "Cancelled":
        payments.append({
            "id": payment_id, "order_id": order["id"], "payment_date": payment_date,
            "method": method, "status": "Failed", "amount": order["total_amount"],
        })
        payment_id += 1
        payment_date = payment_date + timedelta(days=1)

    if order["status"] == "Cancelled":
        status = rng.choice(["Failed", "Refunded"])
    elif order["status"] == "Returned":
        status = "Refunded"
    else:
        status = "Completed"

    payments.append({
        "id": payment_id, "order_id": order["id"], "payment_date": payment_date,
        "method": method, "status": status, "amount": order["total_amount"],
    })
    payment_id += 1

# ---------------------------------------------------------------------------
# shipments (order_id UNDECLARED FK) - only orders that actually shipped
# ---------------------------------------------------------------------------

shipments = []
shipment_id = 1
SHIPPABLE_STATUSES = {"Shipped", "Delivered", "Returned"}
LOST_SHIPMENT_ORDER_IDS = {orders[i]["id"] for i in range(3, N_ORDERS, 23)}  # a couple of anomalies

for order in orders:
    if order["status"] not in SHIPPABLE_STATUSES:
        continue

    shipped_date = order["order_date"] + timedelta(days=rng.randrange(1, 4))
    method = rng.choice(SHIPPING_METHODS)

    if order["id"] in LOST_SHIPMENT_ORDER_IDS:
        shipments.append({
            "id": shipment_id, "order_id": order["id"], "shipped_date": shipped_date,
            "delivery_date": None, "method": method, "status": "Lost",
        })
        shipment_id += 1
        continue

    if order["status"] == "Shipped":
        # still in transit as of "today" in the demo's timeline - no delivery yet
        delivery_date = None
        status = "In Transit"
    elif order["status"] == "Returned":
        delivery_date = shipped_date + timedelta(days=rng.randrange(2, 8))
        status = "Returned"
    else:
        delivery_date = shipped_date + timedelta(days=rng.randrange(2, 8))
        status = "Delivered"

    shipments.append({
        "id": shipment_id, "order_id": order["id"], "shipped_date": shipped_date,
        "delivery_date": delivery_date, "method": method, "status": status,
    })
    shipment_id += 1

# ---------------------------------------------------------------------------
# render SQL
# ---------------------------------------------------------------------------

def render() -> str:
    parts = []
    parts.append("""\
-- Stratum public demo dataset (schema: demo_retail)
-- Generated deterministically by demo/generate_demo_dataset.py (seed=42).
-- Do not hand-edit; regenerate with: python demo/generate_demo_dataset.py
--
-- Loaded by demo/load_demo.py, which recreates the demo_retail schema from
-- scratch. This script only ever operates inside demo_retail; it never
-- touches the public schema used by Stratum's own application tables.

DROP SCHEMA IF EXISTS demo_retail CASCADE;
CREATE SCHEMA demo_retail;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

CREATE TABLE demo_retail.customers (
    customer_id     INTEGER PRIMARY KEY,
    customer_name   VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    customer_segment VARCHAR(30) NOT NULL,
    signup_date     DATE NOT NULL,
    region          VARCHAR(30) NOT NULL
);

CREATE TABLE demo_retail.addresses (
    address_id      INTEGER PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES demo_retail.customers(customer_id),
    city            VARCHAR(60) NOT NULL,
    state           VARCHAR(30) NOT NULL,
    postal_code     VARCHAR(15) NOT NULL,
    country         VARCHAR(50) NOT NULL,
    address_type    VARCHAR(20) NOT NULL
);

CREATE TABLE demo_retail.categories (
    category_id     INTEGER PRIMARY KEY,
    category_name   VARCHAR(60) NOT NULL,
    department      VARCHAR(60) NOT NULL
);

CREATE TABLE demo_retail.suppliers (
    supplier_id     INTEGER PRIMARY KEY,
    supplier_name   VARCHAR(100) NOT NULL,
    supplier_region VARCHAR(30) NOT NULL,
    supplier_rating NUMERIC(2,1) NOT NULL
);

-- supplier_id is intentionally NOT a declared foreign key (see README).
CREATE TABLE demo_retail.products (
    product_id      INTEGER PRIMARY KEY,
    product_name    VARCHAR(120) NOT NULL,
    category_id     INTEGER NOT NULL REFERENCES demo_retail.categories(category_id),
    supplier_id     INTEGER NOT NULL,
    unit_price      NUMERIC(10,2) NOT NULL,
    cost_price      NUMERIC(10,2) NOT NULL,
    stock_quantity  INTEGER NOT NULL
);

-- customer_id and shipping_address_id are intentionally NOT declared
-- foreign keys (see README).
CREATE TABLE demo_retail.orders (
    order_id            INTEGER PRIMARY KEY,
    customer_id         INTEGER NOT NULL,
    order_date          DATE NOT NULL,
    order_status        VARCHAR(20) NOT NULL,
    shipping_address_id INTEGER NOT NULL,
    discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(10,2) NOT NULL
);

-- product_id is intentionally NOT a declared foreign key (see README).
CREATE TABLE demo_retail.order_items (
    order_item_id   INTEGER PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES demo_retail.orders(order_id),
    product_id      INTEGER NOT NULL,
    quantity        INTEGER NOT NULL,
    unit_price      NUMERIC(10,2) NOT NULL,
    discount        NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- order_id is intentionally NOT a declared foreign key (see README).
CREATE TABLE demo_retail.payments (
    payment_id      INTEGER PRIMARY KEY,
    order_id        INTEGER NOT NULL,
    payment_date    DATE NOT NULL,
    payment_method  VARCHAR(30) NOT NULL,
    payment_status  VARCHAR(20) NOT NULL,
    amount          NUMERIC(10,2) NOT NULL
);

-- order_id is intentionally NOT a declared foreign key (see README).
CREATE TABLE demo_retail.shipments (
    shipment_id     INTEGER PRIMARY KEY,
    order_id        INTEGER NOT NULL,
    shipped_date    DATE,
    delivery_date   DATE,
    shipping_method VARCHAR(30) NOT NULL,
    shipment_status VARCHAR(20) NOT NULL
);

-- ---------------------------------------------------------------------
-- Data
-- ---------------------------------------------------------------------
""")

    parts.append(insert_stmt(
        "customers",
        ["customer_id", "customer_name", "email", "customer_segment", "signup_date", "region"],
        [(c["id"], c["name"], c["email"], c["segment"], c["signup_date"], c["region"]) for c in customers],
    ))
    parts.append(insert_stmt(
        "addresses",
        ["address_id", "customer_id", "city", "state", "postal_code", "country", "address_type"],
        [(a["id"], a["customer_id"], a["city"], a["state"], a["postal_code"], a["country"], a["address_type"]) for a in addresses],
    ))
    parts.append(insert_stmt(
        "categories",
        ["category_id", "category_name", "department"],
        [(c["id"], c["name"], c["department"]) for c in categories],
    ))
    parts.append(insert_stmt(
        "suppliers",
        ["supplier_id", "supplier_name", "supplier_region", "supplier_rating"],
        [(s["id"], s["name"], s["region"], s["rating"]) for s in suppliers],
    ))
    parts.append(insert_stmt(
        "products",
        ["product_id", "product_name", "category_id", "supplier_id", "unit_price", "cost_price", "stock_quantity"],
        [(p["id"], p["name"], p["category_id"], p["supplier_id"], p["unit_price"], p["cost_price"], p["stock_quantity"]) for p in products],
    ))
    parts.append(insert_stmt(
        "orders",
        ["order_id", "customer_id", "order_date", "order_status", "shipping_address_id", "discount_amount", "total_amount"],
        [(o["id"], o["customer_id"], o["order_date"], o["status"], o["shipping_address_id"], o["discount_amount"], o["total_amount"]) for o in orders],
    ))
    parts.append(insert_stmt(
        "order_items",
        ["order_item_id", "order_id", "product_id", "quantity", "unit_price", "discount"],
        [(oi["id"], oi["order_id"], oi["product_id"], oi["quantity"], oi["unit_price"], oi["discount"]) for oi in order_items],
    ))
    parts.append(insert_stmt(
        "payments",
        ["payment_id", "order_id", "payment_date", "payment_method", "payment_status", "amount"],
        [(p["id"], p["order_id"], p["payment_date"], p["method"], p["status"], p["amount"]) for p in payments],
    ))
    parts.append(insert_stmt(
        "shipments",
        ["shipment_id", "order_id", "shipped_date", "delivery_date", "shipping_method", "shipment_status"],
        [(s["id"], s["order_id"], s["shipped_date"], s["delivery_date"], s["method"], s["status"]) for s in shipments],
    ))

    return "\n\n".join(parts) + "\n"


def main() -> None:
    sql = render()
    OUT_PATH.write_text(sql, encoding="utf-8", newline="\n")
    print(f"wrote {OUT_PATH}")
    print(f"customers={len(customers)} addresses={len(addresses)} categories={len(categories)} "
          f"suppliers={len(suppliers)} products={len(products)} orders={len(orders)} "
          f"order_items={len(order_items)} payments={len(payments)} shipments={len(shipments)}")


if __name__ == "__main__":
    main()
