import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  PlayCircle,
  Sparkles,
  TimerReset,
  Wrench
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";

import { PageWrapper } from "../../components/layout/PageWrapper";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { useCompaniesQuery, useRunScenarioMutation } from "../../hooks/useCompany";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { generatePlanPDF } from "../../utils/generatePlanPDF";

type SimulationProduct = {
  product_name: string;
  current_demand: number;
  new_demand: number;
  daily_capacity: number;
  capacity_gap: number;
};

type BottleneckItem = {
  product_name: string;
  severity: "critical" | "warning" | "ok";
  days_until_stockout: number;
  daily_shortfall: number;
};

type TimelineAction = {
  product_name: string;
  action: string;
  start_day: number;
  duration_days: number;
  reason: string;
  estimated_impact_units_per_day: number;
};

const QUICK_SCENARIOS = [
  { label: "+10% Demand", question: "What if demand increases by 10%?" },
  { label: "+20% Demand", question: "What if demand increases by 20%?" },
  { label: "+50% Demand", question: "What if demand increases by 50%?" },
  { label: "Supplier Delay", question: "What happens if our main supplier is delayed by 2 weeks?" }
];

const THINKING_STEPS = [
  "Loading business profile",
  "Simulating demand",
  "Detecting bottlenecks",
  "Generating plan"
];

