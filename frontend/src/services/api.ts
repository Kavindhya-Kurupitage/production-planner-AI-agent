import type { PlanRequest, PlanResponse } from "../types/planner";
import { AxiosError } from "axios";
import { axiosClient } from "../lib/axios";

interface BackendPlanRequest {
  product_name: string;
  target_units: number;
  timeframe_days: number;
  constraints: string;
}

export async function generateProductionPlan(payload: PlanRequest): Promise<PlanResponse> {
  const requestBody: BackendPlanRequest = {
    product_name: payload.productName,
    target_units: payload.targetUnits,
    timeframe_days: payload.timeframeDays,
    constraints: payload.constraints
  };

  try {
    const response = await axiosClient.post<PlanResponse>("/planner/generate", requestBody);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    throw new Error(axiosError.response?.data?.detail ?? "API request failed.");
  }
}
