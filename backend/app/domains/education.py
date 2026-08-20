EDUCATION_KPIS = [
    {
        "name": "Total Students",
        "description": (
            "Total number of unique students in the system. "
            "Measures the size of the student body."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["student", "learner", "enrollee"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "student_id", "learner_id", "enrollee_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Enrollments",
        "description": (
            "Total number of course enrollments recorded. "
            "Measures overall enrollment activity."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": None,
        "table_keywords": ["enrollment", "enrolment", "registration"],
        "date_required": False,
    },
    {
        "name": "Course Count",
        "description": (
            "Total number of unique courses offered. "
            "Measures curriculum breadth."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["course", "class", "subject"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "course_id", "class_id", "subject_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Score",
        "description": (
            "Average score or grade achieved across all recorded results. "
            "Core academic performance indicator."
        ),
        "category": "Quality",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "score", "grade", "marks", "result", "gpa"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Maximum Score",
        "description": (
            "Highest score or grade recorded. "
            "Identifies top academic performance."
        ),
        "category": "Quality",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "score", "grade", "marks", "result", "gpa"
        ],
        "measure_type": "numeric",
        "aggregation": "MAX",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Students Per Course",
        "description": (
            "Average number of students enrolled per course. "
            "Measures class-size load."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_PER_DISTINCT",
        "identifier_keywords": [
            "course_id", "class_id", "subject_id"
        ],
        "date_required": False,
    },
    {
        "name": "Unique Students Enrolled",
        "description": (
            "Number of distinct students with at least one recorded "
            "enrollment. Measures active student participation."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT_DISTINCT",
        "identifier_keywords": [
            "student_id", "learner_id", "enrollee_id"
        ],
        "date_required": False,
    },
    {
        "name": "Total Faculty",
        "description": (
            "Total number of faculty, teachers, or instructors registered. "
            "Measures teaching staff capacity."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["faculty", "teacher", "instructor", "staff"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "faculty_id", "teacher_id", "instructor_id", "staff_id"
        ],
        "date_required": False,
    },
    {
        "name": "Average Attendance",
        "description": (
            "Average recorded attendance value or percentage across "
            "students. Measures engagement and class participation."
        ),
        "category": "Quality",
        "unit": "count",
        "requires_fact_table": True,
        "measure_keywords": [
            "attendance", "attendance_percentage", "present_days", "days_present"
        ],
        "measure_type": "numeric",
        "aggregation": "AVG",
        "identifier_keywords": None,
        "date_required": False,
    },
    {
        "name": "Total Assignments",
        "description": (
            "Total number of assignments, homework, or exams recorded. "
            "Measures assessment volume."
        ),
        "category": "Volume",
        "unit": "count",
        "requires_fact_table": False,
        "table_keywords": ["assignment", "homework", "exam"],
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "COUNT",
        "identifier_keywords": [
            "assignment_id", "homework_id", "exam_id"
        ],
        "date_required": False,
    },
    {
        "name": "Pass Rate",
        "description": (
            "Percentage of results explicitly marked as a pass. "
            "Core academic outcome metric."
        ),
        "category": "Quality",
        "unit": "percentage",
        "requires_fact_table": True,
        "measure_keywords": None,
        "measure_type": None,
        "aggregation": "CONDITIONAL_RATE",
        "identifier_keywords": None,
        "status_keywords": ["result", "grade_status", "status", "pass_fail"],
        "target_value_aliases": ["pass", "passed"],
        "date_required": False,
    },
]
