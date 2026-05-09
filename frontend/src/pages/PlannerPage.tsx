import { useState } from "react";

import { PlannerForm } from "../components/PlannerForm";
import { PlanResult } from "../components/PlanResult";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { usePlanner } from "../hooks/usePlanner";

export function PlannerPage() {
  const { loading, error, plan, generatePlan } = usePlanner();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <PageWrapper
      title="AI Production Planner"
      subtitle="Generate data-backed production scenarios with AI tool orchestration."
      actions={
        <Button variant="ghost" onClick={() => setIsHelpModalOpen(true)}>
          How it works
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Planner Inputs</h2>
        </CardHeader>
        <CardBody>
          <PlannerForm onSubmit={generatePlan} loading={loading} />
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-[#aaaaaa]">
              <LoadingSpinner />
              Running simulation and toolchain...
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm font-medium text-danger">{error}</p> : null}
        </CardBody>
      </Card>

      <PlanResult plan={plan} />

      <Modal isOpen={isHelpModalOpen} title="Planner Workflow" onClose={() => setIsHelpModalOpen(false)}>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[#aaaaaa]">
          <li>Capture your demand and operational constraints.</li>
          <li>Run simulation + bottleneck analysis with AI tools.</li>
          <li>Generate an action plan with quantified priorities.</li>
        </ol>
      </Modal>
    </PageWrapper>
  );
}
