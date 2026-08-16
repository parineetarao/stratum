from app.engine.warehouse_designer import recommend_schema_type


def _dim_table(name, fk_to=None):
    columns = [{"name": f"{name}_id", "is_primary_key": True}]
    if fk_to:
        columns.append({
            "name": f"{fk_to}_id",
            "foreign_key": {"referenced_table": fk_to, "referenced_column": f"{fk_to}_id"},
        })
    return {"table_name": name, "columns": columns}


def test_single_fact_no_dimension_fk_is_star():
    schema = [_dim_table("customers"), _dim_table("products")]
    result = recommend_schema_type(schema, ["orders"], ["customers", "products"])
    assert result == "star"


def test_single_fact_with_dimension_to_dimension_fk_is_snowflake():
    schema = [_dim_table("customers"), _dim_table("addresses", fk_to="customers")]
    result = recommend_schema_type(schema, ["orders"], ["customers", "addresses"])
    assert result == "snowflake"


def test_multiple_fact_tables_is_galaxy_even_without_dimension_fk():
    schema = [_dim_table("customers"), _dim_table("products")]
    result = recommend_schema_type(schema, ["orders", "payments"], ["customers", "products"])
    assert result == "galaxy"


def test_multiple_fact_tables_takes_precedence_over_snowflake():
    schema = [_dim_table("customers"), _dim_table("addresses", fk_to="customers")]
    result = recommend_schema_type(schema, ["orders", "payments"], ["customers", "addresses"])
    assert result == "galaxy"
