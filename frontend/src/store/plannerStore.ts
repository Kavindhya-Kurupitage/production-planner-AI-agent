import type { PlanResponse } from "../types/planner";

export interface PlannerState {
  loading: boolean;
  error: string | null;
  plan: PlanResponse | null;
}

export const initialPlannerState: PlannerState = {
  loading: false,
  error: null,
  plan: null
};
