const AGG_PATTERN = /\b(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*(?:DISTINCT\s+)?([\w."]*)\s*\)/i;
const GROUP_BY_PATTERN = /GROUP BY\s+([\w."]+)/i;

export interface SqlMeta {
  aggregation: string | null;
  measure: string | null;
  dimension: string | null;
}

export function parseSqlMeta(sql: string): SqlMeta {
  const aggMatch = sql.match(AGG_PATTERN);
  const groupMatch = sql.match(GROUP_BY_PATTERN);

  return {
    aggregation: aggMatch ? aggMatch[1].toUpperCase() : null,
    measure: aggMatch && aggMatch[2] ? aggMatch[2].replace(/"/g, '') : null,
    dimension: groupMatch ? groupMatch[1].replace(/"/g, '') : null,
  };
}
