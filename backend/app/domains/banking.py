BANKING_KPIS = [
    {
        "name": "Total Transaction Volume",
        "description": (
            "Sum of all transaction amounts processed. "
            "Primary measure of banking activity."
        ),
        "category": "Volume",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "value", "sum", "balance",
            "debit", "credit", "transfer"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Transactions",
        "description": (
            "Total number of financial transactions. "
            "Measures operational throughput."
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
        "name": "Active Accounts",
        "description": (
            "Number of unique accounts with at least one transaction. "
            "Measures engaged account base."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "account_id", "acct_id", "customer_id",
            "client_id", "member_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Transaction Amount",
        "description": (
            "Average value per financial transaction. "
            "Indicates typical transaction size."
        ),
        "category": "Volume",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "value", "balance", "debit", "credit"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Maximum Transaction Amount",
        "description": (
            "Highest individual transaction amount. "
            "Identifies large transactions for risk monitoring."
        ),
        "category": "Risk",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "value", "balance", "debit", "credit"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Accounts",
        "description": (
            "Total number of accounts in the system. "
            "Measures portfolio size."
        ),
        "category": "Customers",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": [
            "account", "acct", "customer",
            "client", "holder"
        ],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "account_id", "acct_id", "customer_id", "client_id"
        ],
        "date_required": False,
    },
]