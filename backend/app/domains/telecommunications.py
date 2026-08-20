TELECOMMUNICATIONS_KPIS = [
    {
        "name": "Total Subscribers",
        "description": (
            "Total number of unique subscribers registered. "
            "Measures the size of the subscriber base."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["subscriber", "customer", "account"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "subscriber_id", "customer_id", "account_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Revenue",
        "description": (
            "Sum of all billed revenue across subscriber accounts. "
            "Core telecom revenue metric."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "amount", "billing_amount", "charge_amount", "payment_amount"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Average Revenue Per Subscriber",
        "description": (
            "Average billed revenue per unique subscriber. "
            "Key telecom unit-economics metric (ARPU)."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "amount", "billing_amount", "charge_amount"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "subscriber_id", "customer_id", "account_id"
        ],
        "date_required": False,
    },
    {
        "name": "Subscription Count",
        "description": (
            "Total number of subscription/plan records. "
            "Measures overall subscription volume."
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
        "name": "Maximum Revenue",
        "description": (
            "Highest single billed revenue amount recorded. "
            "Identifies top-spending subscriber accounts."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "amount", "billing_amount", "charge_amount"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Data Usage",
        "description": (
            "Total data consumption recorded across all usage records. "
            "Measures network load from data services."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "data_usage", "data_consumed", "mb_used", "gb_used", "usage"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Average Usage Per Subscriber",
        "description": (
            "Average data or service usage attributed to each unique "
            "subscriber. Indicates typical consumption behavior."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "data_usage", "data_consumed", "mb_used", "gb_used", "usage"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "subscriber_id", "customer_id", "account_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Call Minutes",
        "description": (
            "Total voice call minutes recorded across usage records. "
            "Measures voice network load."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "call_minutes", "minutes_used", "voice_usage", "talk_time"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Unique Subscribers With Usage",
        "description": (
            "Number of distinct subscribers with at least one recorded "
            "usage entry. Measures active service consumption reach."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "subscriber_id", "customer_id", "account_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Plans",
        "description": (
            "Total number of unique plans, packages, or tariffs offered. "
            "Measures product/plan catalog breadth."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["plan", "package", "tariff"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "plan_id", "package_id", "tariff_id"
        ],
        "date_required": False,
    },
    {
        "name": "Subscriber Churn Rate",
        "description": (
            "Percentage of subscriptions with a status explicitly marked "
            "as cancelled, disconnected, or churned. Core telecom retention metric."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["subscription_status", "status"],
        "target_value_aliases": ["cancelled", "canceled", "churned", "disconnected"],
        "date_required": False,
    },
]
