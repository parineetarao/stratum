SAAS_KPIS = [
    {
        "name": "Total Accounts",
        "description": (
            "Total number of unique customer accounts, organizations, or "
            "tenants registered. Measures customer base size."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["account", "organization", "tenant", "company"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "account_id", "org_id", "tenant_id", "company_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Users",
        "description": (
            "Total number of user records in the system. "
            "Measures overall user base size."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["user", "member"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "user_id", "member_id"
        ],
        "date_required": False,
    },
    {
        "name": "Subscription Revenue",
        "description": (
            "Total recurring revenue collected across all subscriptions. "
            "Core SaaS revenue metric."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "mrr", "arr", "subscription_amount", "revenue",
            "amount", "billing_amount"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Subscription Count",
        "description": (
            "Total number of subscription records. "
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
        "name": "Average Revenue Per Account",
        "description": (
            "Average subscription revenue attributed to each unique "
            "account. Key SaaS unit-economics metric (ARPA)."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "mrr", "arr", "subscription_amount", "revenue", "amount"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "account_id", "org_id", "tenant_id", "company_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Subscription Value",
        "description": (
            "Average monetary value per subscription record. "
            "Indicates typical plan pricing."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "mrr", "arr", "subscription_amount", "amount"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Maximum Subscription Value",
        "description": (
            "Highest single subscription value recorded. "
            "Identifies top-tier or enterprise plans."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "mrr", "arr", "subscription_amount", "amount"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Unique Subscribed Accounts",
        "description": (
            "Number of distinct accounts with at least one subscription "
            "record. Measures paying-account reach."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "account_id", "org_id", "tenant_id", "company_id"
        ],
        "date_required": False,
    },
    {
        "name": "Subscriptions Per Account",
        "description": (
            "Average number of subscription records per account. "
            "Measures plan/seat expansion within accounts."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "account_id", "org_id", "tenant_id", "company_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Invoices",
        "description": (
            "Total number of billing invoices generated. "
            "Measures billing operations volume."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["invoice", "billing"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "invoice_id", "billing_id"
        ],
        "date_required": False,
    },
    {
        "name": "Churn Rate",
        "description": (
            "Percentage of subscriptions with a status explicitly marked "
            "as cancelled or churned. Core SaaS retention metric."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["subscription_status", "status"],
        "target_value_aliases": ["cancelled", "canceled", "churned"],
        "date_required": False,
    },
]
