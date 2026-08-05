'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Gauge, Wand2, Loader2, ArrowRight } from 'lucide-react';
import {
  explainSql,
  optimizeSql,
  generateSqlFromPrompt,
  extractErrorMessage,
  type SQLExplainResponse,
  type SQLOptimizeResponse,
  type SqlEnvironment,
} from '@/lib/api';
import { actionButtonStyle } from './uiHelpers';

type AiTab = 'explain' | 'optimize' | 'generate';

interface AiAssistantPanelProps {
  projectId: number;
  sql: string;
  environment: SqlEnvironment;
  autoExplainToken: number;
  onInsertGenerated: (sql: string) => void;
}

export default function AiAssistantPanel({
  projectId,
  sql,
  environment,
  autoExplainToken,
  onInsertGenerated,
}: AiAssistantPanelProps) {
  const [tab, setTab] = useState<AiTab>('explain');

  const [explainResult, setExplainResult] = useState<SQLExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [optimizeResult, setOptimizeResult] = useState<SQLOptimizeResponse | null>(null);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (autoExplainToken === 0 || !sql.trim()) return;
    let cancelled = false;
    setExplainLoading(true);
    setExplainError(null);
    explainSql(projectId, sql, environment)
      .then((data) => {
        if (!cancelled) setExplainResult(data);
      })
      .catch((err) => {
        if (!cancelled) setExplainError(extractErrorMessage(err, 'Failed to explain query.'));
      })
      .finally(() => {
        if (!cancelled) setExplainLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExplainToken]);

  async function handleOptimize() {
    if (!sql.trim() || optimizeLoading) return;
    setOptimizeLoading(true);
    setOptimizeError(null);
    try {
      const data = await optimizeSql(projectId, sql, environment);
      setOptimizeResult(data);
    } catch (err) {
      setOptimizeError(extractErrorMessage(err, 'Failed to generate optimization suggestions.'));
    } finally {
      setOptimizeLoading(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim() || generateLoading) return;
    setGenerateLoading(true);
    setGenerateError(null);
    try {
      const data = await generateSqlFromPrompt(projectId, prompt.trim(), environment);
      setGeneratedSql(data.sql);
    } catch (err) {
      setGenerateError(extractErrorMessage(err, 'Failed to generate SQL.'));
    } finally {
      setGenerateLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 46,
          padding: '0 12px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          flexShrink: 0,
          gap: 6,
        }}
      >
        <h2 style={{ fontSize: 12.5, fontWeight: 650, color: '#f5f5f7', marginRight: 8 }}>AI Assistant</h2>
        <AiTabButton icon={<Sparkles size={12} />} active={tab === 'explain'} onClick={() => setTab('explain')} label="Explain" />
        <AiTabButton icon={<Gauge size={12} />} active={tab === 'optimize'} onClick={() => setTab('optimize')} label="Optimize" />
        <AiTabButton icon={<Wand2 size={12} />} active={tab === 'generate'} onClick={() => setTab('generate')} label="Generate" />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }}>
        {tab === 'explain' && (
          <>
            {explainLoading && <LoadingLine text="Explaining query..." />}
            {!explainLoading && explainError && <ErrorText text={explainError} />}
            {!explainLoading && !explainError && !explainResult && (
              <EmptyText text="Run a query to see an automatic plain-English explanation here." />
            )}
            {!explainLoading && explainResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Section title="Query Explanation">
                  <p style={bodyText}>{explainResult.explanation}</p>
                </Section>
                {explainResult.business_question && (
                  <Section title="Business Question">
                    <p style={bodyText}>{explainResult.business_question}</p>
                  </Section>
                )}
                {explainResult.tables_used.length > 0 && (
                  <Section title="Tables Used">
                    <ChipList items={explainResult.tables_used} />
                  </Section>
                )}
                {explainResult.operations.length > 0 && (
                  <Section title="What It Does">
                    <BulletList items={explainResult.operations} />
                  </Section>
                )}
                {explainResult.suggestions.length > 0 && (
                  <Section title="Suggestions for Improvement">
                    <BulletList items={explainResult.suggestions} />
                  </Section>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'optimize' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button type="button" onClick={handleOptimize} disabled={!sql.trim() || optimizeLoading} style={actionButtonStyle(!sql.trim() || optimizeLoading, true)}>
              {optimizeLoading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Gauge size={13} aria-hidden="true" />}
              Analyze Query
            </button>
            {optimizeError && <ErrorText text={optimizeError} />}
            {!optimizeResult && !optimizeLoading && !optimizeError && (
              <EmptyText text="Analyze the current query for performance suggestions and index recommendations." />
            )}
            {optimizeResult && (
              <>
                {optimizeResult.suggestions.length > 0 && (
                  <Section title="Performance Suggestions">
                    <BulletList items={optimizeResult.suggestions} />
                  </Section>
                )}
                {optimizeResult.index_recommendations.length > 0 && (
                  <Section title="Index Recommendations">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {optimizeResult.index_recommendations.map((idx, i) => (
                        <pre key={i} style={codeBlock}>{idx}</pre>
                      ))}
                    </div>
                  </Section>
                )}
                {optimizeResult.rewritten_sql && (
                  <Section title="Query Rewrite Suggestion">
                    <pre style={codeBlock}>{optimizeResult.rewritten_sql}</pre>
                    <button
                      type="button"
                      onClick={() => onInsertGenerated(optimizeResult.rewritten_sql!)}
                      style={{ ...actionButtonStyle(false), marginTop: 8 }}
                    >
                      <ArrowRight size={13} aria-hidden="true" />
                      Insert into Editor
                    </button>
                  </Section>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'generate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 11.5, color: 'rgba(226,232,240,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Describe what you want to query
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Show total revenue by month for 2024"
              rows={3}
              style={{
                width: '100%',
                resize: 'vertical',
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: '#05070a',
                color: '#e2e8f0',
                fontSize: 12.5,
                padding: 10,
              }}
            />
            <button type="button" onClick={handleGenerate} disabled={!prompt.trim() || generateLoading} style={actionButtonStyle(!prompt.trim() || generateLoading, true)}>
              {generateLoading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Wand2 size={13} aria-hidden="true" />}
              Generate SQL
            </button>
            {generateError && <ErrorText text={generateError} />}
            {generatedSql && (
              <Section title="Generated SQL">
                <pre style={codeBlock}>{generatedSql}</pre>
                <button
                  type="button"
                  onClick={() => onInsertGenerated(generatedSql)}
                  style={{ ...actionButtonStyle(false, true), marginTop: 8 }}
                >
                  <ArrowRight size={13} aria-hidden="true" />
                  Insert into Editor
                </button>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AiTabButton({ icon, active, onClick, label }: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 28,
        padding: '0 10px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'rgba(111, 53, 244, 0.16)' : 'transparent',
        color: active ? '#a78bfa' : 'rgba(226,232,240,0.5)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 12, fontWeight: 650, color: 'rgba(226,232,240,0.6)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            fontSize: 11.5,
            padding: '3px 9px',
            borderRadius: 999,
            background: 'rgba(139, 125, 255, 0.14)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 125, 255, 0.25)',
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => (
        <li key={i} style={bodyText}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function LoadingLine({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(226,232,240,0.5)' }}>
      <Loader2 size={13} className="animate-spin" aria-hidden="true" /> {text}
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return <p style={{ fontSize: 12.5, color: '#fca5a5' }}>{text}</p>;
}

function EmptyText({ text }: { text: string }) {
  return <p style={{ fontSize: 12.5, color: 'rgba(226,232,240,0.4)' }}>{text}</p>;
}

const bodyText: React.CSSProperties = {
  fontSize: 12.5,
  color: '#e2e8f0',
  lineHeight: 1.6,
  margin: 0,
};

const codeBlock: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 11.5,
  color: '#e2e8f0',
  background: '#05070a',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  borderRadius: 8,
  padding: 10,
  whiteSpace: 'pre-wrap',
  overflowX: 'auto',
};
