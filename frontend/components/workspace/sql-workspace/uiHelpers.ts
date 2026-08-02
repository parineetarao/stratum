export function actionButtonStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    height: 32,
    padding: '0 12px',
    borderRadius: 7,
    border: primary ? 'none' : '1px solid rgba(148, 163, 184, 0.24)',
    background: primary
      ? 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)'
      : 'rgba(148, 163, 184, 0.06)',
    color: primary ? '#fff' : '#f4f4f5',
    fontSize: 12.5,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
  };
}

const SQL_KEYWORDS = [
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'as', 'on', 'join',
  'left', 'right', 'inner', 'outer', 'full', 'group by', 'order by', 'having',
  'limit', 'offset', 'insert into', 'values', 'update', 'set', 'delete from',
  'create table', 'alter table', 'drop table', 'distinct', 'union', 'union all',
  'case', 'when', 'then', 'else', 'end', 'null', 'is', 'like', 'between',
  'asc', 'desc', 'count', 'sum', 'avg', 'min', 'max',
];

// Lightweight, dependency-free formatter: normalizes keyword casing and puts
// major clauses on their own line. Not a full SQL parser/formatter.
export function formatSql(sql: string): string {
  let formatted = sql.trim();
  if (!formatted) return formatted;

  for (const kw of SQL_KEYWORDS) {
    const re = new RegExp(`\\b${kw.replace(' ', '\\s+')}\\b`, 'gi');
    formatted = formatted.replace(re, kw.toUpperCase());
  }

  const clauseBreaks = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
    'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'JOIN', 'UNION ALL', 'UNION',
  ];
  for (const clause of clauseBreaks) {
    const re = new RegExp(`\\s*\\b${clause}\\b`, 'g');
    formatted = formatted.replace(re, `\n${clause}`);
  }

  return formatted
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function rowsToCsv(columns: string[], rows: unknown[][]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function inferColumnType(rows: unknown[][], colIndex: number): string {
  for (const row of rows) {
    const val = row[colIndex];
    if (val === null || val === undefined) continue;
    if (typeof val === 'number') return Number.isInteger(val) ? 'integer' : 'numeric';
    if (typeof val === 'boolean') return 'boolean';
    return 'text';
  }
  return 'unknown';
}

// Postgres errors often look like: `...\nLINE 3: SELECT * FORM foo\n        ^`
export function extractErrorLine(error: string): number | null {
  const match = error.match(/LINE (\d+):/i);
  return match ? parseInt(match[1], 10) : null;
}
