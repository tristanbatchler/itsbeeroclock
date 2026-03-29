import { Card } from "./Card";
import { CancelButton } from "./CancelButton";
import * as React from "react";

interface NotificationCardProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  colorClassName?: string; // for gradient/bg/border
  testId?: string;
}

export function NotificationCard({
  icon,
  title,
  description,
  action,
  onDismiss,
  className = "",
  colorClassName = "",
  testId,
}: NotificationCardProps) {
  return (
    <Card
      className={`p-5 flex items-start gap-3 shadow-lg animate-fade-in ${colorClassName} ${className}`}
      data-testid={testId}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="font-semibold text-foreground mb-1">
          {title}
        </p>
        {description && (
          <div className="text-sm text-muted-foreground mb-1">
            {description}
          </div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && <CancelButton onClick={onDismiss} className="ml-auto" />}
    </Card>
  );
}
