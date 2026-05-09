import { BarChart3, Building2, Clock3, Home, LogOut, PlayCircle, User, X } from "lucide-react";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";

import { useCompaniesQuery } from "../../hooks/useCompany";
import { useSidebar } from "../../hooks/useSidebar";
import { Button } from "../ui/Button";
import logo from "../../assets/logo.svg";

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const { isOpen, close } = useSidebar();
  const companiesQuery = useCompaniesQuery();
  const firstCompanyId = companiesQuery.data?.[0]?.id;

  const navItems = useMemo(
    () =>
      [
        { id: "dashboard", to: "/", label: "Dashboard", icon: Home },
        { id: "companies", to: "/companies", label: "My Companies", icon: Building2 },
        {
          id: "scenario",
          to: firstCompanyId ? `/companies/${firstCompanyId}/scenario` : "/companies",
          label: "Run Scenario",
          icon: PlayCircle
        },
        {
          id: "benchmark",
          to: firstCompanyId ? `/companies/${firstCompanyId}/benchmark` : "/companies",
          label: "Benchmarks",
          icon: BarChart3
        },
        {
          id: "history",
          to: firstCompanyId ? `/companies/${firstCompanyId}/history` : "/companies",
          label: "History",
          icon: Clock3
        }
      ] as const,
    [firstCompanyId]
  );

  const content = (
    <div className="pointer-events-auto flex h-full flex-col bg-[#0f0f0f]/92">
      <div className="flex items-center justify-between p-5">
        <img src={logo} alt="ProdIQ" className="h-9 w-auto" />
        <button
          type="button"
          className="md:hidden rounded-full p-1 text-[#777777] hover:text-[#ffffff]"
          onClick={close}
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="pointer-events-auto space-y-1 px-0">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            onClick={close}
            className={({ isActive }) =>
              `pointer-events-auto flex items-center gap-3 border-l-2 px-5 py-2.5 text-[13px] font-medium transition md:justify-center lg:justify-start ${
                isActive
                  ? "border-l-accent bg-bg-elevated text-accent"
                  : "border-l-transparent text-[#666666] hover:bg-bg-elevated hover:text-[#cccccc]"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden lg:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border-subtle p-4">
        <NavLink
          to="/profile"
          onClick={close}
          className={({ isActive }) =>
            `pointer-events-auto mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition md:justify-center lg:justify-start ${
              isActive ? "bg-bg-elevated text-accent" : "text-[#666666] hover:bg-bg-elevated hover:text-[#cccccc]"
            }`
          }
        >
          <User className="h-4 w-4" />
          <span className="hidden lg:inline">Profile</span>
        </NavLink>
        <Button variant="ghost" className="pointer-events-auto w-full justify-start gap-2 text-[13px]" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden lg:inline">Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="glass-subtle pointer-events-auto sticky top-0 hidden h-screen w-[60px] shrink-0 border-r border-border-subtle bg-[#0f0f0f]/82 md:flex md:flex-col lg:w-[220px]">
        {content}
      </aside>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="glass-surface h-full w-[280px] border-r border-border-subtle bg-[#0f0f0f]/92 shadow-panel">
            {content}
          </div>
          <button
            type="button"
            className="h-full flex-1 bg-black/70"
            onClick={close}
            aria-label="Close sidebar overlay"
          />
        </div>
      ) : null}
    </>
  );
}
