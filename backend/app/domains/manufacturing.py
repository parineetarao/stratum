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
    {
        "name": "Maximum Units Produced",
        "description": (
            "Highest number of units produced in a single run. "
            "Identifies peak production capacity."
        ),
        "category": "Production",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "units_produced", "quantity", "output", "units"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Unique Production Lines",
        "description": (
            "Number of distinct production lines or machines used. "
            "Measures manufacturing capacity breadth."
        ),
        "category": "Production",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "line_id", "machine_id", "production_line_id", "equipment_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Defective Units Per Machine",
        "description": (
            "Average count of defective units attributed to each machine. "
            "Highlights machines contributing disproportionately to defects."
        ),
        "category": "Quality",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "defective", "defect", "rejected", "scrap"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM_PER_DISTINCT",
        "identifier_keywords": [
            "machine_id", "line_id", "equipment_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Machines",
        "description": (
            "Total number of machines or equipment units registered. "
            "Measures production asset count."
        ),
        "category": "Production",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["machine", "equipment", "asset"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "machine_id", "equipment_id", "asset_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Raw Material Used",
        "description": (
            "Total quantity of raw material consumed across production runs. "
            "Measures material throughput."
        ),
        "category": "Production",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "material_used", "raw_material", "consumption", "input_quantity"
        ],
        "measure_type": "numeric",
        "aggregation": "SUM",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Runs Per Machine",
        "description": (
            "Average number of production runs handled per machine. "
            "Measures equipment utilization."
        ),
        "category": "Production",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "machine_id", "line_id", "equipment_id"
        ],
        "date_required": False,
    },
    {
        "name": "Defect Rate",
        "description": (
            "Percentage of production output flagged with a defective or "
            "failed quality inspection status. Core quality-control metric."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["quality_status", "inspection_result", "status"],
        "target_value_aliases": ["defective", "defect", "fail", "failed"],
        "date_required": False,
    },
]
