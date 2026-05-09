import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/authStore";
import loginHero from "../../assets/login-hero.png";
import logo from "../../assets/logo.svg";

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/";
  const { loginMutation } = useAuth();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loginMutation.mutateAsync({ email, password });
    if (!rememberMe) {
      // Placeholder for session-only persistence strategy.
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] lg:flex">
      <section className="relative hidden w-[55%] overflow-hidden bg-[#0a0a0a] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(245,197,24,0.12),transparent_40%)]" />
        <div className="flex h-[78%] w-full items-center justify-center">
          <img
            src={loginHero}
            alt="ProdIQ login visual"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = logo;
            }}
            className="h-full w-full rounded-[14px] border border-white/10 object-cover shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
          />
        </div>
        <div className="max-w-lg">
          <p className="text-[28px] font-semibold leading-tight text-white">Production intelligence, powered by AI</p>
          <p className="mt-3 text-sm text-[#555555]">Make smarter decisions with real-time scenario simulation</p>
        </div>
      </section>

      <section className="flex min-h-screen w-full items-center justify-center bg-[#0f0f0f] px-6 py-10 lg:w-[45%]">
        <div className="glass-surface slide-in-right w-full max-w-md rounded-[14px] border border-border-subtle bg-bg-surface/80 p-7">
          <img src={logo} alt="ProdIQ" className="mx-auto mb-8 h-9 w-auto" />
          <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-[#aaaaaa]">Sign in to your production dashboard</p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="relative block">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
                <input
                  type="email"
                  placeholder=" "
                  className="peer w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 py-3 pl-10 pr-4 text-[13px] text-white outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 bg-[#0a0a0a] px-1 text-[12px] font-medium text-[#aaaaaa] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-[12px] peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-accent peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px]">
                  Email
                </span>
              </div>
            </label>
            <label className="relative block">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  className="peer w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 py-3 pl-10 pr-10 text-[13px] text-white outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 bg-[#0a0a0a] px-1 text-[12px] font-medium text-[#aaaaaa] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-[12px] peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-accent peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px]">
                  Password
                </span>
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 my-auto text-[#777777] hover:text-[#cccccc]"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="flex items-center gap-2 text-sm text-[#aaaaaa]">
              <input
                type="checkbox"
                className="h-4 w-4 appearance-none rounded border border-[#333333] bg-[#0a0a0a] checked:border-accent checked:bg-accent"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember me
            </label>
            {loginMutation.error ? <p className="text-sm text-danger">{(loginMutation.error as Error).message}</p> : null}
            <Button type="submit" className="w-full gap-2" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <LoadingSpinner /> : <LogIn className="h-4 w-4" />}
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.8px] text-[#555555]">
            <span className="h-px flex-1 bg-border-subtle" />
            or
            <span className="h-px flex-1 bg-border-subtle" />
          </div>
          <p className="text-center text-sm text-[#aaaaaa]">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-accent hover:brightness-110">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
