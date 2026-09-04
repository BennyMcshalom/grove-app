import Image from "next/image";

/**
 * Empty feed — Figma frame 650:37394 (desktop) / 664:16902 (mobile).
 * A 466x589 illustration centred in the feed column.
 */
export function EmptyFeed() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <Image
        src="/images/empty-feed.svg"
        alt=""
        width={466}
        height={589}
        className="h-auto w-full max-w-[300px] lg:max-w-[420px]"
      />
      <p className="max-w-[420px] font-sans text-base text-ink-300">
        Nothing here yet. Root a thought and your Circle will see it.
      </p>
    </div>
  );
}
