import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { PageWrapper } from "../../components/layout/PageWrapper";
import { Badge } from "../../components/ui/Badge";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useCompaniesQuery } from "../../hooks/useCompany";

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const companiesQuery = useCompaniesQuery();
  const company = useMemo(
    () => companiesQuery.data?.find((item) => String(item.id) === id),
    [companiesQuery.data, id]
  );

  return (
    <PageWrapper title="Company Detail" subtitle="Review profile and planning configuration.">
      {company ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{company.name}</h2>
              <Badge variant="info">{company.priority_metric}</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-[#aaaaaa]">Industry: {company.industry}</p>
            <p className="mt-2 text-sm text-[#aaaaaa]">Main constraint: {company.main_constraint}</p>
            <p className="mt-2 text-sm text-[#555555]">Last updated: {new Date(company.updated_at).toLocaleString()}</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-[#aaaaaa]">Company not found.</p>
          </CardBody>
        </Card>
      )}
    </PageWrapper>
  );
}
