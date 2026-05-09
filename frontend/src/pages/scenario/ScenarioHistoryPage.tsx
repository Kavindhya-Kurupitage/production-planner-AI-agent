import { Link, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

import { PageWrapper } from "../../components/layout/PageWrapper";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useCompaniesQuery, useCompanyScenariosQuery } from "../../hooks/useCompany";
import type { Scenario } from "../../types/company";
import { generatePlanPDF } from "../../utils/generatePlanPDF";

function previewSummary(text: string): string {
  const cleaned = text?.trim();
  if (!cleaned) return "Summary not available for this scenario. Please re-run the analysis.";
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ");
}

export function ScenarioHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const companyId = Number(id);
  const scenariosQuery = useCompanyScenariosQuery(companyId, Number.isFinite(companyId));
  const companiesQuery = useCompaniesQuery();
  const company = (companiesQuery.data ?? []).find((item) => item.id === companyId);

  const downloadPdf = (scenario: Scenario) => {
    try {
      const simulation = scenario.simulation_result as { products?: Array<Record<string, unknown>> };
      const plan = scenario.action_plan as { timeline?: Array<Record<string, unknown>> };
      const bottlenecksRaw = scenario.bottlenecks as unknown;
      const normalizedBottlenecks = Array.isArray(bottlenecksRaw)
        ? bottlenecksRaw
        : typeof bottlenecksRaw === "object" && bottlenecksRaw !== null && "items" in bottlenecksRaw
          ? ((bottlenecksRaw as { items?: Array<Record<string, unknown>> }).items ?? [])
          : [];
      generatePlanPDF({
        companyName: company?.name ?? "Company",
        industry: company?.industry,
        question: scenario.question,
        createdAt: scenario.created_at,
        narrativeSummary: scenario.narrative_summary,
        simulationProducts: (simulation?.products ?? []) as never,
        bottlenecks: normalizedBottlenecks as never,
        actionTimeline: (plan?.timeline ?? []) as never,
        agentScore: scenario.agent_score ?? 0
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF generation failed. Please try again.");
    }
  };

  return (
    <PageWrapper title="Scenario History" subtitle="Review previous simulations and AI action plans.">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Past Scenarios</h2>
            <Link to={`/companies/${companyId}/scenario`}>
              <Button>Run New Scenario</Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {(scenariosQuery.data ?? []).map((scenario) => (
              <div key={scenario.id} className="rounded-lg border border-border-subtle bg-bg-elevated p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{scenario.question}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-accent/50 text-accent transition hover:bg-accent hover:text-black"
                      onClick={() => downloadPdf(scenario)}
                      title="Download PDF report"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <Badge variant="info">Scenario #{scenario.id}</Badge>
                  </div>
                </div>
                <p className="text-xs text-[#555555]">{new Date(scenario.created_at).toLocaleString()}</p>
                <p className="mt-1 text-[12px] italic text-[#555555]">{previewSummary(scenario.narrative_summary)}</p>
              </div>
            ))}
            {(scenariosQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-[#aaaaaa]">No scenarios available yet for this company.</p>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
