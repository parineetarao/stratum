import type { LucideIcon } from 'lucide-react';
import { Database, TableProperties, Link2, Box, BarChart3 } from 'lucide-react';

export type ExplorationStage = 'all' | 'raw' | 'discovery' | 'relationships' | 'warehouse' | 'analytics';

export interface TransformationStage {
  key: Exclude<ExplorationStage, 'all'>;
  label: string;
  descriptor: string;
  icon: LucideIcon;
  color: string;
}

// Violet -> cyan progression, one accent per stage of the dataset's journey.
export const STAGE_COLORS: Record<Exclude<ExplorationStage, 'all'>, string> = {
  raw: '#A855F7',
  discovery: '#7C5CFC',
  relationships: '#4F6DF5',
  warehouse: '#2583EB',
  analytics: '#22C7D9',
};

export const TRANSFORMATION_STAGES: TransformationStage[] = [
  { key: 'raw', label: 'RAW DATA', descriptor: 'Messy. Unstructured.', icon: Database, color: STAGE_COLORS.raw },
  { key: 'discovery', label: 'DISCOVERY', descriptor: 'Structure identified.', icon: TableProperties, color: STAGE_COLORS.discovery },
  { key: 'relationships', label: 'RELATIONSHIPS', descriptor: 'Connections inferred.', icon: Link2, color: STAGE_COLORS.relationships },
  { key: 'warehouse', label: 'WAREHOUSE', descriptor: 'Model ready.', icon: Box, color: STAGE_COLORS.warehouse },
  { key: 'analytics', label: 'ANALYTICS', descriptor: 'Insights delivered.', icon: BarChart3, color: STAGE_COLORS.analytics },
];

export const STAGE_CONTROLS: { key: Exclude<ExplorationStage, 'all'>; label: string; icon: LucideIcon }[] = [
  { key: 'raw', label: 'Raw Data', icon: Database },
  { key: 'discovery', label: 'Discovery', icon: TableProperties },
  { key: 'relationships', label: 'Relationships', icon: Link2 },
  { key: 'warehouse', label: 'Warehouse', icon: Box },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export interface RawDataRow {
  custId: string;
  customer: string;
  date: string;
  amount: string;
  product: string;
  storeId: string;
  flagged?: boolean;
}

export const RAW_DATA_ROWS: RawDataRow[] = [
  { custId: '1001', customer: 'john.doe@email.com', date: '2024/01/01', amount: '125.00', product: 'P-532', storeId: 'S001' },
  { custId: '1002', customer: 'Jane Smith', date: '01-01-2024', amount: '200', product: 'P-239', storeId: 'S002', flagged: true },
  { custId: '1001', customer: 'john.doe@email.com', date: '2024/01/01', amount: '125.00', product: 'P-532', storeId: 'S001', flagged: true },
  { custId: 'NULL', customer: 'unknown', date: '2024/01/02', amount: 'NULL', product: 'P-532', storeId: 'S003', flagged: true },
  { custId: '1003', customer: 'Mike Johnson', date: '1/2/24', amount: '99.99', product: 'P-834', storeId: 'S001', flagged: true },
];

export const RAW_DATA_ISSUES = ['Inconsistent formats', 'Duplicates', 'Null values'];

export interface SchemaField {
  name: string;
  isKey?: boolean;
}

export interface SchemaTable {
  id: string;
  name: string;
  fields: SchemaField[];
  x: number;
  y: number;
}

// Coordinates are percentages within the schema panel's SVG viewBox, laid
// out to match the reference: orders sits between customers and products,
// stores/order_items sit below.
export const SCHEMA_TABLES: SchemaTable[] = [
  {
    id: 'customers',
    name: 'customers',
    x: 2,
    y: 8,
    fields: [{ name: 'cust_id (PK)', isKey: true }, { name: 'email' }, { name: 'name' }, { name: 'signup_date' }],
  },
  {
    id: 'orders',
    name: 'orders',
    x: 39,
    y: 2,
    fields: [
      { name: 'order_id (PK)', isKey: true },
      { name: 'cust_id (FK)' },
      { name: 'order_date' },
      { name: 'store_id (FK)' },
      { name: 'total_amount' },
    ],
  },
  {
    id: 'products',
    name: 'products',
    x: 76,
    y: 8,
    fields: [{ name: 'product_id (PK)', isKey: true }, { name: 'product_name' }, { name: 'category_id (FK)' }, { name: 'unit_price' }],
  },
  {
    id: 'stores',
    name: 'stores',
    x: 2,
    y: 60,
    fields: [{ name: 'store_id (PK)', isKey: true }, { name: 'store_name' }, { name: 'region_id (FK)' }],
  },
  {
    id: 'order_items',
    name: 'order_items',
    x: 39,
    y: 62,
    fields: [{ name: 'order_id (FK)' }, { name: 'product_id (FK)' }, { name: 'quantity' }, { name: 'amount' }],
  },
];

export interface SchemaRelationship {
  from: string;
  to: string;
  confidence: number;
}

export const SCHEMA_RELATIONSHIPS: SchemaRelationship[] = [
  { from: 'customers', to: 'orders', confidence: 96 },
  { from: 'orders', to: 'products', confidence: 94 },
  { from: 'stores', to: 'orders', confidence: 92 },
  { from: 'orders', to: 'order_items', confidence: 97 },
];

export interface QualityMetric {
  label: string;
  value: number;
}

export const QUALITY_METRICS: QualityMetric[] = [
  { label: 'Completeness', value: 96 },
  { label: 'Uniqueness', value: 94 },
  { label: 'Validity', value: 95 },
  { label: 'Consistency', value: 92 },
  { label: 'Timeliness', value: 91 },
];

export const QUALITY_SCORE = 94;

export interface WarehouseNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isFact?: boolean;
}

export const WAREHOUSE_NODES: WarehouseNode[] = [
  { id: 'fact_sales', label: 'fact_sales', x: 50, y: 50, isFact: true },
  { id: 'dim_customer', label: 'dim_customer', x: 12, y: 20 },
  { id: 'dim_store', label: 'dim_store', x: 88, y: 20 },
  { id: 'dim_product', label: 'dim_product', x: 12, y: 80 },
  { id: 'dim_date', label: 'dim_date', x: 88, y: 80 },
];

export const GENERATED_SQL = `CREATE TABLE fact_sales (
  sales_id BIGINT PRIMARY KEY,
  customer_id INT,
  product_id INT,
  store_id INT,
  date_id INT,
  quantity INT,
  amount DECIMAL(18,2)
);`;

export interface KpiCard {
  label: string;
  value: string;
  delta: string;
}

export const KPI_CARDS: KpiCard[] = [
  { label: 'Total Revenue', value: '$24.8M', delta: '18.6% vs last month' },
  { label: 'Orders', value: '128.6K', delta: '12.3% vs last month' },
  { label: 'Avg Order Value', value: '$193.21', delta: '6.8% vs last month' },
  { label: 'New Customers', value: '9.4K', delta: '6.2% vs last month' },
];

export const REVENUE_SERIES = [8, 14, 11, 17, 15, 21, 18, 24, 20, 26, 23, 28];
export const REVENUE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export const TOP_PRODUCTS: DonutSlice[] = [
  { label: 'P-532', value: 24.1, color: '#A855F7' },
  { label: 'P-239', value: 18.3, color: '#7C5CFC' },
  { label: 'P-834', value: 12.2, color: '#4F6DF5' },
  { label: 'P-112', value: 9.8, color: '#2583EB' },
  { label: 'Other', value: 35.6, color: 'rgba(245,245,247,0.22)' },
];
