import { Skeleton } from "./ui";

function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={`glass rounded-2xl ${className ?? "h-28"}`} />;
}

export function DashboardSkeleton() {
  return (
    <div data-placeholder>
      {/* score + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={`stat-${i}`} />
        ))}
      </div>

      {/* score panel + languages */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard className="h-64 lg:col-span-2" />
        <SkeletonCard className="h-64" />
      </div>

      {/* charts */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>

      {/* repos */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={`repo-${i}`} className="h-40" />
        ))}
      </div>
    </div>
  );
}
