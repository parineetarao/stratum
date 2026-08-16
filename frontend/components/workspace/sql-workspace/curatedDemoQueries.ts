/**
 * Mirrors backend/app/demo/curated_queries.py — display copy only. The
 * backend is the enforcement boundary (it resolves SQL from `query_id`
 * server-side and ignores whatever the client sends), this list exists
 * purely so the demo SQL Workspace can show readable cards/preview text
 * without a network round trip.
 */
export interface CuratedDemoQuery {
  id: string;
  title: string;
  sql: string;
}

export const CURATED_DEMO_QUERIES: CuratedDemoQuery[] = [
  {
    id: 'demo_revenue_by_state',
    title: 'Revenue by State',
    sql: `SELECT
    a.state AS state,
    ROUND(SUM(o.total_amount), 2) AS revenue
FROM demo_retail.orders o
JOIN demo_retail.addresses a
    ON o.shipping_address_id = a.address_id
GROUP BY a.state
ORDER BY revenue DESC
LIMIT 200`,
  },
  {
    id: 'demo_top_categories',
    title: 'Top Product Categories',
    sql: `SELECT
    c.category_name AS category,
    ROUND(
        SUM(
            oi.quantity *
            oi.unit_price *
            (1 - oi.discount / 100.0)
        ),
        2
    ) AS revenue
FROM demo_retail.order_items oi
JOIN demo_retail.products p
    ON oi.product_id = p.product_id
JOIN demo_retail.categories c
    ON p.category_id = c.category_id
GROUP BY c.category_name
ORDER BY revenue DESC
LIMIT 200`,
  },
  {
    id: 'demo_order_status',
    title: 'Order Status Distribution',
    sql: `SELECT
    order_status AS status,
    COUNT(*) AS orders
FROM demo_retail.orders
GROUP BY order_status
ORDER BY orders DESC
LIMIT 200`,
  },
  {
    id: 'demo_revenue_trend',
    title: 'Revenue Trend',
    sql: `SELECT
    DATE_TRUNC('month', order_date) AS month,
    ROUND(SUM(total_amount), 2) AS revenue
FROM demo_retail.orders
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month
LIMIT 200`,
  },
  {
    id: 'demo_customers_by_region',
    title: 'Customers by Region',
    sql: `SELECT
    region AS region,
    COUNT(*) AS customers
FROM demo_retail.customers
GROUP BY region
ORDER BY customers DESC
LIMIT 200`,
  },
];
