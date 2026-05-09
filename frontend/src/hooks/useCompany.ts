import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";

import { axiosClient } from "../lib/axios";
import type {
  BenchmarkResult,
  Company,
  CompanyCreatePayload,
  Scenario,
  UploadResponse
} from "../types/company";

function apiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.response?.data?.detail ?? "Request failed.";
}

export function useCompaniesQuery() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await axiosClient.get<Company[]>("/companies");
      return response.data;
    }
  });
}

export function useCompanyScenariosQuery(companyId: number, enabled = true) {
  return useQuery({
    queryKey: ["company-scenarios", companyId],
    enabled,
    queryFn: async () => {
      const response = await axiosClient.get<Scenario[]>(`/companies/${companyId}/scenarios`);
      return response.data;
    }
  });
}

export function useCreateCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CompanyCreatePayload) => {
      const response = await axiosClient.post<Company>("/companies", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created successfully.");
    },
    onError: (error) => toast.error(apiErrorMessage(error))
  });
}

export function useUpdateCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, payload }: { companyId: number; payload: Partial<CompanyCreatePayload> }) => {
      const response = await axiosClient.put<Company>(`/companies/${companyId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated.");
    },
    onError: (error) => toast.error(apiErrorMessage(error))
  });
}

export function useDeleteCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: number) => {
      await axiosClient.delete(`/companies/${companyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted.");
    },
    onError: (error) => toast.error(apiErrorMessage(error))
  });
}

export function useUploadProductionCsvMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      file,
      onProgress
    }: {
      companyId: number;
      file: File;
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axiosClient.post<UploadResponse>(`/companies/${companyId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (!event.total) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(progress);
        }
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["company-data", variables.companyId] });
      const report = data.mapping_report ?? [];
      const exact = report.filter((r) => r.confidence === "exact").length;
      const fuzzy = report.filter((r) => r.confidence === "fuzzy").length;
      const ai = report.filter((r) => r.confidence === "ai_inferred").length;
      const unmapped = data.unmapped_source_columns ?? [];
      const extra =
        unmapped.length > 0 ? ` Extra columns ignored: ${unmapped.join(", ")}.` : "";
      toast.success(
        `Uploaded ${data.rows_uploaded} rows. Mapping: ${exact} exact, ${fuzzy} fuzzy, ${ai} AI.${data.ai_mapping_used ? " Groq used." : ""}${extra}`
      );
    },
    onError: (error) => toast.error(apiErrorMessage(error))
  });
}

export function useRunScenarioMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, question }: { companyId: number; question: string }) => {
      const response = await axiosClient.post<{
        id: number;
        question: string;
        narrative_summary: string;
        simulation_result: Record<string, unknown>;
        bottlenecks: Array<Record<string, unknown>>;
        action_plan: Record<string, unknown>;
        agent_score: number;
        created_at: string;
      }>(`/companies/${companyId}/scenarios`, { question });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["company-scenarios", variables.companyId] });
      toast.success("Scenario completed.");
    },
    onError: (error) => toast.error(apiErrorMessage(error))
  });
}

export function useLatestBenchmarkQuery(companyId: number, enabled = true) {
  return useQuery({
    queryKey: ["company-benchmark", companyId],
    enabled,
    queryFn: async () => {
      const response = await axiosClient.get<BenchmarkResult>(`/companies/${companyId}/benchmark`);
      return response.data;
    }
  });
}

export function useRunBenchmarkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: number) => {
      const response = await axiosClient.post<{
        benchmark_id: number;
        company_id: number;
        agent_score: number;
        default_score: number;
        comparison_data: BenchmarkResult["comparison_data"];
        created_at: string;
      }>(`/companies/${companyId}/benchmark`);
      return response.data;
    },
    onSuccess: (_, companyId) => {
      queryClient.invalidateQueries({ queryKey: ["company-benchmark", companyId] });
      toast.success("Benchmark run completed.");
    },
    onError: (error) => toast.error(apiErrorMessage(error))
  });
}
