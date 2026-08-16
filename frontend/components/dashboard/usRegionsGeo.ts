/**
 * A small, self-contained schematic map of the five standard US Census
 * regions, registered as an ECharts "map" so region-level breakdowns
 * (e.g. customers.region, suppliers.supplier_region) can render as a
 * real choropleth without pulling in an external GeoJSON asset or a
 * geocoding/mapping API. The shapes are stylized (roughly laid out like
 * the US, not literal state borders) — good enough for a clean regional
 * choropleth, not a literal atlas.
 *
 * Region names match the values already produced by the demo dataset
 * (Northeast, Midwest, South, Southwest, West) but nothing here is
 * demo-specific — any dataset using these five census region names
 * benefits, and regions with no matching data simply render at zero.
 */
// Imports the full 'echarts' bundle (same module echarts-for-react uses
// internally) rather than 'echarts/core', so the map/geo component is
// already installed and registerMap has something to register into.
import * as echarts from 'echarts';

const US_REGIONS_MAP_NAME = 'US_REGIONS';

const US_REGIONS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'West' },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [3.2, 0], [3.2, 6], [0, 6], [0, 0]]] },
    },
    {
      type: 'Feature',
      properties: { name: 'Southwest' },
      geometry: { type: 'Polygon', coordinates: [[[3.2, 0], [5.6, 0], [5.6, 3], [3.2, 3], [3.2, 0]]] },
    },
    {
      type: 'Feature',
      properties: { name: 'Midwest' },
      geometry: { type: 'Polygon', coordinates: [[[3.2, 3], [6.4, 3], [6.4, 6], [3.2, 6], [3.2, 3]]] },
    },
    {
      type: 'Feature',
      properties: { name: 'South' },
      geometry: { type: 'Polygon', coordinates: [[[5.6, 0], [8.8, 0], [8.8, 3], [5.6, 3], [5.6, 0]]] },
    },
    {
      type: 'Feature',
      properties: { name: 'Northeast' },
      geometry: { type: 'Polygon', coordinates: [[[6.4, 3], [8.8, 3], [8.8, 6], [6.4, 6], [6.4, 3]]] },
    },
  ],
} as const;

let registered = false;

/** Idempotent — safe to call on every render. */
export function ensureUsRegionsMapRegistered(): string {
  if (!registered) {
    echarts.registerMap(US_REGIONS_MAP_NAME, US_REGIONS_GEOJSON as unknown as Parameters<typeof echarts.registerMap>[1]);
    registered = true;
  }
  return US_REGIONS_MAP_NAME;
}
