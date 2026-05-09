import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { generateProductionPlan } from "../services/api";
import type { PlanRequest } from "../types/planner";

export function usePlanner() {
  const mutation = useMutation({
    mutationFn: (payload: PlanRequest) => generateProductionPlan(payload),
    onSuccess: () => {
      toast.success("Plan generated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return {
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
    plan: mutation.data ?? null,
    generatePlan: mutation.mutateAsync
  };
}
