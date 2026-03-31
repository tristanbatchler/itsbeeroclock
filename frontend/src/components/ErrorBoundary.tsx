import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card } from "./Card";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 border-destructive/30 bg-destructive/5 flex items-center gap-3">
          <AlertTriangle className="text-destructive size-6" />
          <div>
            <p className="font-bold text-foreground">Something went wrong.</p>
            <p className="text-sm text-muted-foreground">Try refreshing the page.</p>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}