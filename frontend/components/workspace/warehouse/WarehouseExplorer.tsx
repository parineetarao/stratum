'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  CheckCircle2,
  Database,
  Layers,
  Loader2,
  Sparkles,
  Table2,
  Warehouse as WarehouseIcon,
  XCircle,
} from 'lucide-react';
import {
  approveWarehouseDesign,
  extractErrorMessage,
  generateWarehouseDesign,
  getWarehouseDesign,
  overrideWarehouseClassification,
  type WarehouseClassification,
  type WarehouseDesignResponse,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { stageRoute } from '@/lib/workspaceNav';
import ClassificationPanel from './ClassificationPanel';
import WarehouseGraph from './WarehouseGraph';
import DdlTab from './DdlTab';
import SandboxTab from './SandboxTab';
import DisabledInDemo from '@/components/workspace/demoGuard';

type LoadState = 'loading' | 'no-metadata' | 'no-design' | 'failed' | 'ready';
type RightTab = 'ddl' | 'sandbox';

function actionButtonStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    height: 36,
    padding: '0 14px',
    borderRadius: 8,
    border: primary ? 'none' : '1px solid rgba(148, 163, 184, 0.24)',
    background: primary
      ? 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)'
      : 'rgba(148, 163, 184, 0.06)',
    color: primary ? '#fff' : '#f4f4f5',
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    whiteSpace: 'nowrap',
  };
}

