import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close bottom sheet overlay"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 animate-in slide-in-from-bottom duration-200 rounded-t-[16px] border border-border-subtle bg-bg-surface p-4">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#2a2a2a]" />
        {children}
      </div>
    </div>
  );
}
