ECOMMERCE_KPIS = [
    {
        "name": "Total Revenue",
        "description": (
            "Sum of all order/transaction amounts. "
            "Core revenue metric for the storefront."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "total", "amount", "order_total",
            "net_amount", "gross_amount", "sale_value", "payment_amount"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Orders",
        "description": (
            "Total number of orders placed. "
            "Measures storefront transaction volume."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Average Order Value",
        "description": (
            "Average monetary value per order. "
            "Indicates typical customer spend per purchase."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "total", "amount", "order_total", "net_amount"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Units Sold",
        "description": (
            "Total number of product units sold across all orders. "
            "Measures sales volume independent of price."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "quantity", "units", "qty", "units_sold", "item_quantity"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Unique Customers",
        "description": (
            "Number of distinct customers who have placed an order. "
            "Measures active customer base size."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "customer_id", "buyer_id", "user_id", "shopper_id"
        ],
        "date_required": False,
    },
    {
        "name": "Revenue Per Customer",
        "description": (
            "Average total revenue generated per unique customer. "
            "Key indicator of customer lifetime value."
        ),
        "category": "Customers",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "total", "amount", "order_total"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "customer_id", "buyer_id", "user_id"
        ],
        "date_required": False,
    },
    {
        "name": "Product Count",
        "description": (
            "Total number of unique products in the catalog. "
            "Measures product offering breadth."
        ),
        "category": "Inventory",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["product", "item", "sku", "catalog"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "product_id", "item_id", "sku_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Items Per Order",
        "description": (
            "Average number of line items per order. "
            "Measures basket size and cross-sell effectiveness."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "order_id", "cart_id"
        ],
        "date_required": False,
    },
    {
        "name": "Maximum Order Value",
        "description": (
            "Highest single order value recorded. "
            "Identifies peak-value purchases."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "total", "amount", "order_total"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Discount Given",
        "description": (
            "Total value of discounts or coupons applied across orders. "
            "Measures promotional cost."
        ),
        "category": "Costs",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "discount", "discount_amount", "coupon_amount", "promo_amount"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Return Rate",
        "description": (
            "Percentage of orders marked with a returned status. "
            "Key indicator of product/fit quality issues."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["order_status", "status"],
        "target_value_aliases": ["returned", "return"],
        "date_required": False,
    },
    {
        "name": "Cancellation Rate",
        "description": (
            "Percentage of orders marked as cancelled. "
            "Indicates checkout or fulfillment friction."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["order_status", "status"],
        "target_value_aliases": ["cancelled", "canceled"],
        "date_required": False,
    },
]
