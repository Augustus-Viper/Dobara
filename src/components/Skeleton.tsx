export function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="db-skel" style={{ borderRadius: 8, ...style }} />;
}

export function ListingCardSkeleton() {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid transparent" }}>
      <Skeleton style={{ aspectRatio: "3/4", borderRadius: 16 }} />
      <div style={{ padding: "10px 4px" }}>
        <Skeleton style={{ height: 16, width: "80%", marginBottom: 8 }} />
        <Skeleton style={{ height: 11, width: "55%", marginBottom: 10 }} />
        <Skeleton style={{ height: 14, width: "45%" }} />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "4px 14px 24px" }}>
      {Array.from({ length: count }).map((_, i) => <ListingCardSkeleton key={i} />)}
    </div>
  );
}

export function RowSkeleton({ height = 60 }: { height?: number }) {
  return <Skeleton style={{ height, width: "100%", borderRadius: 12 }} />;
}

export function ChatBubbleSkeleton({ mine = false }: { mine?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <Skeleton style={{ height: 34, width: mine ? 140 : 190, borderRadius: 16 }} />
    </div>
  );
}
