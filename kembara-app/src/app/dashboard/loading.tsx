// Loading skeleton for all dashboard pages
export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Top Bar skeleton */}
      <div className="h-14 border-b border-white/60 bg-white/40 px-5 lg:px-10 flex items-center justify-between shrink-0">
        <div className="h-5 w-24 rounded-full bg-stone-200" />
        <div className="h-8 w-8 rounded-full bg-stone-200" />
      </div>

      {/* Content skeleton */}
      <div className="px-5 pt-6 lg:px-10 space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-full bg-stone-200" />
          <div className="h-4 w-24 rounded-full bg-stone-100" />
        </div>

        {/* Card skeleton */}
        <div className="h-52 rounded-3xl bg-stone-200" />

        {/* List items skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-stone-100" />
        ))}
      </div>
    </div>
  );
}

