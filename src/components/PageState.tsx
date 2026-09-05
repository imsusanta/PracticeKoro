import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LoadErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function LoadError({
  title = "Couldn't load this page",
  description = "Something went wrong. Check your connection and try again.",
  onRetry,
}: LoadErrorProps) {
  return (
    <Alert variant="destructive" className="rounded-2xl">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{description}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="shrink-0 border-destructive/30 bg-background">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-50">
        <Icon className="size-7 text-slate-300" />
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
