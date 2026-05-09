import { PlayCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageWrapper } from "../../components/layout/PageWrapper";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useCompaniesQuery, useLatestBenchmarkQuery, useRunBenchmarkMutation } from "../../hooks/useCompany";
import type { BenchmarkResult } from "../../types/company";

const LAYER_LABELS: Record<string, string> = {
  data_specificity: "Data Specificity",
  bottleneck_accuracy: "Bottleneck Accuracy",
  action_specificity: "Action Specificity",
  completeness: "Completeness",
  consistency: "Consistency"
};

const LAYER_MAX: Record<string, number> = {
  data_specificity: 2500,
  bottleneck_accuracy: 2000,
  action_specificity: 2000,
  completeness: 2000,
  consistency: 1500
};

function gradeBadgeClass(grade: string) {
  if (grade === "Excellent") return "border-[#0f2a00] bg-[#0a1a00] text-success";
  if (grade === "Good") return "border-[#3a3200] bg-accent-dim text-accent";
  if (grade === "Average") return "border-[#2a2a2a] bg-bg-elevated text-[#aaaaaa]";
  if (grade === "Below Average") return "border-[#2a1200] bg-[#1a0a00] text-warning";
  return "border-[#2a0000] bg-[#1a0000] text-danger";
}

function barColor(ratio: number) {
  if (ratio >= 0.8) return "#22c55e";
  if (ratio >= 0.6) return "#F5C518";
  if (ratio >= 0.4) return "#ff6b35";
  return "#ff4444";
}

