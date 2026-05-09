import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useCompaniesQuery } from "../../hooks/useCompany";

const STATIC_LABELS: Record<string, string> = {
  companies: "Companies",
  scenario: "Scenario Runner",
  benchmark: "Benchmark",
  history: "Scenario History",
  profile: "Profile",
  new: "New Company"
};

export function Breadcrumbs() {
  const location = useLocation();
  const companiesQuery = useCompaniesQuery();
  const segments = location.pathname.split("/").filter(Boolean);
  const companies = companiesQuery.data ?? [];

  if (segments.length === 0) {
    return (
      <div className="px-6 pt-1 text-sm text-[#555555]">
        <span>Dashboard</span>
      </div>
    );
  }

  let assembledPath = "";
  return (
    <div className="flex flex-wrap items-center gap-2 px-6 pt-1 text-sm text-[#555555]">
      <Link to="/" className="hover:text-accent">
        Dashboard
      </Link>
      {segments.map((segment) => {
        assembledPath += `/${segment}`;
        const company = companies.find((item) => String(item.id) === segment);
        const label = company?.name ?? STATIC_LABELS[segment] ?? segment;
        return (
          <span key={assembledPath} className="inline-flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={assembledPath} className="hover:text-accent">
              {label}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
