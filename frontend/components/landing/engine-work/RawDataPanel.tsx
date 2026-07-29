'use client';

import { AlertTriangle } from 'lucide-react';
import { RAW_DATA_ROWS, RAW_DATA_ISSUES } from './engine-work-data';

interface RawDataPanelProps {
  revealed: boolean;
  reducedMotion: boolean;
}

const COLUMNS = ['cust_id', 'customer', 'Datee', 'Amount', 'Product', 'Store_ID'];

export default function RawDataPanel({ revealed, reducedMotion }: RawDataPanelProps) {
  return (
    <div className="flex h-full flex-col" style={{ padding: '18px 20px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span className="uppercase font-semibold" style={{ fontSize: 11.5, letterSpacing: '0.08em', color: '#C4B5FD' }}>
          Raw Data Preview
        </span>
        <span style={{ fontSize: 10.5, color: 'rgba(245,245,247,0.38)' }}>5 of 1.2M rows</span>
      </div>

      <div className="overflow-x-auto" style={{ flex: 1 }}>
        <table className="w-full border-collapse" style={{ fontSize: 11.5 }}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="text-left font-medium"
                  style={{ padding: '4px 8px 6px 0', color: 'rgba(245,245,247,0.45)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RAW_DATA_ROWS.map((row, i) => (
              <tr
                key={i}
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'translateY(0)' : 'translateY(6px)',
                  transition: reducedMotion ? 'none' : `opacity 380ms ease ${i * 70}ms, transform 380ms ease ${i * 70}ms`,
                }}
              >
                <td style={{ padding: '5px 8px 5px 0', color: row.custId === 'NULL' ? '#E8B354' : 'rgba(245,245,247,0.82)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {row.custId}
                </td>
                <td style={{ padding: '5px 8px 5px 0', color: row.customer === 'unknown' ? '#E8B354' : 'rgba(245,245,247,0.82)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {row.customer}
                </td>
                <td style={{ padding: '5px 8px 5px 0', color: 'rgba(245,245,247,0.82)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.date}</td>
                <td style={{ padding: '5px 8px 5px 0', color: row.amount === 'NULL' ? '#E8B354' : 'rgba(245,245,247,0.82)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {row.amount}
                </td>
                <td style={{ padding: '5px 8px 5px 0', color: 'rgba(245,245,247,0.82)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.product}</td>
                <td style={{ padding: '5px 0', color: 'rgba(245,245,247,0.82)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.storeId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="flex flex-wrap items-center"
        style={{
          gap: '6px 14px',
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          opacity: revealed ? 1 : 0,
          transition: reducedMotion ? 'none' : 'opacity 380ms ease 380ms',
        }}
      >
        {RAW_DATA_ISSUES.map((issue, i) => (
          <span key={issue} className="flex items-center" style={{ gap: 5, fontSize: 11, color: '#D9A544' }}>
            {i === 0 && <AlertTriangle size={11} color="#D9A544" />}
            {issue}
          </span>
        ))}
      </div>
    </div>
  );
}