export function BenchmarkPage() {
  const { id } = useParams<{ id: string }>();
  const routeCompanyId = id ? Number(id) : null;
  const companiesQuery = useCompaniesQuery();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  /** Keeps headline scores stable — avoids flicker when query refetches or mutation state toggles */
  const [pinnedScores, setPinnedScores] = useState<{ agent: number; plain: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [questionProgress, setQuestionProgress] = useState(0);
  const [displayAgentScore, setDisplayAgentScore] = useState(0);
  const [displayPlainScore, setDisplayPlainScore] = useState(0);
  const benchmarkMutation = useRunBenchmarkMutation();
  const latestBenchmarkQuery = useLatestBenchmarkQuery(selectedCompanyId ?? 0, selectedCompanyId !== null);

  const latestBenchmark = useMemo<BenchmarkResult | null>(
    () => (latestBenchmarkQuery.data ? latestBenchmarkQuery.data : null),
    [latestBenchmarkQuery.data]
  );

  const companies = companiesQuery.data ?? [];
  useEffect(() => {
    if (routeCompanyId) {
      setSelectedCompanyId(routeCompanyId);
      return;
    }
    if (!selectedCompanyId && companies.length > 0) setSelectedCompanyId(companies[0].id);
  }, [companies, selectedCompanyId, routeCompanyId]);

  useEffect(() => {
    setPinnedScores(null);
  }, [selectedCompanyId]);

  useEffect(() => {
    if (benchmarkMutation.data) {
      setPinnedScores({
        agent: benchmarkMutation.data.agent_score,
        plain: benchmarkMutation.data.default_score
      });
    }
  }, [benchmarkMutation.data]);

  useEffect(() => {
    if (benchmarkMutation.isPending) return;
    if (benchmarkMutation.data) return;
    if (latestBenchmark && latestBenchmark.company_id === selectedCompanyId) {
      setPinnedScores({
        agent: latestBenchmark.agent_score,
        plain: latestBenchmark.default_score
      });
    }
  }, [latestBenchmark, benchmarkMutation.isPending, benchmarkMutation.data, selectedCompanyId]);

  useEffect(() => {
    if (!benchmarkMutation.isPending) return;
    setProgress(0);
    const interval = window.setInterval(() => {
      setProgress((value) => {
        const next = Math.min(95, value + 4);
        setQuestionProgress(Math.min(5, Math.max(1, Math.ceil(next / 20))));
        return next;
      });
    }, 350);
    return () => window.clearInterval(interval);
  }, [benchmarkMutation.isPending]);

  useEffect(() => {
    if (!benchmarkMutation.data) return;
    setProgress(100);
    setQuestionProgress(5);
  }, [benchmarkMutation.data]);

  const currentData = useMemo(
    () =>
      benchmarkMutation.data
        ? {
            summary: benchmarkMutation.data.comparison_data.summary,
            comparison_data: benchmarkMutation.data.comparison_data,
            created_at: benchmarkMutation.data.created_at
          }
        : latestBenchmark
          ? {
              summary: latestBenchmark.comparison_data.summary,
              comparison_data: latestBenchmark.comparison_data,
              created_at: latestBenchmark.created_at
            }
          : null,
    [benchmarkMutation.data, latestBenchmark]
  );

  const headlineAgent =
    pinnedScores?.agent ?? (currentData ? Math.round(currentData.summary.agent_average) : null);
  const headlinePlain =
    pinnedScores?.plain ?? (currentData ? Math.round(currentData.summary.plain_average) : null);

  useEffect(() => {
    if (headlineAgent === null || headlinePlain === null) return;
    setDisplayAgentScore(0);
    setDisplayPlainScore(0);
    const ticks = 24;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      const ratio = Math.min(1, index / ticks);
      setDisplayAgentScore(Math.round(headlineAgent * ratio));
      setDisplayPlainScore(Math.round(headlinePlain * ratio));
      if (ratio >= 1) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [headlineAgent, headlinePlain]);

  const layerRows = useMemo(() => {
    if (!currentData) return [];
    return Object.entries(currentData.summary.agent_layer_average ?? {}).map(([key, score]) => {
      const max = LAYER_MAX[key] ?? 2000;
      const ratio = Number(score) / max;
      return {
        key,
        label: LAYER_LABELS[key] ?? key,
        score: Number(score),
        max,
        ratio
      };
    });
  }, [currentData]);

  const historicalData = useMemo(() => {
    if (!selectedCompanyId) return [];
    const key = `benchmark-history-${selectedCompanyId}`;
    const stored = localStorage.getItem(key);
    let parsed: Array<{ created_at: string; agent_score: number; plain_score: number }> = [];
    if (stored) {
      try {
        const candidate = JSON.parse(stored);
        parsed = Array.isArray(candidate) ? candidate : [];
      } catch {
        parsed = [];
        localStorage.removeItem(key);
      }
    }
    if (currentData && !parsed.some((row) => row.created_at === currentData.created_at)) {
      parsed.push({
        created_at: currentData.created_at,
        agent_score: currentData.summary.agent_average,
        plain_score: currentData.summary.plain_average
      });
      localStorage.setItem(key, JSON.stringify(parsed));
    }
    return parsed.slice(-10).map((row) => ({
      date: new Date(row.created_at).toLocaleDateString(),
      agent: row.agent_score,
      plain: row.plain_score
    }));
  }, [currentData, selectedCompanyId]);

  const runBenchmark = async () => {
    if (!selectedCompanyId) return;
    await benchmarkMutation.mutateAsync(selectedCompanyId);
    latestBenchmarkQuery.refetch();
  };

  return (
    <PageWrapper title="Benchmark Comparison" subtitle="Visually prove your agent outperforms a default AI baseline.">
      <Card className="border-accent/30">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Run Benchmark</h2>
              <p className="text-sm text-[#aaaaaa]">Runs 5 standard questions through both systems.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="dropdown-field glass-subtle rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-accent"
                value={selectedCompanyId ?? ""}
                onChange={(event) => setSelectedCompanyId(Number(event.target.value))}
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <Button className="gap-2" onClick={runBenchmark} disabled={benchmarkMutation.isPending || !selectedCompanyId}>
                {benchmarkMutation.isPending ? <LoadingSpinner /> : <PlayCircle className="h-4 w-4" />}
                {benchmarkMutation.isPending ? "Running..." : "Run Benchmark"}
              </Button>
            </div>
          </div>
          {(benchmarkMutation.isPending || progress > 0) && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-[#aaaaaa]">
                <span>Testing question {questionProgress || 1} of 5</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded bg-[#222]">
                <div className="h-2 rounded bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {currentData ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border-subtle bg-bg-surface/80">
              <CardBody>
                <p className="text-xs uppercase tracking-[0.8px] text-[#555555]">Your Agent</p>
                <p className="mt-2 text-4xl font-bold text-accent">
                  {displayAgentScore.toLocaleString()}
                </p>
                <p className="text-sm text-[#555555]">/ 10,000</p>
                <span className={`mt-3 inline-flex rounded-[20px] border px-2.5 py-1 text-xs font-semibold ${gradeBadgeClass(currentData.summary.agent_grade)}`}>
                  {currentData.summary.agent_grade}
                </span>
              </CardBody>
            </Card>
            <Card className="border-border-subtle bg-bg-surface/80">
              <CardBody>
                <p className="text-xs uppercase tracking-[0.8px] text-[#555555]">Default Groq</p>
                <p className="mt-2 text-4xl font-bold text-[#555555]">
                  {displayPlainScore.toLocaleString()}
                </p>
                <p className="text-sm text-[#555555]">/ 10,000</p>
                <span className={`mt-3 inline-flex rounded-[20px] border px-2.5 py-1 text-xs font-semibold ${gradeBadgeClass(currentData.summary.plain_grade)}`}>
                  {currentData.summary.plain_grade}
                </span>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Layer Breakdown</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {layerRows.map((row) => (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#cccccc]">{row.label}</span>
                        <span className="text-[#aaaaaa]">
                          {Math.round(row.score).toLocaleString()} / {row.max.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 rounded bg-[#1a1a1a]">
                        <div
                          className="h-2 rounded transition-all"
                          style={{ width: `${Math.min(100, row.ratio * 100)}%`, background: barColor(row.ratio) }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 border-t border-border-subtle pt-3 text-right text-sm text-[#aaaaaa]">
                    TOTAL <span className="ml-2 font-semibold text-white">{displayAgentScore.toLocaleString()} / 10,000</span>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Benchmark Verdict</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3 text-sm text-[#aaaaaa]">
                  <p>
                    Winner:{" "}
                    <span className={`font-semibold ${currentData.summary.winner === "agent" ? "text-accent" : "text-[#777777]"}`}>
                      {currentData.summary.winner === "agent" ? "Your Agent" : "Default Groq"}
                    </span>
                  </p>
                  <p>
                    Avg Delta:{" "}
                    <span className={currentData.summary.average_delta >= 0 ? "text-success" : "text-danger"}>
                      {currentData.summary.average_delta >= 0 ? "+" : ""}
                      {currentData.summary.average_delta}
                    </span>
                  </p>
                  <div className="glass-subtle rounded-lg border border-border-subtle bg-bg-elevated/50 p-3">
                    <p className="text-xs uppercase tracking-[0.8px] text-[#555555]">Scoring model</p>
                    <p className="mt-1 text-[13px] text-[#cccccc]">Programmatic multi-layer objective benchmark.</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Side-by-Side Comparison</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {currentData.comparison_data.results.map((row, index) => (
                  <div key={`${row.question}-${index}`} className="glass-subtle rounded-xl border border-border-subtle bg-bg-elevated/50 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        Q{index + 1}. {row.question}
                      </p>
                      <Badge variant={row.score_delta >= 0 ? "ok" : "warning"}>
                        {row.score_delta >= 0 ? "+" : ""}
                        {row.score_delta}
                      </Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="glass-subtle rounded-lg border border-border-subtle p-3">
                        <p className="mb-1 text-xs uppercase tracking-wide text-[#555555]">Default Groq</p>
                        <p className="line-clamp-5 text-sm text-[#cccccc]">{row.plain.response.answer}</p>
                      </div>
                      <div className="rounded-lg border border-[#3a3200] bg-accent-dim/35 p-3 shadow-[inset_0_0_0_1px_rgba(245,197,24,0.05)]">
                        <p className="mb-1 text-xs uppercase tracking-wide text-accent">Your Agent</p>
                        <p className="line-clamp-5 text-sm text-[#cccccc]">{row.agent.response.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Historical Benchmarks</h3>
            </CardHeader>
            <CardBody>
              <div className="glass-subtle h-72 rounded-lg border border-white/5 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <XAxis dataKey="date" stroke="#555555" />
                    <YAxis stroke="#555555" />
                    <Tooltip
                      contentStyle={{
                        background: "#0f0f0fd9",
                        border: "1px solid #2a2a2a",
                        borderRadius: 8,
                        color: "#ffffff"
                      }}
                    />
                    <Line type="monotone" dataKey="agent" stroke="#F5C518" strokeWidth={3} dot={{ r: 4 }} name="Your Agent" />
                    <Line type="monotone" dataKey="plain" stroke="#333333" strokeWidth={2} dot={{ r: 3 }} name="Default Groq" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {historicalData.length === 0 ? (
                <p className="mt-2 text-sm text-[#aaaaaa]">Run benchmarks to populate historical trend lines.</p>
              ) : null}
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-[#aaaaaa]">No benchmark results yet. Run a benchmark to see comparisons and charts.</p>
          </CardBody>
        </Card>
      )}
      {benchmarkMutation.error ? (
        <ErrorMessage title="Benchmark failed" message={(benchmarkMutation.error as Error).message} />
      ) : null}
    </PageWrapper>
  );
}
