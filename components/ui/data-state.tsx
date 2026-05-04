import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function DataState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}: DataStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-card/45 p-8 text-center shadow-sm",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border/80 bg-background/70 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-4" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({
  title = "cargando...",
  description,
  className,
}: Partial<Pick<DataStateProps, "title" | "description" | "className">>) {
  return (
    <DataState
      title={title}
      description={description}
      icon={Loader2}
      className={cn("[&_svg]:animate-spin", className)}
    />
  );
}

export function EmptyState(props: DataStateProps) {
  return <DataState {...props} />;
}

export function ErrorState(props: DataStateProps) {
  return <DataState icon={AlertCircle} {...props} />;
}
