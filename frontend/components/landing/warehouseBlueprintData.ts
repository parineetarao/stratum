// Deterministic warehouse ER-diagram geometry for the hero blueprint.
// Coordinates are fixed points in the SVG's 0 0 1366 900 viewBox — nothing here
// is randomly generated or recomputed on render.

export type TableDef = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  rows: string[];
  hiddenRows?: string[];
};

export type ConnectorDef = {
  id: string;
  d: string;
  secondary?: boolean;
};

export const VIEWBOX_WIDTH = 1366;
export const VIEWBOX_HEIGHT = 900;

// Mobile gets its own narrow viewBox (see WarehouseBlueprint) so the corner
// tables stay on-screen instead of being cropped out by a "slice" fit against
// the desktop viewBox's much wider aspect ratio.
export const MOBILE_VIEWBOX_WIDTH = 400;
export const MOBILE_VIEWBOX_HEIGHT = 900;

const MOBILE_TABLES: TableDef[] = [
  {
    id: 'tl',
    x: 16,
    y: 90,
    w: 150,
    h: 118,
    title: 'dim_customer',
    rows: ['customer_id PK', 'account_tier', 'region_code', 'created_at'],
  },
  {
    id: 'tr',
    x: 234,
    y: 104,
    w: 150,
    h: 126,
    title: 'dim_product',
    rows: ['product_id PK', 'sku_code', 'category', 'status'],
  },
  {
    id: 'ml',
    x: 20,
    y: 380,
    w: 180,
    h: 146,
    title: 'fact_sales',
    rows: ['sales_id PK', 'customer_id FK', 'product_id FK', 'store_id FK', 'gross_amt', 'txn_ts'],
  },
  {
    id: 'bl',
    x: 12,
    y: 700,
    w: 140,
    h: 108,
    title: 'dim_date',
    rows: ['date_key PK', 'week_num', 'month_num', 'fiscal_qtr'],
  },
  {
    id: 'br',
    x: 248,
    y: 676,
    w: 140,
    h: 118,
    title: 'dim_store',
    rows: ['store_id PK', 'country', 'channel', 'opened_on'],
  },
];

const TABLET_TABLES: TableDef[] = [
  {
    id: 'tl1',
    x: 20,
    y: 38,
    w: 174,
    h: 130,
    title: 'dim_customer',
    rows: ['customer_id PK', 'full_name', 'account_tier', 'market', 'created_at'],
    hiddenRows: ['source_crm_id'],
  },
  {
    id: 'tl2',
    x: 206,
    y: 56,
    w: 160,
    h: 120,
    title: 'dim_date',
    rows: ['date_key PK', 'cal_date', 'week_num', 'month_num', 'quarter'],
    hiddenRows: ['fiscal_year'],
  },
  {
    id: 'ml1',
    x: 20,
    y: 230,
    w: 206,
    h: 160,
    title: 'fact_sales',
    rows: ['sales_id PK', 'customer_id FK', 'product_id FK', 'date_key FK', 'store_id FK', 'net_amount', 'txn_ts'],
    hiddenRows: ['load_job_id'],
  },
  {
    id: 'ml2',
    x: 236,
    y: 248,
    w: 170,
    h: 132,
    title: 'fact_payments',
    rows: ['payment_id PK', 'sales_id FK', 'method', 'approved_flag', 'settled_ts'],
    hiddenRows: ['processor_ref'],
  },
  {
    id: 'tr1',
    x: 1162,
    y: 40,
    w: 176,
    h: 132,
    title: 'dim_product',
    rows: ['product_id PK', 'sku_code', 'category', 'brand', 'active_flag'],
    hiddenRows: ['source_plm_key'],
  },
  {
    id: 'tr2',
    x: 972,
    y: 56,
    w: 180,
    h: 126,
    title: 'bridge_customer_account',
    rows: ['bridge_id PK', 'customer_id FK', 'account_id FK', 'effective_from', 'effective_to'],
    hiddenRows: ['lineage_tag'],
  },
  {
    id: 'mr1',
    x: 1124,
    y: 242,
    w: 212,
    h: 156,
    title: 'fact_inventory',
    rows: ['inventory_id PK', 'product_id FK', 'store_id FK', 'on_hand_qty', 'safety_stock', 'snapshot_ts'],
    hiddenRows: ['forecast_bucket'],
  },
  {
    id: 'mr2',
    x: 936,
    y: 264,
    w: 178,
    h: 132,
    title: 'dim_store',
    rows: ['store_id PK', 'store_name', 'region', 'country', 'opened_on'],
    hiddenRows: ['source_erp_id'],
  },
  {
    id: 'sl1',
    x: 286,
    y: 742,
    w: 176,
    h: 130,
    title: 'agg_daily_revenue',
    rows: ['agg_date_key PK', 'store_id FK', 'gross_revenue', 'net_revenue', 'order_count'],
    hiddenRows: ['currency_code', 'refresh_batch_id'],
  },
  {
    id: 'sr1',
    x: 916,
    y: 744,
    w: 180,
    h: 130,
    title: 'map_product_category',
    rows: ['map_id PK', 'product_id FK', 'category_id FK', 'taxonomy_version', 'effective_to'],
    hiddenRows: ['lineage_ref', 'source_map_key'],
  },
];

