/**
 * Skeleton loader component for the card table.
 * Displays animated placeholder rows while data is loading.
 */
export default function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <div className="space-y-3">
        <div className="h-10 rounded-md bg-surface animate-pulse" />
        <div className="flex flex-wrap gap-2">
          {[80, 60, 60, 70, 60, 90, 90, 70, 100].map((width, i) => (
            <div
              key={i}
              className="h-7 rounded bg-surface animate-pulse"
              style={{ width: `${width}px` }}
            />
          ))}
        </div>
      </div>

      {/* Results count skeleton */}
      <div className="h-5 w-48 rounded bg-surface animate-pulse" />

      {/* Desktop table skeleton */}
      <div className="hidden md:block">
        <div className="rounded-md border" style={{ borderColor: 'var(--color-border)' }}>
          {/* Table header */}
          <div
            className="flex items-center gap-4 px-3 py-2 border-b"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="w-12 h-4 rounded bg-border animate-pulse" />
            <div className="w-10 h-4 rounded bg-border animate-pulse" />
            <div className="w-24 h-4 rounded bg-border animate-pulse" />
            <div className="w-12 h-4 rounded bg-border animate-pulse" />
            <div className="w-12 h-4 rounded bg-border animate-pulse" />
            <div className="w-16 h-4 rounded bg-border animate-pulse" />
            <div className="flex-1 h-4 rounded bg-border animate-pulse" />
          </div>

          {/* Table rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-3 py-2 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Image */}
              <div className="w-10 h-10 rounded bg-surface animate-pulse" />
              {/* ID */}
              <div className="w-10 h-4 rounded bg-surface animate-pulse" />
              {/* Name */}
              <div className="w-24 h-4 rounded bg-surface animate-pulse" />
              {/* Attribute */}
              <div className="w-6 h-6 rounded-full bg-surface animate-pulse" />
              {/* Type */}
              <div className="w-6 h-6 rounded-full bg-surface animate-pulse" />
              {/* Rarity */}
              <div className="w-16 h-4 rounded bg-surface animate-pulse" />
              {/* Skill description */}
              <div className="flex-1 space-y-1">
                <div className="h-4 rounded bg-surface animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-surface animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div className="w-10 h-10 rounded bg-border animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-border animate-pulse" />
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full bg-border animate-pulse" />
                <div className="w-5 h-5 rounded-full bg-border animate-pulse" />
                <div className="w-16 h-4 rounded bg-border animate-pulse" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-border animate-pulse flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 rounded bg-surface animate-pulse" />
        <div className="flex gap-2">
          <div className="w-20 h-8 rounded bg-surface animate-pulse" />
          <div className="w-16 h-8 rounded bg-surface animate-pulse" />
        </div>
      </div>
    </div>
  );
}
