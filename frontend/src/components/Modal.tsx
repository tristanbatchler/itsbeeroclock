import { useEffect } from "react";
import { CancelButton } from "./CancelButton";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 dark:bg-background/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-border animate-slide-in">
        {title && (
          <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-3xl">
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <CancelButton onClick={onClose} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