const DESKTOP_TABLES: TableDef[] = [
  {
    id: 'tl1',
    x: 24,
    y: 30,
    w: 194,
    h: 142,
    title: 'dim_customer',
    rows: ['customer_id PK', 'full_name', 'account_tier', 'segment_code', 'region_code', 'created_at'],
    hiddenRows: ['source_crm_id', 'master_data_grp'],
  },
  {
    id: 'tl2',
    x: 226,
    y: 52,
    w: 170,
    h: 128,
    title: 'dim_date',
    rows: ['date_key PK', 'cal_date', 'week_num', 'month_num', 'quarter', 'fiscal_year'],
    hiddenRows: ['is_holiday', 'is_month_end'],
  },
  {
    id: 'ml1',
    x: 20,
    y: 232,
    w: 220,
    h: 172,
    title: 'fact_sales',
    rows: [
      'sales_id PK',
      'customer_id FK',
      'product_id FK',
      'date_key FK',
      'store_id FK',
      'gross_amount',
      'discount_amount',
      'txn_ts',
    ],
    hiddenRows: ['load_job_id', 'row_hash'],
  },
  {
    id: 'ml2',
    x: 250,
    y: 250,
    w: 176,
    h: 136,
    title: 'fact_payments',
    rows: ['payment_id PK', 'sales_id FK', 'method_code', 'approved_flag', 'settled_ts'],
    hiddenRows: ['processor_ref', 'chargeback_flag'],
  },
  {
    id: 'tr1',
    x: 1130,
    y: 30,
    w: 198,
    h: 144,
    title: 'dim_product',
    rows: ['product_id PK', 'sku_code', 'category', 'sub_category', 'brand', 'active_flag'],
    hiddenRows: ['source_plm_key', 'uom_code'],
  },
  {
    id: 'tr2',
    x: 956,
    y: 52,
    w: 168,
    h: 128,
    title: 'bridge_customer_account',
    rows: ['bridge_id PK', 'customer_id FK', 'account_id FK', 'relationship_type', 'effective_from', 'effective_to'],
    hiddenRows: ['lineage_tag', 'record_owner'],
  },
  {
    id: 'mr1',
    x: 1102,
    y: 232,
    w: 226,
    h: 172,
    title: 'fact_inventory',
    rows: [
      'inventory_id PK',
      'product_id FK',
      'store_id FK',
      'on_hand_qty',
      'reserved_qty',
      'safety_stock',
      'snapshot_ts',
    ],
    hiddenRows: ['cycle_count_id', 'forecast_bucket'],
  },
  {
    id: 'mr2',
    x: 924,
    y: 266,
    w: 170,
    h: 132,
    title: 'dim_store',
    rows: ['store_id PK', 'store_name', 'region_code', 'country', 'channel', 'opened_on'],
    hiddenRows: ['source_erp_id', 'area_cluster'],
  },
  {
    id: 'sl1',
    x: 288,
    y: 736,
    w: 182,
    h: 132,
    title: 'agg_daily_revenue',
    rows: ['agg_date_key PK', 'store_id FK', 'gross_revenue', 'net_revenue', 'order_count'],
    hiddenRows: ['currency_code', 'refresh_batch_id'],
  },
  {
    id: 'sr1',
    x: 906,
    y: 738,
    w: 184,
    h: 132,
    title: 'map_product_category',
    rows: ['map_id PK', 'product_id FK', 'category_id FK', 'taxonomy_version', 'effective_to'],
    hiddenRows: ['lineage_ref', 'source_map_key'],
  },
  {
    id: 'bl2',
    x: 28,
    y: 706,
    w: 180,
    h: 126,
    title: 'dim_channel',
    rows: ['channel_id PK', 'channel_name', 'channel_type', 'region_code', 'active_flag'],
    hiddenRows: ['source_pos_id'],
  },
  {
    id: 'br2',
    x: 1158,
    y: 706,
    w: 180,
    h: 126,
    title: 'bridge_store_region',
    rows: ['bridge_id PK', 'store_id FK', 'region_id FK', 'effective_from', 'effective_to'],
    hiddenRows: ['mapping_source'],
  },
  {
    id: 'midl',
    x: 24,
    y: 466,
    w: 192,
    h: 142,
    title: 'fact_returns',
    rows: ['return_id PK', 'sales_id FK', 'product_id FK', 'return_reason', 'refund_amount', 'return_ts'],
    hiddenRows: ['restock_flag'],
  },
  {
    id: 'midr',
    x: 1158,
    y: 466,
    w: 180,
    h: 142,
    title: 'dim_promotion',
    rows: ['promotion_id PK', 'promo_code', 'discount_pct', 'start_date', 'end_date'],
    hiddenRows: ['campaign_id'],
  },
];

