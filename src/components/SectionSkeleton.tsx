import { memo } from "react";

interface SectionSkeletonProps {
  height?: string;
}

const SectionSkeleton = memo(({ height = "min-h-[50vh]" }: SectionSkeletonProps) => (
  <div className={`${height} bg-background flex items-center justify-center`}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border border-foreground/20 rounded-full animate-spin border-t-transparent" />
      <span className="font-body text-xs text-muted-foreground tracking-widest uppercase">
        Loading
      </span>
    </div>
  </div>
));

SectionSkeleton.displayName = "SectionSkeleton";

export default SectionSkeleton;
