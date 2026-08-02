'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { Check, ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { DashboardChart } from '@/lib/api';
import { allowedChartTypesFor, buildChartOption, CHART_TYPE_LABELS } from './chartOptions';

export type ChartSize = 'small' | 'medium' | 'large';

const SIZE_TO_WIDTH: Record<ChartSize, number> = { small: 4, medium: 6, large: 12 };

export function widthToSize(width: number): ChartSize {
  if (width <= 4) return 'small';
  if (width <= 6) return 'medium';
  return 'large';
}

interface ChartTileProps {
  chart: DashboardChart;
  projectId: number;
  isHighlighted: boolean;
  onChangeType: (widgetKey: string, chartType: string) => void;
  onRename: (widgetKey: string, title: string) => void;
  onResize: (widgetKey: string, size: ChartSize) => void;
  onRemove: (widgetKey: string) => void;
}

export default function ChartTile({
  chart,
  projectId,
  isHighlighted,
  onChangeType,
  onRename,
  onResize,
  onRemove,
}: ChartTileProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [resizeMenuOpen, setResizeMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chart.custom_title || chart.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setTypeMenuOpen(false);
        setResizeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const size = widthToSize(chart.grid_width ?? 6);
  const option = buildChartOption(chart, chart.chart_type);
  const allowedTypes = allowedChartTypesFor(chart);
  const sqlUrl = `/projects/${projectId}/sql?sql=${encodeURIComponent(chart.sql)}&env=${encodeURIComponent(chart.mode)}`;

  function commitTitle() {
    setIsEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== (chart.custom_title || chart.title)) {
      onRename(chart.widget_key, trimmed);
    }
  }

  return (
    <div
      id={`chart-tile-${chart.widget_key}`}
      style={{
        gridColumn: `span ${SIZE_TO_WIDTH[size]}`,
        borderRadius: 12,
        background: '#080d16',
        border: isHighlighted ? '1px solid #6f35f4' : '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: isHighlighted ? '0 0 0 3px rgba(111, 53, 244, 0.15)' : 'none',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
        minHeight: 300,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 12, gap: 8 }}>
        {isEditingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') {
                setTitleDraft(chart.custom_title || chart.title);
                setIsEditingTitle(false);
              }
            }}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#f5f5f7',
              background: 'rgba(148, 163, 184, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 6,
              padding: '3px 8px',
              flex: 1,
              minWidth: 0,
            }}
          />
        ) : (
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#f5f5f7',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'text',
            }}
            title={chart.custom_title || chart.title}
            onDoubleClick={() => setIsEditingTitle(true)}
          >
            {chart.custom_title || chart.title}
          </h3>
        )}

        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Chart options"
            className="flex items-center justify-center"
            style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'rgba(226, 232, 240, 0.5)', cursor: 'pointer' }}
          >
            <MoreVertical size={15} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 30,
                minWidth: 190,
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.18)',
                background: '#0d1420',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                padding: 6,
                zIndex: 15,
                fontSize: 12.5,
              }}
            >
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setTypeMenuOpen((v) => !v);
                    setResizeMenuOpen(false);
                  }}
                  className="flex items-center justify-between"
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f4f4f5', cursor: 'pointer', textAlign: 'left' }}
                >
                  Change Chart Type
                </button>
                {typeMenuOpen && (
                  <div style={{ paddingLeft: 8 }}>
                    {allowedTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onChangeType(chart.widget_key, t);
                          setMenuOpen(false);
                          setTypeMenuOpen(false);
                        }}
                        className="flex items-center justify-between"
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          borderRadius: 6,
                          border: 'none',
                          background: 'transparent',
                          color: t === chart.chart_type ? '#a78bfa' : 'rgba(226, 232, 240, 0.75)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 12,
                        }}
                      >
                        {CHART_TYPE_LABELS[t] || t}
                        {t === chart.chart_type && <Check size={12} aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsEditingTitle(true);
                  setMenuOpen(false);
                }}
                className="flex items-center"
                style={{ width: '100%', gap: 6, padding: '7px 9px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f4f4f5', cursor: 'pointer', textAlign: 'left' }}
              >
                <Pencil size={12} aria-hidden="true" />
                Edit Title
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setResizeMenuOpen((v) => !v);
                    setTypeMenuOpen(false);
                  }}
                  className="flex items-center justify-between"
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f4f4f5', cursor: 'pointer', textAlign: 'left' }}
                >
                  Resize
                </button>
                {resizeMenuOpen && (
                  <div style={{ paddingLeft: 8 }}>
                    {(['small', 'medium', 'large'] as ChartSize[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          onResize(chart.widget_key, s);
                          setMenuOpen(false);
                          setResizeMenuOpen(false);
                        }}
                        className="flex items-center justify-between"
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          borderRadius: 6,
                          border: 'none',
                          background: 'transparent',
                          color: s === size ? '#a78bfa' : 'rgba(226, 232, 240, 0.75)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 12,
                          textTransform: 'capitalize',
                        }}
                      >
                        {s}
                        {s === size && <Check size={12} aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href={sqlUrl}
                className="flex items-center"
                style={{ gap: 6, width: '100%', padding: '7px 9px', borderRadius: 6, color: '#f4f4f5', textDecoration: 'none', fontSize: 12.5 }}
                onClick={() => setMenuOpen(false)}
              >
                <ExternalLink size={12} aria-hidden="true" />
                View SQL
              </Link>

              <button
                type="button"
                onClick={() => {
                  onRemove(chart.widget_key);
                  setMenuOpen(false);
                }}
                className="flex items-center"
                style={{ width: '100%', gap: 6, padding: '7px 9px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', textAlign: 'left' }}
              >
                <Trash2 size={12} aria-hidden="true" />
                Remove from Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 220, overflow: 'auto' }}>
        {chart.chart_data.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ height: '100%', gap: 6, color: 'rgba(226, 232, 240, 0.4)' }}
          >
            <span style={{ fontSize: 12.5 }}>Chart data unavailable right now</span>
          </div>
        ) : chart.chart_type === 'table' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(226, 232, 240, 0.45)', borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  {chart.chart_form === 'time_series' ? 'Period' : chart.value_label || 'Category'}
                </th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'rgba(226, 232, 240, 0.45)', borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {chart.chart_data.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '7px 8px', color: '#f4f4f5', borderBottom: '1px solid rgba(148, 163, 184, 0.06)' }}>
                    {row.label || row.period || '—'}
                  </td>
                  <td style={{ padding: '7px 8px', color: '#f4f4f5', textAlign: 'right', borderBottom: '1px solid rgba(148, 163, 184, 0.06)' }}>
                    {row.value ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            notMerge
            lazyUpdate
            opts={{ renderer: 'svg' }}
          />
        )}
      </div>
    </div>
  );
}
