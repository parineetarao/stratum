import pytest
from app.domains import DOMAIN_KPI_LIBRARY

VALID_AGGREGATIONS = {
    "COUNT", "SUM", "AVG", "MAX", "MIN",
    "COUNT_DISTINCT", "SUM_PER_DISTINCT", "COUNT_PER_DISTINCT",
    "NULL_RATE", "CONDITIONAL_RATE",
}

EXPECTED_DOMAINS = {
    "retail", "banking", "finance", "healthcare", "manufacturing",
    "logistics", "education", "ecommerce", "saas", "telecommunications",
}


def test_domain_library_contains_all_supported_domains():
    assert set(DOMAIN_KPI_LIBRARY.keys()) == EXPECTED_DOMAINS


@pytest.mark.parametrize("domain", sorted(EXPECTED_DOMAINS))
def test_each_domain_has_at_least_ten_kpis(domain):
    kpis = DOMAIN_KPI_LIBRARY[domain]
    assert len(kpis) >= 10, f"{domain} has only {len(kpis)} KPI definitions"


@pytest.mark.parametrize("domain", sorted(EXPECTED_DOMAINS))
def test_each_domain_kpis_are_well_formed(domain):
    kpis = DOMAIN_KPI_LIBRARY[domain]
    names = set()
    for kpi in kpis:
        assert kpi["name"] not in names, f"duplicate KPI name in {domain}: {kpi['name']}"
        names.add(kpi["name"])

        assert kpi.get("description")
        assert kpi.get("category")
        assert kpi.get("unit")
        assert kpi["aggregation"] in VALID_AGGREGATIONS

        agg = kpi["aggregation"]
        if agg in ("SUM", "AVG", "MAX", "MIN"):
            assert kpi.get("measure_keywords"), f"{domain}/{kpi['name']} needs measure_keywords"
        if agg in ("COUNT_DISTINCT", "SUM_PER_DISTINCT", "COUNT_PER_DISTINCT"):
            assert kpi.get("identifier_keywords"), f"{domain}/{kpi['name']} needs identifier_keywords"
        if agg == "SUM_PER_DISTINCT":
            assert kpi.get("measure_keywords")
        if agg == "NULL_RATE":
            assert kpi.get("null_column_keywords"), f"{domain}/{kpi['name']} needs null_column_keywords"
        if agg == "CONDITIONAL_RATE":
            assert kpi.get("status_keywords"), f"{domain}/{kpi['name']} needs status_keywords"
            assert kpi.get("target_value_aliases"), f"{domain}/{kpi['name']} needs target_value_aliases"


@pytest.mark.parametrize("domain", sorted(EXPECTED_DOMAINS))
def test_each_domain_has_distinct_kpi_names(domain):
    kpis = DOMAIN_KPI_LIBRARY[domain]
    names = [kpi["name"] for kpi in kpis]
    assert len(names) == len(set(names))
