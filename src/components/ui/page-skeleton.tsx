import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  className?: string;
}

export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn("animate-in fade-in-0 duration-300", className)}>
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      
      {/* Stats grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-4 animate-in fade-in-0 duration-300">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Skeleton className="h-32 rounded-xl animate-in fade-in-0 duration-300" />
  );
}