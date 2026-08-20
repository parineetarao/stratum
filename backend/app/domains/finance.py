FINANCE_KPIS = [
    {
        "name": "Total Revenue",
        "description": "Total revenue across all financial records.",
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "income", "sales", "amount",
            "receipts", "earnings", "turnover"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Expenses",
        "description": "Total expenses recorded across all entries.",
        "category": "Costs",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "expense", "cost", "expenditure",
            "outflow", "payment", "spend"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Average Transaction Amount",
        "description": "Average value per financial entry.",
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "value", "revenue", "expense", "cost"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Entries",
        "description": "Total number of financial entries recorded.",
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
        "name": "Maximum Transaction Amount",
        "description": (
            "Highest single financial entry recorded. "
            "Identifies large or outlier transactions."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "value", "revenue", "expense", "cost"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Minimum Transaction Amount",
        "description": (
            "Lowest single financial entry recorded. "
            "Useful for spotting anomalies or micro-entries."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "value", "revenue", "expense", "cost"
        ],
        "measure_type": "numeric",
        "aggregation": "MIN",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Unique Accounts",
        "description": (
            "Number of distinct accounts or ledgers with recorded entries. "
            "Measures financial account coverage."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "account_id", "ledger_id", "acct_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Revenue Per Account",
        "description": (
            "Average revenue attributed to each unique account or ledger. "
            "Indicates typical account-level financial contribution."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "revenue", "income", "sales", "amount", "earnings"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "account_id", "ledger_id", "acct_id"
        ],
        "date_required": False,
    },
    {
        "name": "Entries Per Account",
        "description": (
            "Average number of financial entries per account. "
            "Measures account-level activity frequency."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "account_id", "ledger_id", "acct_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Assets",
        "description": (
            "Total recorded value of assets held. "
            "Core balance-sheet strength indicator."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": False,
        "table_keywords": ["asset", "balance_sheet", "holdings"],
        "measure_keywords": [
            "asset_value", "value", "amount", "book_value"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Liabilities",
        "description": (
            "Total recorded value of liabilities owed. "
            "Core balance-sheet obligation indicator."
        ),
        "category": "Costs",
        "unit": "currency",
        "requires_fact_table": False,
        "table_keywords": ["liability", "liabilities", "obligation"],
        "measure_keywords": [
            "liability_amount", "amount", "value", "balance_owed"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
]
