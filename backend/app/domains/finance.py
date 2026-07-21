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
]