export function ScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const routeCompanyId = id ? Number(id) : null;
  const companiesQuery = useCompaniesQuery();
  const runScenarioMutation = useRunScenarioMutation();

  const companies = companiesQuery.data ?? [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [question, setQuestion] = useState("What if demand increases by 20%?");
  const [thinkingOpen, setThinkingOpen] = useState(true);
  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [revealPhase, setRevealPhase] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (routeCompanyId) {
      setSelectedCompanyId(routeCompanyId);
      return;
    }
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId, routeCompanyId]);

  useEffect(() => {
    if (!runScenarioMutation.isPending) return;
    setVisibleStepCount(0);
    const timers = THINKING_STEPS.map((_, index) =>
      window.setTimeout(() => setVisibleStepCount(index + 1), 450 * (index + 1))
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runScenarioMutation.isPending]);

  useEffect(() => {
    if (!runScenarioMutation.data) return;
    setRevealPhase(0);
    const timers = [1, 2, 3, 4, 5].map((phase, index) =>
      window.setTimeout(() => setRevealPhase(phase), 220 * (index + 1))
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runScenarioMutation.data]);

  const simulationProducts = useMemo(() => {
    const simulation = runScenarioMutation.data?.simulation_result as { products?: SimulationProduct[] } | undefined;
    return simulation?.products ?? [];
  }, [runScenarioMutation.data]);

  const bottlenecks = useMemo(
    () => (runScenarioMutation.data?.bottlenecks as BottleneckItem[] | undefined) ?? [],
    [runScenarioMutation.data]
  );
  const timeline = useMemo(() => {
    const actionPlan = runScenarioMutation.data?.action_plan as { timeline?: TimelineAction[] } | undefined;
    return actionPlan?.timeline ?? [];
  }, [runScenarioMutation.data]);
  const selectedCompany = useMemo(
    () => companies.find((item) => item.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );
  const narrativeSummary = runScenarioMutation.data?.narrative_summary?.trim() || "";
  const summaryParagraphs = useMemo(
    () =>
      (narrativeSummary || "Summary not available for this scenario. Please re-run the analysis.")
        .split(/\n\s*\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    [narrativeSummary]
  );

  const chartData = simulationProducts.map((item) => ({
    product: item.product_name,
    demand: item.new_demand,
    capacity: item.daily_capacity
  }));

  const runAgent = async () => {
    if (!selectedCompanyId) return;
    await runScenarioMutation.mutateAsync({
      companyId: selectedCompanyId,
      question
    });
  };

  const exportJson = () => {
    if (!runScenarioMutation.data) return;
    const blob = new Blob([JSON.stringify(runScenarioMutation.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `scenario-${runScenarioMutation.data.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadReport = async () => {
    if (!runScenarioMutation.data) return;
    try {
      setIsGeneratingPdf(true);
      generatePlanPDF({
        companyName: selectedCompany?.name ?? "Company",
        industry: selectedCompany?.industry,
        question: runScenarioMutation.data.question,
        createdAt: runScenarioMutation.data.created_at,
        narrativeSummary: runScenarioMutation.data.narrative_summary,
        simulationProducts,
        bottlenecks,
        actionTimeline: timeline,
        agentScore: runScenarioMutation.data.agent_score
      });
      setPdfDone(true);
      window.setTimeout(() => setPdfDone(false), 2000);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF generation failed. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <PageWrapper title="Scenario Runner" subtitle="Run AI what-if scenarios with transparent tool-driven reasoning.">
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Input & Controls</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-[#aaaaaa]">
                  Company
                  <select
                    className="glass-subtle rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 px-3 py-2 text-sm text-white outline-none focus:border-accent"
                    value={selectedCompanyId ?? ""}
                    onChange={(event) => setSelectedCompanyId(Number(event.target.value))}
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-[#aaaaaa]">
                  Scenario question
                  <textarea
                    className="min-h-28 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 px-3 py-2 text-sm text-white outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="What if demand increases by 20%?"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SCENARIOS.map((item) => (
                    <Button key={item.label} variant="ghost" onClick={() => setQuestion(item.question)}>
                      {item.label}
                    </Button>
                  ))}
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={runAgent}
                  disabled={runScenarioMutation.isPending || !selectedCompanyId || !question.trim()}
                >
                  {runScenarioMutation.isPending ? <LoadingSpinner /> : <PlayCircle className="h-4 w-4" />}
                  {runScenarioMutation.isPending ? "Running Agent..." : "Run Agent"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-3">
          <div className="flex justify-end">
            <button
              type="button"
              className="glass-subtle inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-accent px-4 py-2 text-[13px] font-semibold text-accent transition hover:bg-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              onClick={downloadReport}
              disabled={!runScenarioMutation.data || isGeneratingPdf}
              title={!runScenarioMutation.data ? "Run a scenario first to download the report" : ""}
            >
              {isGeneratingPdf ? <LoadingSpinner /> : null}
              {isGeneratingPdf ? "Generating PDF..." : pdfDone ? "✓ Downloaded!" : "↓ Download PDF Report"}
            </button>
          </div>
          <Card>
            <CardHeader>
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setThinkingOpen((current) => !current)}
              >
                <h2 className="text-lg font-semibold text-white">Agent Thinking Steps</h2>
                {thinkingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CardHeader>
            {thinkingOpen ? (
              <CardBody>
                <div className="space-y-2">
                  {THINKING_STEPS.map((step, index) => {
                    const completed =
                      runScenarioMutation.data !== undefined || (runScenarioMutation.isPending && visibleStepCount > index);
                    return (
                      <div key={step} className="glass-subtle flex items-center justify-between rounded-lg border border-border-subtle bg-bg-elevated/50 px-3 py-2">
                        <span className="text-sm text-[#cccccc]">
                          Step {index + 1}: {step}
                        </span>
                        {completed ? (
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                        ) : (
                          <TimerReset className="h-4 w-4 animate-spin text-accent" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            ) : null}
          </Card>

          {runScenarioMutation.data ? (
            <>
              {revealPhase >= 1 ? (
                <Card className="animate-in fade-in duration-300">
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Simulation Results</h3>
                  </CardHeader>
                  <CardBody>
                    <ResponsiveTable
                      data={simulationProducts}
                      columns={[
                        { key: "product", title: "Product", render: (item) => item.product_name },
                        { key: "current", title: "Current Demand", render: (item) => item.current_demand },
                        { key: "new", title: "New Demand", render: (item) => <span className="text-accent">{item.new_demand}</span> },
                        { key: "capacity", title: "Capacity", render: (item) => item.daily_capacity },
                        {
                          key: "gap",
                          title: "Gap",
                          render: (item) => {
                            const gap = item.daily_capacity - item.new_demand;
                            return <span className={gap < 0 ? "text-danger" : "text-success"}>{gap}</span>;
                          }
                        }
                      ]}
                      mobileCardRenderer={(item) => {
                        const gap = item.daily_capacity - item.new_demand;
                        return (
                          <div className="glass-subtle rounded-lg border border-border-subtle bg-bg-elevated/50 p-3">
                            <p className="text-sm font-semibold text-white">{item.product_name}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#aaaaaa]">
                              <p>Current: {item.current_demand}</p>
                              <p className="text-accent">New: {item.new_demand}</p>
                              <p>Capacity: {item.daily_capacity}</p>
                              <p className={gap < 0 ? "text-danger" : "text-success"}>Gap: {gap}</p>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </CardBody>
                </Card>
              ) : null}

              {revealPhase >= 2 ? (
                <Card className="animate-in fade-in duration-300">
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Capacity vs Demand</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="glass-subtle h-64 w-full rounded-lg border border-white/5 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                          <XAxis dataKey="product" stroke="#555555" />
                          <YAxis stroke="#555555" />
                          <Tooltip
                            contentStyle={{
                              background: "#0f0f0fd9",
                              border: "1px solid #2a2a2a",
                              borderRadius: 8,
                              color: "#ffffff"
                            }}
                          />
                          <Bar dataKey="demand" fill="#F5C518" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="capacity" fill="#555555" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              {revealPhase >= 3 ? (
                <Card className="animate-in fade-in duration-300">
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Bottlenecks</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid gap-3 md:grid-cols-2">
                      {bottlenecks.length === 0 ? (
                        <p className="text-sm text-[#aaaaaa]">No bottlenecks detected for this scenario.</p>
                      ) : (
                        bottlenecks.map((item) => (
                          <div
                            key={item.product_name}
                            className={`glass-subtle rounded-lg border border-border-subtle bg-bg-elevated/50 p-3 ${
                              item.severity === "critical"
                                ? "border-l-4 border-l-danger"
                                : item.severity === "warning"
                                  ? "border-l-4 border-l-warning"
                                  : "border-l-4 border-l-accent"
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-white">{item.product_name}</h4>
                              <Badge variant={item.severity}>{item.severity.toUpperCase()}</Badge>
                            </div>
                            <p className="text-sm text-[#aaaaaa]">Days until stockout: {item.days_until_stockout}</p>
                            <p className="text-sm text-[#555555]">Daily shortfall: {item.daily_shortfall}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              {revealPhase >= 4 ? (
                <Card className="animate-in fade-in duration-300">
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Action Plan Timeline</h3>
                  </CardHeader>
                  <CardBody>
                    <ol className="space-y-3">
                      {timeline.map((action, index) => (
                        <li key={`${action.product_name}-${action.action}-${index}`} className="glass-subtle rounded-lg border border-border-subtle bg-bg-elevated/50 p-3">
                          <div className="mb-1 flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-accent" />
                            <span className="text-sm font-semibold text-white">
                              {action.action} for {action.product_name}
                            </span>
                          </div>
                          <p className="text-sm text-[#aaaaaa]">{action.reason}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#aaaaaa]">
                            <span className="rounded border border-white/10 bg-[#0a0a0a]/75 px-2 py-1">Start: Day {action.start_day}</span>
                            <span className="rounded border border-white/10 bg-[#0a0a0a]/75 px-2 py-1">Duration: {action.duration_days} days</span>
                            <span className="rounded border border-white/10 bg-[#0a0a0a]/75 px-2 py-1">Impact: +{action.estimated_impact_units_per_day}/day</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardBody>
                </Card>
              ) : null}

              {revealPhase >= 5 ? (
                <div className="flex justify-end">
                  <Button variant="secondary" className="gap-2" onClick={exportJson}>
                    <Download className="h-4 w-4" /> Export JSON
                  </Button>
                </div>
              ) : null}

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-white">Agent Summary</h3>
                </CardHeader>
                <CardBody>
                  <div className="rounded-[10px] border border-border-subtle border-l-[3px] border-l-accent bg-bg-surface p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-[13px] uppercase tracking-[0.8px] text-[#555555]">AI Summary</span>
                      <span className="rounded-[20px] border border-[#3a3200] bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent">
                        Generated by ProdIQ Agent
                      </span>
                    </div>
                    <div className="space-y-3">
                      {summaryParagraphs.map((paragraph, index) => (
                        <p
                          key={`${paragraph.slice(0, 20)}-${index}`}
                          className={`${index === 0 ? "text-sm font-medium text-white" : "text-[13px] leading-[1.8] text-[#aaaaaa]"} animate-in fade-in`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    <div className="mt-4 border-t border-border-subtle pt-3 text-[11px] text-[#444444]">
                      Analysis based on {simulationProducts.length} products across {Math.max(1, simulationProducts.length)} categories
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody>
                <div className="flex items-center gap-2 text-[#aaaaaa]">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Run a scenario to see simulation, bottlenecks, and action timeline.
                </div>
              </CardBody>
            </Card>
          )}
          {runScenarioMutation.error ? (
            <Card>
              <CardBody>
                <div className="flex items-center gap-2 text-sm text-danger">
                  <AlertTriangle className="h-4 w-4" />
                  {(runScenarioMutation.error as Error).message}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
      {isMobile ? (
        <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),8px)] md:hidden">
          <button
            type="button"
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
            onClick={downloadReport}
            disabled={!runScenarioMutation.data || isGeneratingPdf}
            title={!runScenarioMutation.data ? "Run a scenario first to download the report" : ""}
          >
            {isGeneratingPdf ? <LoadingSpinner /> : null}
            {isGeneratingPdf ? "Generating PDF..." : pdfDone ? "✓ Downloaded!" : "↓ Download PDF Report"}
          </button>
        </div>
      ) : null}
    </PageWrapper>
  );
}
