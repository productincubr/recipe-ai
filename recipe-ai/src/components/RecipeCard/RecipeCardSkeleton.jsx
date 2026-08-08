export default function RecipeCardSkeleton() {
  return (
    <div className="w-[258px] shrink-0 animate-pulse rounded-[28px] border border-cream-300 bg-cream p-4">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded-full bg-cream-200" />
        <div className="h-7 w-7 rounded-full bg-cream-200" />
      </div>
      <div className="mt-3 h-[168px] w-full rounded-[20px] bg-cream-200" />
      <div className="mt-4 h-4 w-3/4 rounded-full bg-cream-200" />
      <div className="mt-2 h-3 w-1/2 rounded-full bg-cream-200" />
      <div className="mt-4 h-px w-full bg-cream-200" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-14 rounded-2xl bg-cream-200" />
        <div className="h-14 rounded-2xl bg-cream-200" />
        <div className="h-14 rounded-2xl bg-cream-200" />
      </div>
    </div>
  );
}
