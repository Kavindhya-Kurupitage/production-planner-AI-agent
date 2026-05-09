import { useState, type FormEvent } from "react";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { PlanRequest } from "../types/planner";

interface PlannerFormProps {
  onSubmit: (payload: PlanRequest) => Promise<unknown>;
  loading: boolean;
}

export function PlannerForm({ onSubmit, loading }: PlannerFormProps) {
  const [productName, setProductName] = useState<string>("");
  const [targetUnits, setTargetUnits] = useState<number>(1000);
  const [timeframeDays, setTimeframeDays] = useState<number>(30);
  const [constraints, setConstraints] = useState<string>("Limited overtime and fixed raw material budget.");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ productName, targetUnits, timeframeDays, constraints });
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Input
        label="Product Name"
        value={productName}
        onChange={(event) => setProductName(event.target.value)}
        placeholder="e.g., Smart Sensor Pro"
        required
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Target Units"
          type="number"
          min={1}
          value={targetUnits}
          onChange={(event) => setTargetUnits(Number(event.target.value))}
          required
        />
        <Input
          label="Timeframe (days)"
          type="number"
          min={1}
          value={timeframeDays}
          onChange={(event) => setTimeframeDays(Number(event.target.value))}
          required
        />
      </div>
      <Input
        multiline
        label="Operational Constraints"
        value={constraints}
        onChange={(event) => setConstraints(event.target.value)}
        placeholder="Add labor limits, overtime caps, supplier issues..."
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Generating Plan..." : "Generate Production Plan"}
      </Button>
    </form>
  );
}
