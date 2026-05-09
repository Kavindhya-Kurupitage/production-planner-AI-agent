import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useSidebar } from "../../hooks/useSidebar";

interface TopBarProps {
  userName: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function TopBar({ userName }: TopBarProps) {
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const { toggle } = useSidebar();
  const initials = getInitials(userName) || "U";
  const routeTitle = (() => {
    const path = location.pathname;
    if (path === "/") return "Good to see you";
    if (path.includes("/scenario")) return "Scenario Runner";
    if (path.includes("/benchmark")) return "Benchmark Comparison";
    if (path.includes("/history")) return "Scenario History";
    if (path.includes("/companies/new")) return "Company Onboarding";
    if (path.includes("/companies")) return "Companies";
    if (path.includes("/profile")) return "Profile";
    return "Production Control Center";
  })();
  return (
    <header className="glass-subtle sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/55 px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center gap-3 md:gap-4">
        {isMobile ? (
          <button
            type="button"
            className="glass-subtle flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated/70 text-[#dddddd]"
            onClick={toggle}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <div className={isMobile ? "hidden" : "block"}>
          <p className="text-[11px] uppercase tracking-[0.8px] text-[#555555]">Operations intelligence</p>
          <h2 className="text-lg font-semibold text-white md:text-xl">{routeTitle}</h2>
        </div>
      </div>
      <div className="glass-subtle inline-flex items-center gap-2 rounded-[20px] border border-border-subtle bg-bg-elevated/70 px-2.5 py-1.5 md:px-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-dim text-xs font-bold text-accent">
          {initials}
        </span>
        {!isMobile ? <span className="text-sm font-medium text-[#aaaaaa]">{userName}</span> : null}
      </div>
    </header>
  );
}
