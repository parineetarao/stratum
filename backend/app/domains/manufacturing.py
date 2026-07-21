MANUFACTURING_KPIS = [
    {
        "name": "Total Units Produced",
        "description": "Total units produced across all production runs.",
        "category": "Production",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "units_produced", "quantity", "produced",
            "output", "manufactured", "units"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Production Runs",
        "description": "Total number of production runs or batches.",
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
        "name": "Average Units Per Run",
        "description": "Average units produced per production run.",
        "category": "Production",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "units_produced", "quantity", "output", "units"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Defective Units",
        "description": "Total defective or rejected units across all runs.",
        "category": "Quality",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "defective", "defect", "rejected", "scrap",
            "waste", "failed"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
]