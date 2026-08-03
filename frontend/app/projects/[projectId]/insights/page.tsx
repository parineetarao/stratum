'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  extractErrorMessage,
  generateInsights,
  getLatestInsights,
  type InsightsResponse,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import AiInsightsPanel from '@/components/dashboard/AiInsightsPanel';

export default function InsightsPage() {
  const { overview } = useWorkspace();
  const projectId = overview.project.id;
  const projectName = overview.project.name;

  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReport, setHasReport] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLatestInsights(projectId);
      if (res.success) {
        setInsights(res);
        setHasReport(true);
      } else {
        // The latest persisted attempt failed — still nothing to show
        // as a legitimate report, but not an empty state either.
        setHasReport(true);
        setError(res.executive_summary || 'The most recent insight generation attempt failed.');
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setHasReport(false);
      } else {
        setError(extractErrorMessage(err, 'Could not load insights.'));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateInsights(projectId);
      if (res.success) {
        setInsights(res);
        setHasReport(true);
      } else {
        setError(res.executive_summary || 'Failed to generate AI insights.');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to generate AI insights.'));
    } finally {
      setGenerating(false);
    }
  }

  function handleExport() {
    if (!insights) return;
    const lines = [
      `Executive Summary — ${projectName}`,
      '',
      insights.executive_summary,
      '',
      'Key Findings',
      ...insights.findings.map((f) => `- [${f.sentiment.toUpperCase()}] ${f.title}: ${f.observation} -> ${f.action}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-insights.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 300, gap: 10 }}>
        <Loader2 size={24} className="animate-spin" color="#8b7dff" aria-hidden="true" />
        <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)' }}>Loading insights...</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f5f5f7', letterSpacing: '-0.01em', marginBottom: 6 }}>
          AI Insights
        </h1>
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.55)' }}>
          The latest AI-generated executive report for {projectName}, shared with the Dashboard.
        </p>
      </div>

      {!hasReport ? (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            minHeight: 220,
            gap: 12,
            borderRadius: 12,
            background: '#080d16',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <Sparkles size={22} style={{ color: '#a78bfa' }} aria-hidden="true" />
          <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.65)', maxWidth: 420 }}>
            No AI insights have been generated for this project yet. Generate them from the Dashboard, or generate here now.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center"
            style={{
              gap: 6,
              height: 34,
              padding: '0 14px',
              borderRadius: 7,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
            Generate Insights
          </button>
          {error && <p style={{ fontSize: 12, color: '#fca5a5' }}>{error}</p>}
        </div>
      ) : (
        <AiInsightsPanel
          insights={insights}
          isLoading={generating}
          error={error}
          onGenerate={handleGenerate}
          onExport={handleExport}
          variant="full"
        />
      )}
    </div>
  );
}
