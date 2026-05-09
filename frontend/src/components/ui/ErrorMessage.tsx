import { AlertTriangle } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
}

export function ErrorMessage({ title = "Request failed", message }: ErrorMessageProps) {
  return (
    <div className="rounded-[10px] border border-[#2a0000] bg-[#1a0000] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
        <div>
          <p className="font-semibold text-danger">{title}</p>
          <p className="mt-1 text-sm text-[#ffb3b3]">{message}</p>
        </div>
      </div>
    </div>
  );
}
