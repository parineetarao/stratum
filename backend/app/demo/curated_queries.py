"""
Trusted, backend-resolved SQL for the public read-only demo project
("Retail Analytics Demo", backed by the demo_retail Postgres schema).

The frontend never sends SQL text for these — it sends a query_id, and the
backend resolves the actual statement from this map. This is what makes the
public demo's SQL Workspace safe: the browser cannot influence what gets
executed against the demo Postgres connection.
"""

CURATED_DEMO_QUERIES = {
    "demo_revenue_by_state": {
        "title": "Revenue by State",
        "sql": (
            "SELECT\n"
            "    a.state AS state,\n"
            "    ROUND(SUM(o.total_amount), 2) AS revenue\n"
            "FROM demo_retail.orders o\n"
            "JOIN demo_retail.addresses a\n"
            "    ON o.shipping_address_id = a.address_id\n"
            "GROUP BY a.state\n"
            "ORDER BY revenue DESC\n"
            "LIMIT 200"
        ),
    },
    "demo_top_categories": {
        "title": "Top Product Categories",
        "sql": (
            "SELECT\n"
            "    c.category_name AS category,\n"
            "    ROUND(\n"
            "        SUM(\n"
            "            oi.quantity *\n"
            "            oi.unit_price *\n"
            "            (1 - oi.discount / 100.0)\n"
            "        ),\n"
            "        2\n"
            "    ) AS revenue\n"
            "FROM demo_retail.order_items oi\n"
            "JOIN demo_retail.products p\n"
            "    ON oi.product_id = p.product_id\n"
            "JOIN demo_retail.categories c\n"
            "    ON p.category_id = c.category_id\n"
            "GROUP BY c.category_name\n"
            "ORDER BY revenue DESC\n"
            "LIMIT 200"
        ),
    },
    "demo_order_status": {
        "title": "Order Status Distribution",
        "sql": (
            "SELECT\n"
            "    order_status AS status,\n"
            "    COUNT(*) AS orders\n"
            "FROM demo_retail.orders\n"
            "GROUP BY order_status\n"
            "ORDER BY orders DESC\n"
            "LIMIT 200"
        ),
    },
    "demo_revenue_trend": {
        "title": "Revenue Trend",
        "sql": (
            "SELECT\n"
            "    DATE_TRUNC('month', order_date) AS month,\n"
            "    ROUND(SUM(total_amount), 2) AS revenue\n"
            "FROM demo_retail.orders\n"
            "GROUP BY DATE_TRUNC('month', order_date)\n"
            "ORDER BY month\n"
            "LIMIT 200"
        ),
    },
    "demo_customers_by_region": {
        "title": "Customers by Region",
        "sql": (
            "SELECT\n"
            "    region AS region,\n"
            "    COUNT(*) AS customers\n"
            "FROM demo_retail.customers\n"
            "GROUP BY region\n"
            "ORDER BY customers DESC\n"
            "LIMIT 200"
        ),
    },
}

DEMO_ROW_LIMIT = 200


def get_curated_query(query_id: str):
    return CURATED_DEMO_QUERIES.get(query_id)


def list_curated_queries():
    return [
        {"id": qid, "title": q["title"], "sql": q["sql"]}
        for qid, q in CURATED_DEMO_QUERIES.items()
    ]
