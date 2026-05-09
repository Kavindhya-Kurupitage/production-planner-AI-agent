import { Building2 } from "lucide-react";

import { PageWrapper } from "../components/layout/PageWrapper";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

export function CompaniesPage() {
  return (
    <PageWrapper title="Companies" subtitle="Manage company profiles and constraints.">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Company Workspace</h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border-subtle bg-bg-elevated p-4">
            <Building2 className="h-5 w-5 text-accent" />
            <p className="text-sm text-[#aaaaaa]">Connect this page to `/companies` endpoints for full CRUD.</p>
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
