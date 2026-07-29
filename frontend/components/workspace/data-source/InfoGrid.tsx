export interface InfoField {
  label: string;
  value: string;
}

export default function InfoGrid({ fields, columns = 3 }: { fields: InfoField[]; columns?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: 24,
        rowGap: 14,
      }}
    >
      {fields.map((field) => (
        <div key={field.label} style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 3 }}>
            {field.label}
          </div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: '#e2e8f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={field.value}
          >
            {field.value}
          </div>
        </div>
      ))}
    </div>
  );
}
