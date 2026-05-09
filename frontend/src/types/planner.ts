export interface PlanRequest {
  productName: string;
  targetUnits: number;
  timeframeDays: number;
  constraints: string;
}

export interface PlanResponse {
  id: number;
  product_name: string;
  target_units: number;
  timeframe_days: number;
  constraints: string;
  generated_plan: string;
}
