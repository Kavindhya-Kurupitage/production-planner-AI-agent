import type { ReactNode } from "react";

import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ isOpen, title, children, onClose }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-[10px] border border-border-subtle bg-bg-surface shadow-panel">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
