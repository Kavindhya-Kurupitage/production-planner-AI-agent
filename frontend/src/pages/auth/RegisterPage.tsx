import { ChevronDown, Eye, EyeOff, Lock, Mail, User, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/authStore";
import logo from "../../assets/logo.svg";
import registerHero from "../../assets/register-hero.png";

function getPasswordStrength(password: string): { label: string; score: number } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: "Weak", score };
  if (score <= 2) return { label: "Fair", score };
  if (score <= 3) return { label: "Good", score };
  return { label: "Strong", score };
}

type DropdownKey = "industry" | "constraint";

type DarkDropdownProps = {
  value: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

function DarkDropdown({ value, options, isOpen, onToggle, onSelect }: DarkDropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3.5 py-2.5 text-left text-[13px] text-white outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]"
        onClick={onToggle}
      >
        <span>{value}</span>
        <ChevronDown className={`h-4 w-4 text-[#cccccc] transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#111111] shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`block w-full px-3.5 py-2.5 text-left text-[13px] transition ${
                option === value ? "bg-accent text-black" : "bg-[#111111] text-white hover:bg-[#1a1a1a]"
              }`}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { registerMutation } = useAuth();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Manufacturing");
  const [mainConstraint, setMainConstraint] = useState("Cost");
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordMismatch) return;
    if (step < 2) {
      setStep(2);
      return;
    }
    await registerMutation.mutateAsync({ full_name: fullName, email, password });
    setStep(3);
  };

  useEffect(() => {
    if (step !== 3) return;
    if (redirectCountdown <= 0) {
      navigate("/", { replace: true });
      return;
    }
    const timer = window.setTimeout(() => setRedirectCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, redirectCountdown, navigate]);

  useEffect(() => {
    const closeDropdowns = () => setOpenDropdown(null);
    window.addEventListener("click", closeDropdowns);
    return () => window.removeEventListener("click", closeDropdowns);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] lg:flex">
      <section className="flex min-h-screen w-full items-center justify-center bg-[#0f0f0f] px-6 py-10 lg:w-[45%]">
        <div className="glass-surface slide-in-left w-full max-w-md rounded-[14px] border border-border-subtle bg-bg-surface/80 p-7">
          <img src={logo} alt="ProdIQ" className="mb-6 h-9 w-auto" />
          <div className="mb-6 flex items-center gap-2">
            {[
              { id: 1, label: "Account" },
              { id: 2, label: "Company" },
              { id: 3, label: "Done" }
            ].map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    item.id <= step ? "bg-accent text-black" : "bg-bg-elevated text-[#555555]"
                  }`}
                >
                  {item.id}
                </span>
                <span className="text-[11px] uppercase tracking-[0.8px] text-[#aaaaaa]">{item.label}</span>
                {item.id < 3 ? <span className="h-px w-6 bg-border-subtle" /> : null}
              </div>
            ))}
          </div>
          <form className="space-y-4" onSubmit={submit}>
            {step === 1 ? (
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[#aaaaaa]">Full name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-[#555555]" />
                    <input className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 py-2.5 pl-10 pr-4 text-[13px] outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                  </div>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[#aaaaaa]">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-[#555555]" />
                    <input type="email" className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 py-2.5 pl-10 pr-4 text-[13px] outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  </div>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[#aaaaaa]">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-[#555555]" />
                    <input type={showPassword ? "text" : "password"} className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 py-2.5 pl-10 pr-10 text-[13px] outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]" value={password} onChange={(event) => setPassword(event.target.value)} required />
                    <button type="button" className="absolute inset-y-0 right-2 my-auto text-[#777]" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[#aaaaaa]">Confirm password</span>
                  <input type={showPassword ? "text" : "password"} className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 px-3.5 py-2.5 text-[13px] outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                  {passwordMismatch ? <span className="text-xs text-danger">Passwords do not match.</span> : null}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#aaaaaa]">
                    <span>Password strength</span>
                    <span>{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className={`h-1.5 rounded ${item <= strength.score ? "bg-accent" : "bg-[#222]"}`} />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[#aaaaaa]">Company name</span>
                  <input className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 px-3.5 py-2.5 text-[13px] outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[#aaaaaa]">Industry</span>
                  <div onClick={(event) => event.stopPropagation()}>
                    <DarkDropdown
                      value={industry}
                      options={["Manufacturing", "Food & Beverage", "Retail", "Pharma"]}
                      isOpen={openDropdown === "industry"}
                      onToggle={() => setOpenDropdown((current) => (current === "industry" ? null : "industry"))}
                      onSelect={(value) => {
                        setIndustry(value);
                        setOpenDropdown(null);
                      }}
                    />
                  </div>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[#aaaaaa]">Main constraint</span>
                  <div onClick={(event) => event.stopPropagation()}>
                    <DarkDropdown
                      value={mainConstraint}
                      options={["Cost", "Speed", "Quality", "Capacity"]}
                      isOpen={openDropdown === "constraint"}
                      onToggle={() => setOpenDropdown((current) => (current === "constraint" ? null : "constraint"))}
                      onSelect={(value) => {
                        setMainConstraint(value);
                        setOpenDropdown(null);
                      }}
                    />
                  </div>
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4 text-center">
                <svg viewBox="0 0 80 80" className="mx-auto h-16 w-16">
                  <circle cx="40" cy="40" r="30" fill="#141414" stroke="#f5c518" strokeWidth="2" />
                  <path d="M25 41L35 51L55 31" fill="none" stroke="#f5c518" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 className="text-xl font-semibold text-white">You&apos;re all set!</h2>
                <p className="text-sm text-[#aaaaaa]">Redirecting in {redirectCountdown}...</p>
              </div>
            ) : null}

            {registerMutation.error ? <p className="text-sm text-danger">{(registerMutation.error as Error).message}</p> : null}
            {step < 3 ? (
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>
                  Back
                </Button>
                <Button type="submit" className="gap-2" disabled={registerMutation.isPending || passwordMismatch}>
                  {registerMutation.isPending ? <LoadingSpinner /> : <UserPlus className="h-4 w-4" />}
                  {step === 2 ? "Create account" : "Next"}
                </Button>
              </div>
            ) : null}
          </form>
          <p className="mt-6 text-center text-sm text-[#aaaaaa]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-accent">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <section className="relative hidden w-[55%] overflow-hidden bg-[#0a0a0a] lg:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(245,197,24,0.12),transparent_42%)]" />
        <div className="flex h-full w-full items-center justify-center p-8">
          <img
            src={registerHero}
            alt="ProdIQ register visual"
            className="h-[88%] w-[88%] rounded-[14px] border border-white/10 object-cover shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
          />
        </div>
      </section>
    </div>
  );
}
