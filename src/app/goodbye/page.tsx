import { StatusCard, longDate } from "@/components/app/pass/PassStatus";
import { Button } from "@/components/ui/Button";

/**
 * "Account deletion requested" — Figma 1593:23224 (phone 1801:37825). Shown
 * after the danger zone schedules the deletion and signs them out, so it sits
 * outside the app (public in proxy.ts). Done goes home.
 */
export default async function GoodbyePage({ searchParams }: PageProps<"/goodbye">) {
  const { on } = await searchParams;
  const when = typeof on === "string" && !Number.isNaN(Date.parse(on)) ? longDate(on) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory-100 px-4 py-10">
      <div className="w-full max-w-[480px] rounded-2xl bg-surface p-6 sm:p-8">
        <StatusCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
              <path
                d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          tone="danger"
          title="Account deletion requested"
          actions={
            <Button size="md" fullWidth href="/">
              Done
            </Button>
          }
        >
          Your account is scheduled for permanent deletion{when ? ` on ${when}` : " in seven days"}. Sign back in any
          time before then to cancel. After that date, your data, Bonds, and posts are gone for good.
        </StatusCard>
      </div>
    </main>
  );
}
