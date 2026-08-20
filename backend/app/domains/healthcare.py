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
    {
        "name": "Unique Patients Seen",
        "description": (
            "Number of distinct patients with at least one recorded "
            "appointment or encounter. Measures active patient reach."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "patient_id", "person_id", "member_id"
        ],
        "date_required": False,
    },
    {
        "name": "Appointments Per Patient",
        "description": (
            "Average number of appointments per unique patient. "
            "Measures care frequency and follow-up load."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "patient_id", "person_id", "member_id"
        ],
        "date_required": False,
    },
    {
        "name": "Maximum Billing Amount",
        "description": (
            "Highest single billing amount recorded. "
            "Identifies high-cost encounters or claims."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "amount", "bill", "charge", "cost", "fee"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Providers",
        "description": (
            "Total number of doctors, physicians, or care providers "
            "in the system. Measures staffing capacity."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["doctor", "physician", "provider", "staff"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "doctor_id", "provider_id", "physician_id", "staff_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Claims",
        "description": (
            "Total number of insurance claims filed. "
            "Measures claims processing volume."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["claim", "insurance_claim"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "claim_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Claim Amount",
        "description": (
            "Average monetary value per insurance claim. "
            "Indicates typical claim cost."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": False,
        "table_keywords": ["claim", "insurance_claim"],
        "measure_keywords": [
            "claim_amount", "amount", "charge", "cost"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Readmission Rate",
        "description": (
            "Percentage of encounters flagged as a readmission. "
            "Key quality-of-care indicator."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["admission_type", "readmission_status", "status"],
        "target_value_aliases": ["readmitted", "readmission", "readmit"],
        "date_required": False,
    },
]
