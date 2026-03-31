import { useEscapeKey } from "../hooks/useEscapeKey";
import { CancelButton } from "./CancelButton";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className="fixed inset-0 bg-background/80 dark:bg-background/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-border animate-slide-in">
        {title && (
          <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-3xl">
            <h2 id="modal-title" className="text-xl font-bold text-foreground">{title}</h2>
            <CancelButton onClick={onClose} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
