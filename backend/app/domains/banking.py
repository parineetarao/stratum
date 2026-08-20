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
        "name": "Minimum Transaction Amount",
        "description": (
            "Lowest individual transaction amount. "
            "Useful for detecting micro-transactions or data anomalies."
        ),
        "category": "Risk",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "value", "balance", "debit", "credit"
        ],
        "measure_type": "numeric",
        "aggregation": "MIN",
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
    {
        "name": "Average Balance Per Account",
        "description": (
            "Average transaction balance attributed to each unique account. "
            "Indicates typical account-level activity."
        ),
        "category": "Volume",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "balance", "amount", "value"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "account_id", "acct_id", "customer_id"
        ],
        "date_required": False,
    },
    {
        "name": "Transactions Per Account",
        "description": (
            "Average number of transactions per account. "
            "Measures account engagement frequency."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "account_id", "acct_id", "customer_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Loan Amount",
        "description": (
            "Total principal amount across all loans issued. "
            "Measures lending portfolio size."
        ),
        "category": "Risk",
        "unit": "currency",
        "requires_fact_table": False,
        "table_keywords": ["loan", "lending", "credit_facility"],
        "measure_keywords": [
            "loan_amount", "principal", "amount", "value"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Loan Default Rate",
        "description": (
            "Percentage of loans marked as defaulted. "
            "Key credit-risk indicator for the lending portfolio."
        ),
        "category": "Risk",
        "unit": "percentage",
        "requires_fact_table": False,
        "table_keywords": ["loan", "lending", "credit_facility"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["loan_status", "status"],
        "target_value_aliases": ["default", "defaulted"],
        "date_required": False,
    },
]
