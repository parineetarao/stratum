HEALTHCARE_KPIS = [
    {
        "name": "Total Patients",
        "description": "Total unique patients in the system.",
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["patient", "person", "individual", "member"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "patient_id", "person_id", "member_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Appointments",
        "description": "Total appointments or visits recorded.",
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": None,
        "table_keywords": [
            "appointment", "visit", "encounter",
            "consultation", "booking"
        ],
        "date_required": False,
    },
    {
        "name": "Total Billing Amount",
        "description": "Total amount billed across all patient encounters.",
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "bill", "charge", "cost",
            "fee", "payment", "claim"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Average Billing Per Patient",
        "description": "Average amount billed per unique patient.",
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "bill", "charge", "cost", "fee"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "patient_id", "person_id", "member_id"
        ],
        "date_required": False,
    },
]