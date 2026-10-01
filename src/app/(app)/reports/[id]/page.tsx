import { notFound } from "next/navigation";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { reportSubject } from "@/lib/notifications";
import { REPORT_REASONS } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

/**
 * A report's outcome — where "Update on your report" points (PRD catalog,
 * Cross: Review outcome available). Figma has no frame for it; it reuses the
 * Settings card. Only the reporter can open it, and it says what happened,
 * never who decided (PRD §13: "never disclose reviewer identity").
 */
export default async function ReportOutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_report", { p_report_id: id });
  const report = data?.[0];
  if (!report) notFound();

  const about = reportSubject({ subject: report.subject, target_type: report.target_type });
  const reason = REPORT_REASONS.find((r) => r.value === report.reason)?.label ?? report.reason;
  const outcome = OUTCOMES[report.status];
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Your report" back="/settings" />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
          <section className="flex flex-col gap-4 rounded-lg bg-surface px-5 py-6 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
            <span className="font-sans text-sm text-ink-200 uppercase">Your report about {about}</span>
            <div className="flex flex-col gap-2" role="status">
              <h1 className="font-display text-xl font-semibold text-ink-800">{outcome.title}</h1>
              <p className="font-sans text-sm text-ink-300">{outcome.body}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-ink-50 pt-4 font-sans text-sm">
              <dt className="text-ink-300">Reason</dt>
              <dd className="text-ink-600">{reason}</dd>
              <dt className="text-ink-300">Sent</dt>
              <dd className="text-ink-600" suppressHydrationWarning>{date(report.created_at)}</dd>
              {report.reviewed_at && (
                <>
                  <dt className="text-ink-300">Reviewed</dt>
                  <dd className="text-ink-600" suppressHydrationWarning>{date(report.reviewed_at)}</dd>
                </>
              )}
            </dl>
            <p className="font-sans text-sm text-ink-300">
              You can block anyone at any time from their profile or your chat. Blocked accounts are
              listed in Settings.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" href="/home">
                Done
              </Button>
              <Button size="sm" variant="secondary" href="/settings#blocked">
                Blocked accounts
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const OUTCOMES = {
  open: {
    title: "We're looking into it",
    body: "Our safety team reviews every report. We'll let you know here when there's an outcome.",
  },
  reviewing: {
    title: "We're looking into it",
    body: "Our safety team reviews every report. We'll let you know here when there's an outcome.",
  },
  actioned: {
    title: "We took action",
    body: "What you reported went against how Grouv works, so it's been taken down. Thank you for looking out for the community.",
  },
  dismissed: {
    title: "We reviewed it and left it up",
    body: "It didn't go against our guidelines this time. If it keeps happening, or you'd rather not see them, you can block them — they won't be able to message or find you.",
  },
} as const;
