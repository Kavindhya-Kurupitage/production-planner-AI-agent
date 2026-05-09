import type { ReactNode } from "react";

import { useBreakpoint } from "../../hooks/useBreakpoint";

type Column<T> = {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
};

type ResponsiveTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  mobileCardRenderer: (row: T, index: number) => ReactNode;
};

export function ResponsiveTable<T>({ columns, data, mobileCardRenderer }: ResponsiveTableProps<T>) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <div className="space-y-3">{data.map((row, index) => <div key={index}>{mobileCardRenderer(row, index)}</div>)}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="min-w-full text-sm">
        <thead className="bg-[#0f0f0f] text-[#555555]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.8px]">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-t border-[#1a1a1a] bg-[#111111] hover:bg-[#141414]">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-[#cccccc]">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
