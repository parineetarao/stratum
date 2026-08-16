/**
 * Real US state boundaries (public-domain GeoJSON, ~85KB), registered
 * once with ECharts as a proper `map` series source so a geographic
 * breakdown renders as an actual choropleth rather than a schematic
 * shape. Also normalizes the common ways a "state" column shows up in
 * source data (USPS code, full name, mixed case) to the exact feature
 * names the GeoJSON uses, since ECharts matches map data by name.
 */
import * as echarts from 'echarts';
import usStatesGeoJson from './data/us-states.geo.json';

const US_STATES_MAP_NAME = 'USA';

let registered = false;

/** Idempotent — safe to call on every render. */
export function ensureUsStatesMapRegistered(): string {
  if (!registered) {
    echarts.registerMap(US_STATES_MAP_NAME, usStatesGeoJson as unknown as Parameters<typeof echarts.registerMap>[1]);
    registered = true;
  }
  return US_STATES_MAP_NAME;
}

const STATE_NAMES: string[] = (usStatesGeoJson as { features: { properties: { name: string } }[] }).features.map(
  (f) => f.properties.name
);

export const US_STATE_NAME_SET = new Set(STATE_NAMES.map((n) => n.toLowerCase()));

const USPS_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico',
};

/**
 * Normalizes a raw state value ("CA", "california", "New York") to the
 * exact feature name the registered GeoJSON uses ("California",
 * "New York"), or null if it doesn't resolve to a real US state — the
 * caller uses that null to decide whether the data is state-shaped at
 * all before ever handing it to the map series.
 */
export function normalizeStateName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.length === 2) {
    const full = USPS_TO_NAME[trimmed.toUpperCase()];
    if (full) return full;
  }

  const match = STATE_NAMES.find((n) => n.toLowerCase() === trimmed.toLowerCase());
  return match || null;
}

export function isRecognizedUsState(raw: string | null | undefined): boolean {
  return normalizeStateName(raw) !== null;
}
