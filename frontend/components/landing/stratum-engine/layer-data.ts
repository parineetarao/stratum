import type { LucideIcon } from 'lucide-react';
import {
  Database,
  Download,
  ScanSearch,
  PackageOpen,
  BarChart3,
  Presentation,
} from 'lucide-react';

export interface StratumLayerSource {
  title: string;
  description: string;
  status?: string;
}

export interface StratumLayer {
  id: number;
  key: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  colors: {
    top: string;
    bottom: string;
    side: string;
    accent: string;
  };
  sectionLabel: string;
  capabilities: string[];
  sources?: StratumLayerSource[];
}

export const STRATUM_LAYERS: StratumLayer[] = [
  {
    id: 1,
    key: 'data-sources',
    name: 'Data Sources',
    shortName: 'DATA SOURCES',
    description:
      'Connect securely to operational databases and structured files while preserving the integrity of the original source.',
    icon: Database,
    colors: { top: '#8B2BE2', bottom: '#6D28D9', side: '#4C1D95', accent: '#A855F7' },
    sectionLabel: 'CAPABILITIES',
    sources: [
      { title: 'PostgreSQL', description: 'Relational database connection', status: 'Supported' },
      { title: 'CSV / Files', description: 'Structured dataset ingestion', status: 'Supported' },
    ],
    capabilities: [
      'Secure read-only database connections',
      'CSV dataset ingestion',
      'Connection validation',
      'Schema and metadata extraction',
      'Table and column discovery',
    ],
  },
  {
    id: 2,
    key: 'ingestion',
    name: 'Ingestion Layer',
    shortName: 'INGESTION LAYER',
    description:
      'Extract, validate, parse, and standardize metadata from connected sources before deeper analysis begins.',
    icon: Download,
    colors: { top: '#6337D8', bottom: '#4338CA', side: '#312E81', accent: '#818CF8' },
    sectionLabel: 'CORE OPERATIONS',
    capabilities: [
      'Metadata extraction',
      'Schema parsing',
      'Column type detection',
      'Primary-key discovery',
      'Null and uniqueness statistics',
      'Source validation',
    ],
  },
  {
    id: 3,
    key: 'intelligence',
    name: 'Intelligence Layer',
    shortName: 'INTELLIGENCE LAYER',
    description:
      'Understand the structure and quality of the data through relationship inference, profiling, and confidence-scored recommendations.',
    icon: ScanSearch,
    colors: { top: '#3758D9', bottom: '#2346B7', side: '#1E3A8A', accent: '#60A5FA' },
    sectionLabel: 'CAPABILITIES',
    capabilities: [
      'Relationship inference',
      'Name, type, and value-overlap analysis',
      'Confidence scoring',
      'Data profiling',
      'Quality assessment',
      'Cleaning recommendations',
      'Human review and approval',
    ],
  },
  {
    id: 4,
    key: 'modeling',
    name: 'Modeling Layer',
    shortName: 'MODELING LAYER',
    description:
      'Transform approved source structures into analytical warehouse models designed for reliable downstream use.',
    icon: PackageOpen,
    colors: { top: '#0E83D0', bottom: '#0969B6', side: '#075985', accent: '#38BDF8' },
    sectionLabel: 'MODELING OUTPUTS',
    capabilities: [
      'Fact and dimension identification',
      'Star-schema generation',
      'Snowflake-schema option',
      'Warehouse relationship design',
      'Generated SQL DDL',
      'Editable model recommendations',
      'Human approval before generation',
    ],
  },
  {
    id: 5,
    key: 'analytics',
    name: 'Analytics Layer',
    shortName: 'ANALYTICS LAYER',
    description:
      'Define trusted business logic through reusable KPIs, metrics, SQL analysis, and analytical datasets.',
    icon: BarChart3,
    colors: { top: '#0B9FBE', bottom: '#087F9C', side: '#155E75', accent: '#22D3EE' },
    sectionLabel: 'ANALYTICAL OUTPUTS',
    capabilities: [
      'Domain-aware KPI recommendations',
      'Metric definitions',
      'Reusable calculations',
      'SQL workspace',
      'Dashboard chart recommendations',
      'Analytical dataset preparation',
    ],
  },
  {
    id: 6,
    key: 'delivery',
    name: 'Delivery Layer',
    shortName: 'DELIVERY LAYER',
    description:
      'Deliver trusted analytical outputs through dashboards, generated insights, and production-ready warehouse assets.',
    icon: Presentation,
    colors: { top: '#12AFC0', bottom: '#0A8794', side: '#0F5964', accent: '#5EEAD4' },
    sectionLabel: 'DELIVERY OUTPUTS',
    capabilities: [
      'Generated dashboards',
      'Executive insights',
      'Warehouse DDL export',
      'Analytical summaries',
      'Reviewable outputs',
      'Decision-ready reporting',
    ],
  },
];
