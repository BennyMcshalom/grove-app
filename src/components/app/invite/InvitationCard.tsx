import Image from "next/image";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import type { CompanionShare } from "@/lib/invites";

/**
 * "Invitation from John" — what someone invited to walk alongside a chapter
 * sees, in the app, on the /i/<token> link, and in the owner's Preview.
 *
 * The chapter banner (its Space wash and icon, "John's Career chapter",
 * YOU'RE INVITED and the title), why they were chosen, exactly what they'll
 * be able to see, and the reassurance that nothing of theirs changes.
 * Actions come from the caller.
 */
export function InvitationCard({
  senderName,
  chapterSlug,
  phase,
  title,
  why,
  ask,
  share,
  momentCount,
  children,
}: {
  senderName: string;
  chapterSlug: string;
  phase: string;
  title: string;
  why: string | null;
  ask: string | null;
  share: CompanionShare;
  momentCount: number;
  children?: React.ReactNode;
}) {
  const chapter = getChapter(chapterSlug);
  const chapterName = chapter?.name ?? "life";
  const access = [
    share.story && momentCount > 0 && `${senderName}’s ${momentCount} selected ${momentCount === 1 ? "moment" : "moments"}`,
    share.current && "Their current note and next milestone",
    share.future && "Future updates they choose to share",
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-2xl font-semibold text-ink-800">Invitation from {senderName}</h2>

      <div className={cn("flex flex-col gap-3 rounded-2xl p-5 sm:p-6", chapter?.cardClass ?? "bg-ivory-200")}>
        <span className="flex w-fit items-center gap-2 rounded-full bg-surface px-3 py-1.5">
          {chapter && <Image src={chapter.icon} alt="" width={20} height={20} className="size-5" />}
          <span className="font-sans text-xs font-medium text-ink-600">
            {senderName}&rsquo;s {chapterName} chapter
          </span>
        </span>
        <span className="font-sans text-xs font-semibold tracking-wide text-primary-600 uppercase">
          You&rsquo;re invited
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-display text-2xl font-semibold text-ink-800">{title}</p>
          {phase !== title && <p className="font-sans text-sm text-ink-400">{phase}</p>}
        </div>
        <p className="font-sans text-base text-ink-500">
          {senderName} wants you beside them in this chapter of their life.
        </p>
      </div>

      {why && (
        <figure className="flex flex-col gap-2 border-l-4 border-primary-300 pl-4">
          <figcaption className="font-sans text-sm font-medium text-ink-700">Why {senderName} chose you</figcaption>
          <blockquote className="font-display text-lg whitespace-pre-line text-ink-600">&ldquo;{why}&rdquo;</blockquote>
        </figure>
      )}

      {ask && (
        <div className="flex flex-col gap-1">
          <span className="font-sans text-sm font-medium text-ink-700">What would help</span>
          <p className="font-sans text-base whitespace-pre-line text-ink-400">{ask}</p>
        </div>
      )}

      {access.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl bg-ivory-100 p-4">
          <span className="font-sans text-sm font-medium text-ink-700">If you accept, you can see</span>
          <ul className="flex flex-col gap-2">
            {access.map((line) => (
              <li key={line} className="flex items-start gap-2 font-sans text-sm text-ink-500">
                <CheckIcon />
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-sans text-sm text-ink-300">
        You can reply and check in. {senderName}&rsquo;s private Log stays private, and your own {chapterName}{" "}
        chapter will not change.
      </p>

      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true">
      <path d="m4 10.5 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
