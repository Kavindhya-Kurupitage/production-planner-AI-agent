import { useQuery } from "@tanstack/react-query";
import { Building2, PlayCircle, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { Skeleton } from "../components/ui/Skeleton";
import { axiosClient } from "../lib/axios";
import { useAuthStore } from "../store/authStore";
import type { Company, Scenario } from "../types/company";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const userName = user?.full_name ?? "Planner";
  const companiesQuery = useQuery({
    queryKey: ["dashboard-companies"],
    queryFn: async () => {
      const response = await axiosClient.get<Company[]>("/companies");
      return response.data;
    }
  });

  const scenariosQuery = useQuery({
    queryKey: ["dashboard-scenarios", companiesQuery.data?.map((company) => company.id).join(",") ?? "none"],
    enabled: (companiesQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const companies = companiesQuery.data ?? [];
      const all = await Promise.all(
        companies.map(async (company) => {
          const response = await axiosClient.get<Scenario[]>(`/companies/${company.id}/scenarios`);
          return response.data.map((scenario) => ({ ...scenario, company_name: company.name }));
        })
      );
      return all.flat();
    }
  });

  const benchmarkQuery = useQuery({
    queryKey: ["dashboard-benchmarks", companiesQuery.data?.map((company) => company.id).join(",") ?? "none"],
    enabled: (companiesQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const companies = companiesQuery.data ?? [];
      const scores = await Promise.all(
        companies.map(async (company) => {
          try {
            const response = await axiosClient.get<{ agent_score: number }>(`/companies/${company.id}/benchmark`);
            return response.data.agent_score;
          } catch {
            return null;
          }
        })
      );
      return scores.filter((score): score is number => score !== null);
    }
  });
  const [quickQuestion, setQuickQuestion] = useState("What if demand increases by 15% next month?");
  const quickPills = ["+10% Demand", "+20% Demand", "Supplier Delay", "Raw Material Spike"];

  if (companiesQuery.isLoading || scenariosQuery.isLoading || benchmarkQuery.isLoading) {
    return (
      <PageWrapper title="Dashboard" subtitle="Loading performance insights...">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardBody>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-3 h-8 w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (companiesQuery.error || scenariosQuery.error || benchmarkQuery.error) {
    return (
      <PageWrapper title="Dashboard" subtitle="Loading performance insights...">
        <ErrorMessage
          message={
            (companiesQuery.error as Error | null)?.message ??
            (scenariosQuery.error as Error | null)?.message ??
            (benchmarkQuery.error as Error | null)?.message ??
            "Unable to load dashboard data."
          }
        />
      </PageWrapper>
    );
  }

  const companies = companiesQuery.data ?? [];
  const scenarios = (scenariosQuery.data ?? []).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const recentScenarios = scenarios.slice(0, 5);
  const benchmarkScores = benchmarkQuery.data ?? [];
  const averageAgentScore =
    benchmarkScores.length > 0
      ? (benchmarkScores.reduce((total, score) => total + score, 0) / benchmarkScores.length).toFixed(2)
      : "N/A";

  const stats = [
    { label: "Total Companies", value: String(companies.length), icon: Building2 },
    { label: "Total Scenarios Run", value: String(scenarios.length), icon: PlayCircle },
    { label: "Avg Agent Score", value: String(averageAgentScore), icon: TrendingUp }
  ];

  return (
    <PageWrapper
      title={
        <>
          Welcome back, <span className="text-accent">{userName}</span>
        </>
      }
      subtitle="Track planning performance and launch your next scenario."
      actions={
        <div className="flex items-center gap-2">
          <Link to="/companies/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Company
            </Button>
          </Link>
          <Link to={companies.length > 0 ? `/companies/${companies[0].id}/scenario` : "/companies/new"}>
            <Button variant="secondary" className="gap-2">
              <Sparkles className="h-4 w-4" /> Run Scenario
            </Button>
          </Link>
        </div>
      }
      >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.8px] text-[#555555]">{stat.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${stat.label.includes("Score") ? "text-accent" : "text-white"}`}>{stat.value}</p>
                </div>
                <stat.icon className="h-6 w-6 text-accent" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Quick Scenario Input</h3>
            <span className="rounded-[20px] border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#cccccc]">
              Smart Prompt
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <textarea
            className="min-h-24 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 px-3.5 py-2.5 text-[15px] text-white outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]"
            value={quickQuestion}
            onChange={(event) => setQuickQuestion(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {quickPills.map((pill) => (
              <button
                key={pill}
                className="glass-subtle rounded-[20px] border border-[#3a3200] bg-accent-dim/70 px-3 py-1 text-xs font-semibold text-accent transition hover:-translate-y-[1px]"
              >
                {pill}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Recent Scenarios</h3>
        </CardHeader>
        <CardBody>
          {companies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle bg-bg-elevated p-6 text-center">
              <p className="text-sm text-[#aaaaaa]">No companies yet. Create a company profile to start running scenarios.</p>
              <Link to="/companies/new" className="mt-4 inline-block">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Create First Company
                </Button>
              </Link>
            </div>
          ) : recentScenarios.length === 0 ? (
            <p className="text-sm text-[#aaaaaa]">No scenarios run yet. Use "Run Scenario" to generate your first one.</p>
          ) : (
            <div className="space-y-3">
              {recentScenarios.map((scenario) => (
                <div key={scenario.id} className="glass-subtle flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-elevated/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{scenario.question}</p>
                    <p className="mt-0.5 text-xs text-[#555555]">
                      {new Date(scenario.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="sm:self-start">
                    <Badge variant="info">Scenario #{scenario.id}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
