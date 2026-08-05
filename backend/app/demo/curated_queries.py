"""
Trusted, backend-resolved SQL for the public read-only demo project.

The frontend never sends SQL text for these — it sends a query_id, and the
backend resolves the actual statement from this map. This is what makes the
public demo's SQL Workspace safe: the browser cannot influence what gets
executed against the demo Postgres connection.
"""

CURATED_DEMO_QUERIES = {
    "demo_monthly_rentals": {
        "title": "Monthly Rentals",
        "sql": (
            "SELECT date_trunc('month', rental_date)::date AS month, "
            "COUNT(*) AS rental_count\n"
            "FROM rental\n"
            "GROUP BY 1\n"
            "ORDER BY 1\n"
            "LIMIT 200"
        ),
    },
    "demo_top_films": {
        "title": "Top 10 Films by Rentals",
        "sql": (
            "SELECT f.title, COUNT(*) AS rental_count\n"
            "FROM rental r\n"
            "JOIN inventory i ON i.inventory_id = r.inventory_id\n"
            "JOIN film f ON f.film_id = i.film_id\n"
            "GROUP BY f.title\n"
            "ORDER BY rental_count DESC\n"
            "LIMIT 10"
        ),
    },
    "demo_revenue_by_category": {
        "title": "Revenue by Film Category",
        "sql": (
            "SELECT c.name AS category, ROUND(SUM(p.amount)::numeric, 2) AS revenue\n"
            "FROM payment p\n"
            "JOIN rental r ON r.rental_id = p.rental_id\n"
            "JOIN inventory i ON i.inventory_id = r.inventory_id\n"
            "JOIN film_category fc ON fc.film_id = i.film_id\n"
            "JOIN category c ON c.category_id = fc.category_id\n"
            "GROUP BY c.name\n"
            "ORDER BY revenue DESC\n"
            "LIMIT 200"
        ),
    },
    "demo_store_comparison": {
        "title": "Rentals by Store",
        "sql": (
            "SELECT s.store_id, COUNT(*) AS rental_count, "
            "ROUND(SUM(p.amount)::numeric, 2) AS revenue\n"
            "FROM rental r\n"
            "JOIN staff st ON st.staff_id = r.staff_id\n"
            "JOIN store s ON s.store_id = st.store_id\n"
            "LEFT JOIN payment p ON p.rental_id = r.rental_id\n"
            "GROUP BY s.store_id\n"
            "ORDER BY s.store_id\n"
            "LIMIT 200"
        ),
    },
    "demo_customer_activity": {
        "title": "Customer Activity Distribution",
        "sql": (
            "SELECT rental_count, COUNT(*) AS customer_count\n"
            "FROM (\n"
            "  SELECT c.customer_id, COUNT(r.rental_id) AS rental_count\n"
            "  FROM customer c\n"
            "  LEFT JOIN rental r ON r.customer_id = c.customer_id\n"
            "  GROUP BY c.customer_id\n"
            ") per_customer\n"
            "GROUP BY rental_count\n"
            "ORDER BY rental_count\n"
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
