import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-[#aaaaaa]">
      <div className="flex items-center gap-2">
        <LoadingSpinner />
        Checking authentication state...
      </div>
    </div>
  );
}
