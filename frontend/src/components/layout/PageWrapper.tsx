import type { ReactNode } from "react";

interface PageWrapperProps {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageWrapper({ title, subtitle, actions, children }: PageWrapperProps) {
  return (
    <div className="space-y-6 px-4 pb-20 pt-4 sm:px-6 sm:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white md:text-xl lg:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[#aaaaaa]">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
