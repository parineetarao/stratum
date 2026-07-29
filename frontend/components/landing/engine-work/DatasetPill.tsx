'use client';

import { FileText } from 'lucide-react';

interface DatasetPillProps {
  active?: boolean;
}

export default function DatasetPill({ active = false }: DatasetPillProps) {
  return (
    <div
      className="mx-auto flex w-fit items-center"
      style={{
        height: 50,
        gap: 10,
        padding: '0 20px',
        background: '#080A10',
        border: active ? '1px solid rgba(139,92,246,0.7)' : '1px solid rgba(139,92,246,0.38)',
        borderRadius: 14,
        transition: 'border-color 320ms ease',
      }}
    >
      <FileText size={19} color="rgba(245,245,247,0.7)" />
      <span style={{ fontSize: 16, fontWeight: 500, color: '#F5F5F7' }}>Retail_Transactions.csv</span>
    </div>
  );
}
