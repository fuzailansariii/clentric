export default function ClientsLoading() {
  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="divide-border divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="flex items-center gap-3 px-5 py-3.5" key={i}>
            <div className="bg-secondary-foreground h-9 w-9 animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-secondary-foreground h-3 w-1/3 animate-pulse rounded" />
              <div className="bg-secondary-foreground h-2.5 w-1/5 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
