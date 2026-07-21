LOGISTICS_KPIS = [
    {
        "name": "Total Shipments",
        "description": "Total number of shipments processed.",
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
        "name": "Total Shipment Value",
        "description": "Total monetary value of all shipments.",
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "value", "amount", "cost", "freight",
            "charge", "rate", "price"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Average Shipment Value",
        "description": "Average value per shipment.",
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "value", "amount", "cost", "freight", "charge"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Unique Destinations",
        "description": "Number of unique delivery destinations served.",
        "category": "Coverage",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "destination_id", "address_id", "location_id",
            "city_id", "zip_code", "postal_code"
        ],
        "date_required": False,
    },
]