import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-black shadow-[0_6px_20px_rgba(245,197,24,0.22)] hover:brightness-110 hover:shadow-[0_10px_24px_rgba(245,197,24,0.28)] active:scale-[0.97]",
  secondary:
    "glass-subtle border border-[#2a2a2a] bg-bg-elevated/65 text-[#aaaaaa] hover:border-accent hover:text-accent active:scale-[0.97]",
  danger: "border border-[#3a0000] bg-[#1a0000] text-danger hover:border-danger/60 active:scale-[0.97]",
  ghost:
    "glass-subtle border border-border-subtle bg-transparent text-[#aaaaaa] hover:bg-bg-hover/70 hover:text-white active:scale-[0.97]"
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variantClassMap[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
