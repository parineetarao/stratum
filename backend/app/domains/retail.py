RETAIL_KPIS = [
    {
        "name": "Total Revenue",
        "description": (
            "Sum of all monetary transactions. "
            "Core revenue metric measuring total business income."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "price", "revenue", "total", "value",
            "cost", "fee", "sale", "income", "payment"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Transactions",
        "description": (
            "Total number of individual transactions processed. "
            "Measures business volume and activity level."
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
        "name": "Average Transaction Value",
        "description": (
            "Average monetary value per transaction. "
            "Indicates typical customer spend per interaction."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "price", "revenue", "total", "value",
            "cost", "fee", "sale", "income", "payment"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Unique Customers",
        "description": (
            "Number of distinct customers who have transacted. "
            "Measures active customer base size."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "customer_id", "client_id", "buyer_id",
            "user_id", "member_id", "account_id"
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
            "amount", "price", "revenue", "total", "value",
            "cost", "fee", "sale"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "customer_id", "client_id", "buyer_id", "user_id"
        ],
        "date_required": False,
    },
    {
        "name": "Transactions Per Customer",
        "description": (
            "Average number of transactions per customer. "
            "Measures customer loyalty and repeat behaviour."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "customer_id", "client_id", "buyer_id", "user_id"
        ],
        "date_required": False,
    },
    {
        "name": "Maximum Transaction Value",
        "description": (
            "Highest single transaction amount recorded. "
            "Identifies peak revenue events and outliers."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "price", "revenue", "total", "value", "sale"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Products",
        "description": (
            "Total number of unique products in the catalogue. "
            "Measures product offering breadth."
        ),
        "category": "Inventory",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": [
            "product", "item", "sku", "film",
            "merchandise", "goods", "catalog"
        ],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "product_id", "item_id", "sku_id",
            "film_id", "goods_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Customers",
        "description": (
            "Total number of customers in the system. "
            "Measures the size of the customer base."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": [
            "customer", "client", "buyer",
            "member", "user", "account"
        ],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "customer_id", "client_id", "buyer_id",
            "member_id", "user_id"
        ],
        "date_required": False,
    },
    {
        "name": "Null Return Rate",
        "description": (
            "Percentage of transactions with missing return or "
            "completion data. Indicates data completeness issues."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "NULL_RATE",
        "identifier_keywords": None,
        "null_column_keywords": [
            "return_date", "end_date", "completed_at",
            "closed_at", "delivered_at"
        ],
        "date_required": False,
    },
    {
        "name": "Inventory Value",
        "description": (
            "Total monetary value of current inventory or stock on hand. "
            "Measures capital tied up in unsold goods."
        ),
        "category": "Inventory",
        "unit": "currency",
        "requires_fact_table": False,
        "table_keywords": ["inventory", "stock", "warehouse_stock"],
        "measure_keywords": [
            "value", "cost", "price", "amount", "stock_value"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Order Cancellation Rate",
        "description": (
            "Percentage of orders marked as cancelled. "
            "Indicates fulfillment or customer-satisfaction issues."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["order_status", "status"],
        "target_value_aliases": ["cancelled", "canceled", "cancel"],
        "date_required": False,
    },
]