export interface Company {
  id: number;
  name: string;
  industry: string;
  main_constraint: string;
  priority_metric: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreatePayload {
  name: string;
  industry: "Manufacturing" | "Food & Beverage" | "Retail" | "Pharma" | "Other";
  main_constraint: "Cost" | "Speed" | "Quality" | "Capacity";
  priority_metric: "Cost Reduction" | "Speed" | "Stock Minimization";
}

export interface Scenario {
  id: number;
  company_id: number;
  user_id: number;
  question: string;
  narrative_summary: string;
  simulation_result: Record<string, unknown>;
  bottlenecks: Array<Record<string, unknown>>;
  action_plan: Record<string, unknown>;
  agent_score: number;
  created_at: string;
}

export type ColumnMappingConfidence = "exact" | "fuzzy" | "ai_inferred";

export interface ColumnMappingReportItem {
  source_column: string;
  target_field: string;
  confidence: ColumnMappingConfidence;
}

export interface UploadResponse {
  company_id: number;
  rows_uploaded: number;
  columns_validated: string[];
  products: string[];
  mapping_report: ColumnMappingReportItem[];
  unmapped_source_columns: string[];
  ai_mapping_used: boolean;
}

export interface BenchmarkQuestionComparison {
  question: string;
  plain: {
    response: { answer: string };
    score: number;
    evaluation: BenchmarkEvaluation;
  };
  agent: {
    response: {
      answer: string;
      simulation?: Record<string, unknown>;
      bottlenecks?: Array<Record<string, unknown>>;
      action_plan?: Record<string, unknown>;
    };
    score: number;
    evaluation: BenchmarkEvaluation;
  };
  score_delta: number;
}

export interface BenchmarkLayerScore {
  score: number;
  max: number;
}

export interface BenchmarkEvaluation {
  total_score: number;
  max_possible: number;
  grade: "Excellent" | "Good" | "Average" | "Below Average" | "Needs Improvement";
  strengths: string[];
  weaknesses: string[];
  layer_breakdown: {
    data_specificity: BenchmarkLayerScore;
    bottleneck_accuracy: BenchmarkLayerScore;
    action_specificity: BenchmarkLayerScore;
    completeness: BenchmarkLayerScore;
    consistency: BenchmarkLayerScore;
  };
}

export interface BenchmarkQuestionComparisonLegacy {
  question: string;
  plain: {
    response: { answer: string };
    score: number;
  };
  agent: {
    response: {
      answer: string;
      simulation?: Record<string, unknown>;
      bottlenecks?: Array<Record<string, unknown>>;
      action_plan?: Record<string, unknown>;
    };
    score: number;
  };
  score_delta: number;
}

export interface BenchmarkSummary {
  agent_total: number;
  plain_total: number;
  agent_average: number;
  plain_average: number;
  average_delta: number;
  winner: "agent" | "plain";
  agent_grade: string;
  plain_grade: string;
  agent_layer_average: Record<string, number>;
  plain_layer_average: Record<string, number>;
}

export interface BenchmarkComparisonData {
  questions: string[];
  results: BenchmarkQuestionComparison[];
  summary: BenchmarkSummary;
}

export interface BenchmarkResult {
  id: number;
  company_id: number;
  agent_score: number;
  default_score: number;
  comparison_data: BenchmarkComparisonData;
  created_at: string;
}
