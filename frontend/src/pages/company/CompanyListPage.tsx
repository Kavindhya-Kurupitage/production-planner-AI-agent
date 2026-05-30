import { useState } from "react";
import { CalendarClock, History, Pencil, PlayCircle, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { PageWrapper } from "../../components/layout/PageWrapper";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "../../components/ui/Card";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useCompaniesQuery, useCompanyScenariosQuery, useDeleteCompanyMutation } from "../../hooks/useCompany";
import type { Company } from "../../types/company";

function CompanyCard({ companyId }: { companyId: number }) {
  const scenariosQuery = useCompanyScenariosQuery(companyId);
  const latestDate = scenariosQuery.data?.[0]?.created_at;
  const latestLabel = latestDate ? new Date(latestDate).toLocaleString() : "No scenarios yet";

  return (
    <div className="flex items-center gap-2 text-xs text-[#555555]">
      <CalendarClock className="h-3.5 w-3.5" />
      {scenariosQuery.isLoading ? "Loading..." : latestLabel}
    </div>
  );
}

export function CompanyListPage() {
  const companiesQuery = useCompaniesQuery();
  const deleteMutation = useDeleteCompanyMutation();
  const [companyPendingDeletion, setCompanyPendingDeletion] = useState<Company | null>(null);

  const closeDeleteModal = () => {
    if (!deleteMutation.isPending) {
      setCompanyPendingDeletion(null);
    }
  };

  const confirmDelete = () => {
    if (!companyPendingDeletion) return;
    deleteMutation.mutate(companyPendingDeletion.id, {
      onSuccess: () => setCompanyPendingDeletion(null)
    });
  };

  if (companiesQuery.isLoading) {
    return (
      <PageWrapper title="Companies" subtitle="Manage company workspaces and scenario operations.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardBody>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/2" />
                <Skeleton className="mt-4 h-16 w-full" />
              </CardBody>
            </Card>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (companiesQuery.error) {
    return (
      <PageWrapper title="Companies" subtitle="Manage company workspaces and scenario operations.">
        <ErrorMessage message={(companiesQuery.error as Error).message} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Companies"
      subtitle="Manage company profiles and launch planning scenarios."
      actions={
        <Link to="/companies/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Company
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companiesQuery.data?.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                  <p className="mt-1 text-sm text-[#aaaaaa]">{company.industry}</p>
                </div>
                <Badge variant="info">{company.priority_metric}</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-[#aaaaaa]">
                <span className="font-medium text-white">Constraint:</span> {company.main_constraint}
              </p>
              <div className="mt-3">
                <CompanyCard companyId={company.id} />
              </div>
            </CardBody>
            <CardFooter>
              <div className="grid w-full grid-cols-2 gap-2">
                <Link to={`/companies/${company.id}/scenario`}>
                  <Button className="w-full gap-1 text-xs" variant="primary">
                    <PlayCircle className="h-3.5 w-3.5" /> Run Scenario
                  </Button>
                </Link>
                <Link to={`/companies/${company.id}/history`}>
                  <Button className="w-full gap-1 text-xs" variant="secondary">
                    <History className="h-3.5 w-3.5" /> View History
                  </Button>
                </Link>
                <Button className="w-full gap-1 text-xs" variant="ghost">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  className="w-full gap-1 text-xs"
                  variant="danger"
                  onClick={() => setCompanyPendingDeletion(company)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {(companiesQuery.data?.length ?? 0) === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-[#aaaaaa]">No companies yet. Create your first company to get started.</p>
          </CardBody>
        </Card>
      ) : null}
      <Modal isOpen={companyPendingDeletion !== null} title="Delete company?" onClose={closeDeleteModal}>
        <div className="space-y-4 text-sm text-[#aaaaaa]">
          <p>
            Deleting{" "}
            <span className="font-semibold text-white">{companyPendingDeletion?.name}</span> permanently removes its
            production data, scenarios, and benchmark history.
          </p>
          <p>This action cannot be undone.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={closeDeleteModal} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete company"}
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
