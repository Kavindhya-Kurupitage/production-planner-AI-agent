import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`glass-surface rounded-[12px] border border-border-subtle bg-bg-surface/85 shadow-panel transition duration-200 hover:-translate-y-[1px] hover:border-[#3a3a3a] ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({ children }: CardProps) {
  return <div className="border-b border-border-subtle px-5 py-4">{children}</div>;
}

export function CardBody({ children }: CardProps) {
  return <div className="px-5 py-4">{children}</div>;
}

export function CardFooter({ children }: CardProps) {
  return <div className="border-t border-border-subtle px-5 py-4">{children}</div>;
}