export function getTableDefs(isMobile: boolean, isTablet: boolean): TableDef[] {
  if (isMobile) return MOBILE_TABLES;
  if (isTablet) return TABLET_TABLES;
  return DESKTOP_TABLES;
}

// Orthogonal relationship paths (desktop/tablet coordinate space). Hidden
// automatically on mobile by WarehouseBlueprint.
export const CONNECTORS: ConnectorDef[] = [
  { id: 'c01', d: 'M 218 108 H 226 V 116 H 226' },
  { id: 'c02', d: 'M 396 116 H 514 V 212 H 676' },
  { id: 'c03', d: 'M 240 294 H 492 V 294 H 676' },
  { id: 'c04', d: 'M 426 316 H 584 V 316 H 676' },
  { id: 'c05', d: 'M 426 372 H 612 V 426 H 676' },
  { id: 'c06', d: 'M 956 112 H 824 V 112 H 676' },
  { id: 'c07', d: 'M 1124 112 H 906 V 214 H 676' },
  { id: 'c08', d: 'M 1102 294 H 896 V 294 H 676' },
  { id: 'c09', d: 'M 1094 332 H 886 V 426 H 676' },
  { id: 'c10', d: 'M 924 310 H 852 V 310 H 676' },
  { id: 'c11', d: 'M 240 262 H 312 V 188 H 396' },
  { id: 'c12', d: 'M 426 286 H 474 V 172 H 396', secondary: true },
  { id: 'c13', d: 'M 956 166 H 860 V 198 H 676', secondary: true },
  { id: 'c14', d: 'M 1102 262 H 1060 V 166 H 1124', secondary: true },
  { id: 'c15', d: 'M 240 386 H 312 V 512 H 548', secondary: true },
  { id: 'c16', d: 'M 924 372 H 850 V 518 H 806', secondary: true },
  { id: 'c17', d: 'M 548 512 H 676 V 512 H 806' },
  { id: 'c18', d: 'M 396 162 H 530 V 192 H 676', secondary: true },
  { id: 'c19', d: 'M 470 768 H 560 V 632 H 676' },
  { id: 'c20', d: 'M 470 812 H 636 V 812 H 806', secondary: true },
  { id: 'c21', d: 'M 906 774 H 842 V 640 H 806' },
  { id: 'c22', d: 'M 906 816 H 856 V 816 H 676', secondary: true },
];

// Small non-glowing CAD-style joint markers (rotated squares) at select
// connector junctions — explicitly no circles per the design brief.
export const JOINT_POINTS: { x: number; y: number }[] = [
  { x: 224, y: 112 },
  { x: 396, y: 116 },
  { x: 1124, y: 112 },
  { x: 924, y: 310 },
  { x: 240, y: 294 },
  { x: 1094, y: 332 },
  { x: 470, y: 768 },
  { x: 470, y: 812 },
  { x: 906, y: 774 },
  { x: 906, y: 816 },
];

export const TICK_X = [84, 220, 368, 522, 678, 842, 1010, 1180, 1288];
export const TICK_Y = [80, 180, 300, 420, 540, 660, 780];

export const DRAFTING_LABELS: { x: number; y: number; text: string }[] = [
  { x: 52, y: 54, text: 'MODEL_04' },
  { x: 188, y: 54, text: 'WAREHOUSE_LAYER' },
  { x: 396, y: 54, text: 'REV_02' },
  { x: 1110, y: 54, text: 'DW_SCHEMA' },
  { x: 1224, y: 54, text: 'SHEET 1 OF 4' },
  { x: 54, y: 882, text: 'GRAIN: TRANSACTION' },
  { x: 300, y: 882, text: 'RELATIONSHIP ONE:MANY' },
  { x: 612, y: 882, text: 'SOURCE_MAPPING VERIFIED' },
  { x: 990, y: 882, text: 'SCALE 1:100' },
];

export type AnnotationBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
};

// Technical note panels revealed only within the hover spotlight.
export const ANNOTATION_BOXES: AnnotationBox[] = [
  {
    x: 446,
    y: 66,
    w: 162,
    h: 88,
    lines: ['lookup_region_map', 'FK lineage: customer_id → bridge_customer_account', 'MODEL_STATUS: VERIFIED'],
  },
  {
    x: 754,
    y: 552,
    w: 178,
    h: 94,
    lines: ['stg_source_mapping', 'GRAIN: TRANSACTION | REL: ONE:MANY', 'SOURCE_SYNC: 15m WINDOW'],
  },
];
