import { BarChart3, Building2, Home, PlayCircle } from "lucide-react";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";

import { useCompaniesQuery } from "../../hooks/useCompany";

export function BottomNav() {
  const companiesQuery = useCompaniesQuery();
  const firstCompanyId = companiesQuery.data?.[0]?.id;
  const items = useMemo(
    () => [
      { to: "/", label: "Dashboard", icon: Home },
      { to: "/companies", label: "Companies", icon: Building2 },
      { to: firstCompanyId ? `/companies/${firstCompanyId}/scenario` : "/companies", label: "Scenario", icon: PlayCircle },
      { to: firstCompanyId ? `/companies/${firstCompanyId}/benchmark` : "/companies", label: "Benchmark", icon: BarChart3 }
    ],
    [firstCompanyId]
  );

  return (
    <nav className="glass-subtle fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border-subtle bg-[#0f0f0f]/90 px-2 md:hidden">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? "text-accent" : "text-[#444444]"}`
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
