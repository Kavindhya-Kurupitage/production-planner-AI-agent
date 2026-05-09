/**
 * Mirrors backend COLUMN_ALIASES / REQUIRED_FIELDS for client-side CSV preview validation.
 */

export const REQUIRED_CSV_FIELDS = [
  "product_name",
  "daily_capacity",
  "current_demand",
  "stock_level",
  "lead_time_days"
] as const;

export type RequiredCsvField = (typeof REQUIRED_CSV_FIELDS)[number];

export const COLUMN_ALIASES: Record<RequiredCsvField, string[]> = {
  product_name: [
    "product",
    "item",
    "name",
    "product_name",
    "item_name",
    "sku_name",
    "description"
  ],
  daily_capacity: [
    "daily_capacity",
    "daily_capacity_units",
    "capacity",
    "max_capacity",
    "production_capacity",
    "capacity_per_day",
    "daily_output"
  ],
  current_demand: [
    "current_demand",
    "current_demand_units",
    "demand",
    "daily_demand",
    "demand_today",
    "orders",
    "required_units",
    "sales_demand"
  ],
  stock_level: [
    "stock_level",
    "stock_level_units",
    "stock",
    "inventory",
    "units_in_stock",
    "on_hand",
    "warehouse_stock",
    "available_stock"
  ],
  lead_time_days: [
    "lead_time_days",
    "lead_time",
    "lead_days",
    "supplier_lead_time",
    "delivery_days",
    "days_to_deliver",
    "restock_days"
  ]
};

export function normalizeCsvHeader(name: string): string {
  return name
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .join(" ");
}

function normalizedAliasSet(field: RequiredCsvField): Set<string> {
  const names = [field, ...COLUMN_ALIASES[field]];
  return new Set(names.map(normalizeCsvHeader));
}

/** True if headers satisfy all required fields via exact name or alias (same rules as backend layer 1). */
export function csvHeadersSatisfyRequiredFields(headers: string[]): boolean {
  return getMissingRequiredCsvFields(headers).length === 0;
}

export function getMissingRequiredCsvFields(headers: string[]): RequiredCsvField[] {
  const used = new Set<string>();
  const missing: RequiredCsvField[] = [];

  for (const field of REQUIRED_CSV_FIELDS) {
    const aliasNorms = normalizedAliasSet(field);
    let matched = false;
    for (const col of headers) {
      if (used.has(col)) continue;
      if (aliasNorms.has(normalizeCsvHeader(col))) {
        used.add(col);
        matched = true;
        break;
      }
    }
    if (!matched) missing.push(field);
  }
  return missing;
}
