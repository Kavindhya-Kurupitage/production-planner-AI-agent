import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { PlanResponse } from "../types/planner";
import { Badge } from "./ui/Badge";
import { Card, CardBody, CardHeader } from "./ui/Card";

interface PlanResultProps {
  plan: PlanResponse | null;
}

export function PlanResult({ plan }: PlanResultProps) {
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Generated Plan</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-[#aaaaaa]">No plan generated yet. Submit inputs to run a scenario.</p>
        </CardBody>
      </Card>
    );
  }

  const chartData = [
    { metric: "Target Units", value: plan.target_units },
    { metric: "Timeframe", value: plan.timeframe_days }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Generated Plan</h2>
          <Badge variant="ok">AI Complete</Badge>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3">
            <p className="mb-1 text-xs text-[#555555]">Product</p>
            <p className="text-sm font-semibold text-white">{plan.product_name}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3">
            <p className="mb-1 text-xs text-[#555555]">Target Units</p>
            <p className="text-sm font-semibold text-white">{plan.target_units}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3">
            <p className="mb-1 text-xs text-[#555555]">Timeframe</p>
            <p className="text-sm font-semibold text-white">{plan.timeframe_days} days</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-sm">
            <Clock3 className="h-4 w-4 text-warning" />
            <span className="text-[#cccccc]">Review timeline dependencies</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <span className="text-[#cccccc]">Monitor material bottlenecks</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-[#cccccc]">Track KPI execution weekly</span>
          </div>
        </div>

        <div className="mb-6 h-64 rounded-lg border border-border-subtle bg-bg-elevated p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="metric" stroke="#555555" />
              <YAxis stroke="#555555" />
              <Tooltip />
              <Bar dataKey="value" fill="#F5C518" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <pre className="max-h-[28rem] overflow-auto rounded-lg border border-border-subtle bg-[#0a0a0a] p-4 text-xs leading-6 text-[#cccccc]">
          {plan.generated_plan}
        </pre>
      </CardBody>
    </Card>
  );
}
