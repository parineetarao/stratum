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
    {
        "name": "Maximum Shipment Value",
        "description": (
            "Highest single shipment value recorded. "
            "Identifies high-value freight events."
        ),
        "category": "Revenue",
        "unit": "currency",
        "requires_fact_table": True,
        "measure_keywords": [
            "value", "amount", "cost", "freight", "charge"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Shipments Per Destination",
        "description": (
            "Average number of shipments sent to each unique destination. "
            "Measures route/destination load."
        ),
        "category": "Coverage",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "destination_id", "address_id", "location_id", "city_id"
        ],
        "date_required": False,
    },
    {
        "name": "Unique Carriers",
        "description": (
            "Number of distinct carriers or couriers used for shipments. "
            "Measures carrier network diversity."
        ),
        "category": "Coverage",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "carrier_id", "vendor_id", "courier_id", "shipper_id"
        ],
        "date_required": False,
    },
    {
        "name": "Unique Origins",
        "description": (
            "Number of unique origin locations or warehouses shipments "
            "were dispatched from. Measures dispatch network coverage."
        ),
        "category": "Coverage",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "origin_id", "warehouse_id", "source_location_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Fleet Vehicles",
        "description": (
            "Total number of vehicles registered in the fleet. "
            "Measures transport capacity."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["vehicle", "fleet", "truck"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "vehicle_id", "truck_id", "fleet_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Shipment Weight",
        "description": (
            "Average recorded weight per shipment. "
            "Indicates typical cargo size."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "weight", "gross_weight", "package_weight", "cargo_weight"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "On-Time Delivery Rate",
        "description": (
            "Percentage of shipments with a delivery status explicitly "
            "marked as on-time. Core logistics service-quality metric."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["delivery_status", "status"],
        "target_value_aliases": ["on_time", "ontime", "on time"],
        "date_required": False,
    },
]