export default function WarehouseExplorer() {
  const { overview, refetch: refetchOverview } = useWorkspace();
  const projectId = overview.project.id;
  const viewportWidth = useViewportWidth();
  const isNarrow = viewportWidth < 1000;

  const [state, setState] = useState<LoadState>('loading');
  const [design, setDesign] = useState<WarehouseDesignResponse | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('ddl');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    if (!overview.metadata_summary.has_run) {
      setState('no-metadata');
      return;
    }
    setState('loading');
    getWarehouseDesign(projectId)
      .then((res) => {
        setDesign(res);
        setState('ready');
      })
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setState('no-design');
        } else {
          setState('failed');
        }
      });
  }, [projectId, overview.metadata_summary.has_run]);

  useEffect(() => load(), [load]);

  async function handleGenerate() {
    setIsGenerating(true);
    setActionMessage(null);
    try {
      const result = await generateWarehouseDesign(projectId);
      setDesign(result);
      setState('ready');
      refetchOverview();
      setActionMessage({ tone: 'success', text: 'Warehouse design generated.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Warehouse generation failed.') });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleReclassify() {
    setIsReclassifying(true);
    setActionMessage(null);
    try {
      const result = await generateWarehouseDesign(projectId);
      setDesign(result);
      refetchOverview();
      setActionMessage({ tone: 'success', text: 'Schema reclassified from source.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Reclassification failed.') });
    } finally {
      setIsReclassifying(false);
    }
  }

  async function handleOverride(tableName: string, classification: WarehouseClassification) {
    setIsOverriding(true);
    setActionMessage(null);
    try {
      const result = await overrideWarehouseClassification(projectId, tableName, classification);
      setDesign(result);
      refetchOverview();
      setActionMessage({
        tone: 'success',
        text: `${tableName} reclassified as ${classification === 'fact' ? 'a fact table' : 'a dimension table'}.`,
      });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Override failed.') });
    } finally {
      setIsOverriding(false);
    }
  }

  async function handleApprove() {
    if (!design) return;
    setIsApproving(true);
    setActionMessage(null);
    try {
      const result = await approveWarehouseDesign(projectId, !design.is_approved);
      setDesign(result);
      refetchOverview();
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Could not update approval status.') });
    } finally {
      setIsApproving(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 360 }}>
        <Loader2 size={26} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </div>
    );
  }

  if (state === 'no-metadata') {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          minHeight: 380,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.15)',
          background: '#05070a',
          padding: '48px 24px',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(148, 163, 184, 0.06)',
            color: '#8b7dff',
            marginBottom: 20,
          }}
        >
          <WarehouseIcon size={22} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>
          No metadata discovered yet
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
          Stratum needs to know your tables and columns before it can design a warehouse.
        </p>
        <Link href={stageRoute(projectId, 'metadata')} style={actionButtonStyle(false, true)}>
          Go to Metadata
        </Link>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          minHeight: 320,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.15)',
          background: '#05070a',
          padding: '40px 24px',
        }}
      >
        <XCircle size={24} style={{ color: '#fca5a5', marginBottom: 14 }} aria-hidden="true" />
        <p style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.75)', marginBottom: 16 }}>
          The warehouse design could not be loaded.
        </p>
        <button type="button" onClick={load} style={actionButtonStyle(false)}>
          Try again
        </button>
      </div>
    );
  }

  if (state === 'no-design') {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          minHeight: 380,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.15)',
          background: '#05070a',
          padding: '48px 24px',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(148, 163, 184, 0.06)',
            color: '#8b7dff',
            marginBottom: 20,
          }}
        >
          <WarehouseIcon size={22} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>
          No warehouse design yet
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 400, marginBottom: 24 }}>
          Stratum will classify your tables into fact and dimension tables and generate a star or snowflake schema.
        </p>
        {actionMessage && (
          <div
            role="status"
            className="flex items-center"
            style={{
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              border: '1px solid rgba(248, 113, 113, 0.3)',
              background: 'rgba(248, 113, 113, 0.07)',
              fontSize: 13,
              color: '#fca5a5',
            }}
          >
            <XCircle size={14} aria-hidden="true" />
            {actionMessage.text}
          </div>
        )}
        <DisabledInDemo>
          <button type="button" onClick={handleGenerate} disabled={isGenerating} style={actionButtonStyle(isGenerating, true)}>
            {isGenerating ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            Generate Warehouse
          </button>
        </DisabledInDemo>
      </div>
    );
  }

  if (!design) return null;

  const isFlat = design.fact_count + design.dimension_count === 1;
  const isPostgres = overview.source.connection_type === 'postgresql';

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>Warehouse</h1>
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>
            Design your analytical warehouse. Review classification, explore the star schema, and generate DDL.
          </p>
        </div>

        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span
            className="flex items-center"
            style={{
              gap: 6,
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: design.is_approved ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
              background: design.is_approved ? 'rgba(52, 211, 153, 0.08)' : 'rgba(148, 163, 184, 0.05)',
              fontSize: 12.5,
              fontWeight: 600,
              color: design.is_approved ? '#6ee7b7' : 'rgba(226,232,240,0.55)',
            }}
          >
            {design.is_approved ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
            Warehouse Status: {design.is_approved ? 'Validated' : 'Pending Review'}
          </span>

          {isPostgres && (
            <DisabledInDemo>
              <button type="button" onClick={handleApprove} disabled={isApproving} style={actionButtonStyle(isApproving, true)}>
                {isApproving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                {design.is_approved ? 'Revoke Approval' : 'Apply Approved to Source'}
              </button>
            </DisabledInDemo>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="flex items-center"
          style={{
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            border: actionMessage.tone === 'success' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)',
            background: actionMessage.tone === 'success' ? 'rgba(52, 211, 153, 0.07)' : 'rgba(248, 113, 113, 0.07)',
            fontSize: 13,
            color: actionMessage.tone === 'success' ? '#6ee7b7' : '#fca5a5',
          }}
        >
          {actionMessage.tone === 'success' ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
          {actionMessage.text}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '260px minmax(0, 1fr) 360px',
          gap: 16,
          alignItems: 'stretch',
          height: 680,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: '16px 14px',
            overflow: 'hidden',
          }}
        >
          <ClassificationPanel
            design={design}
            onOverride={handleOverride}
            onReclassify={handleReclassify}
            isReclassifying={isReclassifying}
            isOverriding={isOverriding}
          />
        </div>

        <div
          style={{
            position: 'relative',
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              color: 'rgba(226, 232, 240, 0.5)',
              background: 'rgba(5, 7, 10, 0.85)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: 8,
              padding: '6px 10px',
            }}
          >
            <Layers size={12} aria-hidden="true" />
            {isFlat ? 'Flat Analytical Model' : design.schema_type === 'snowflake' ? 'Snowflake Schema' : 'Star Schema'}
          </div>

          <WarehouseGraph design={design} />

          {isFlat && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 12.5,
                color: 'rgba(226, 232, 240, 0.5)',
                textAlign: 'center',
                maxWidth: 360,
              }}
            >
              Single analytical table detected — there are no dimension relationships to model.
            </div>
          )}
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div className="flex items-center" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
            {(['ddl', 'sandbox'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className="flex items-center"
                style={{
                  gap: 6,
                  flex: 1,
                  justifyContent: 'center',
                  padding: '11px 0',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: rightTab === tab ? '#f5f5f7' : 'rgba(226, 232, 240, 0.5)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: rightTab === tab ? '2px solid #8b5cf6' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {tab === 'ddl' ? <Database size={13} aria-hidden="true" /> : <Table2 size={13} aria-hidden="true" />}
                {tab === 'ddl' ? 'DDL Script' : 'Sandbox Status'}
              </button>
            ))}
          </div>
          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            {rightTab === 'ddl' ? <DdlTab design={design} projectId={projectId} /> : <SandboxTab design={design} projectId={projectId} />}
          </div>
        </div>
      </div>

      <div
        className="flex items-center"
        style={{
          gap: 20,
          padding: '10px 4px',
          fontSize: 12,
          color: 'rgba(226, 232, 240, 0.45)',
          flexWrap: 'wrap',
        }}
      >
        <span className="flex items-center" style={{ gap: 6 }}>
          <Table2 size={13} aria-hidden="true" />
          {design.fact_count} fact table{design.fact_count === 1 ? '' : 's'}
        </span>
        <span className="flex items-center" style={{ gap: 6 }}>
          <Layers size={13} aria-hidden="true" />
          {design.dimension_count} dimension table{design.dimension_count === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
