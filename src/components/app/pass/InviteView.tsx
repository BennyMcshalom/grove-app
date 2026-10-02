"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Avatar } from "@/components/app/Avatar";
import { ShareSheet, type ShareChannel } from "@/components/app/ShareSheet";
import { useToast } from "@/components/app/ToastProvider";
import { TextAction, longDate } from "@/components/app/pass/PassStatus";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { claimReferralReward, nudgeReferral, recordReferralShare, sendReferralEmail } from "@/lib/pass-actions";

export interface Referral {
  id: string;
  firstName: string;
  avatarUrl: string | null;
  status: "joined" | "qualified" | "applied";
  joinedAt: string;
  nudgedAt: string | null;
}

type Dialog =
  | { kind: "email" }
  | { kind: "sent"; name: string }
  | { kind: "pending"; referral: Referral }
  | { kind: "earned"; referral: Referral }
  | { kind: "applied"; until: string };

/**
 * Settings → Invite a friend (PRD catalogue "Cross — Invite a friend"; no
 * Figma frame): the personal link with Copy / Message / Email / More ways to
 * share, the three counters, the friends who joined, and the Invitation sent,
 * Qualification pending, Reward earned and Reward applied dialogs.
 *
 * Qualification (PRD decision D7, open): the reward unlocks once the friend
 * completes a first chapter, i.e. closes one through the closing ritual. The
 * reward is one month of Season Pass, claimed from here.
 */
export function InviteView({
  link,
  stats,
  referrals,
  openId,
}: {
  link: string;
  stats: { invitesSent: number; friendsJoined: number; rewardsEarned: number };
  referrals: Referral[];
  /** From a notification: open that friend's dialog straight away. */
  openId?: string;
}) {
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog | null>(() => {
    const referral = referrals.find((r) => r.id === openId);
    if (referral?.status === "joined") return { kind: "pending", referral };
    if (referral?.status === "qualified") return { kind: "earned", referral };
    return null;
  });
  const message = `I'm on Grouv — a place for people in the same chapter of life. Join me: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copied", tone: "confirm" });
    } catch {
      toast({ title: "Couldn't copy — select the link and copy it instead.", tone: "danger" });
    }
  };

  const shareByMessage = () => {
    void recordReferralShare("message");
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };

  // A copied link isn't counted as an invite sent; every app share is.
  const countShare = (channel: ShareChannel) => {
    if (channel !== "copy") void recordReferralShare(channel === "sms" ? "message" : "share");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Invite a friend" back="/settings" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
          <section className="flex flex-col gap-6 rounded-lg bg-surface p-5 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] lg:p-8">
            <header className="flex flex-col gap-3">
              <h1 className="font-display text-2xl font-semibold text-ink-800">Bring someone into your next chapter.</h1>
              <p className="font-sans text-sm text-ink-400">
                Everyone you invite starts with 14 days of Season Pass, free. When they complete their first chapter,
                you get a month of Season Pass on us.
              </p>
            </header>

            <div className="flex items-center gap-2 rounded-xl bg-surface py-1.5 pr-1.5 pl-4 ring-1 ring-ivory-600">
              <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-ink-700 select-all">
                {link.replace(/^https?:\/\//, "")}
              </span>
              <Button size="sm" onClick={copy}>
                Copy link
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <ShareChip onClick={shareByMessage}>Message</ShareChip>
              <ShareChip onClick={() => setDialog({ kind: "email" })}>Email</ShareChip>
              <ShareSheet
                url={link}
                title="Join me on Grouv"
                text="I'm on Grouv — a place for people in the same chapter of life. Join me:"
                onShared={countShare}
                trigger={(open) => <ShareChip onClick={open}>More ways to share</ShareChip>}
              />
            </div>

            <dl className="grid grid-cols-3 gap-3">
              {[
                [stats.invitesSent, "Invites sent"],
                [stats.friendsJoined, "Friends joined"],
                [stats.rewardsEarned, "Rewards earned"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col gap-1 rounded-xl bg-ivory-100 p-3 ring-1 ring-ivory-600 lg:p-4">
                  <dd className="font-display text-2xl font-semibold text-ink-800">{value}</dd>
                  <dt className="font-sans text-xs text-ink-400">{label}</dt>
                </div>
              ))}
            </dl>

            <p className="font-sans text-xs text-ink-300">
              No code needed — your link does the work. Invite as many people as you&rsquo;d like.
            </p>
          </section>

          {referrals.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold text-ink-700">Friends who joined</h2>
              <ul className="flex flex-col divide-y divide-ivory-600 rounded-lg bg-surface shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
                {referrals.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar src={r.avatarUrl} name={r.firstName} sizes="40px" className="size-10 shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-sans text-sm font-semibold text-ink-800">{r.firstName}</span>
                      <span className="font-sans text-xs text-ink-400">
                        {r.status === "joined"
                          ? "Joined — almost there"
                          : r.status === "qualified"
                            ? "Finished a first chapter — your reward is ready"
                            : "Reward applied"}
                      </span>
                    </span>
                    {r.status === "joined" && (
                      <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "pending", referral: r })}>
                        Nudge
                      </Button>
                    )}
                    {r.status === "qualified" && (
                      <Button size="sm" onClick={() => setDialog({ kind: "earned", referral: r })}>
                        Claim reward
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {dialog?.kind === "email" && (
        <EmailInvite onClose={() => setDialog(null)} onSent={(name) => setDialog({ kind: "sent", name })} />
      )}
      {dialog?.kind === "sent" && (
        <InviteDialog
          title="Invite sent"
          onClose={() => setDialog(null)}
          primary={{ label: "Done", onClick: () => setDialog(null) }}
          secondary={{ label: "Invite someone else", onClick: () => setDialog({ kind: "email" }) }}
        >
          We let {dialog.name || "them"} know you&rsquo;re inviting them into Grouv. You&rsquo;ll hear the moment they join.
        </InviteDialog>
      )}
      {dialog?.kind === "pending" && <PendingDialog referral={dialog.referral} onClose={() => setDialog(null)} />}
      {dialog?.kind === "earned" && (
        <EarnedDialog
          referral={dialog.referral}
          onClose={() => setDialog(null)}
          onApplied={(until) => setDialog({ kind: "applied", until })}
        />
      )}
      {dialog?.kind === "applied" && <AppliedDialog until={dialog.until} onClose={() => setDialog(null)} />}
    </div>
  );
}

function ShareChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-pill bg-primary-50 px-4 py-2 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-100"
    >
      {children}
    </button>
  );
}

/** The referral dialogs: title, a line, one primary action and an optional quiet one. */
function InviteDialog({
  title,
  children,
  primary,
  secondary,
  onClose,
  error,
}: {
  title: string;
  children: React.ReactNode;
  primary: { label: string; onClick: () => void; loading?: boolean };
  secondary?: { label: string; onClick: () => void };
  onClose: () => void;
  error?: string;
}) {
  return (
    <Modal label={title} onClose={onClose} width="max-w-[480px]">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-ink-800">{title}</h2>
        <p className="font-sans text-sm text-ink-400">{children}</p>
      </div>
      <FormError message={error} />
      <div className="flex flex-col items-stretch gap-1">
        <Button size="md" fullWidth loading={primary.loading} onClick={primary.onClick}>
          {primary.label}
        </Button>
        {secondary && (
          <TextAction tone="muted" onClick={secondary.onClick}>
            {secondary.label}
          </TextAction>
        )}
      </div>
    </Modal>
  );
}

function EmailInvite({ onClose, onSent }: { onClose: () => void; onSent: (name: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [sending, startSending] = useTransition();

  const send = () =>
    startSending(async () => {
      setErrors({});
      setError(undefined);
      const result = await sendReferralEmail({ name, email });
      if (result.fieldErrors) return setErrors(result.fieldErrors);
      if (result.error) return setError(result.error);
      onSent(name.trim());
    });

  return (
    <Modal label="Invite by email" onClose={onClose} width="max-w-[480px]">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-ink-800">Invite by email</h2>
        <p className="font-sans text-sm text-ink-400">We&rsquo;ll send your link from Grouv, in your name.</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Input label="Their first name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={50} />
        <Input
          label="Their email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="off"
        />
        <FormError message={error} />
        <Button type="submit" size="md" fullWidth loading={sending} disabled={!email.trim()}>
          Send invite
        </Button>
      </form>
    </Modal>
  );
}

function PendingDialog({ referral, onClose }: { referral: Referral; onClose: () => void }) {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [sending, startSending] = useTransition();

  return (
    <InviteDialog
      title={`${referral.firstName} joined — almost there`}
      onClose={onClose}
      error={error}
      primary={{
        label: "Send a nudge",
        loading: sending,
        onClick: () =>
          startSending(async () => {
            const result = await nudgeReferral(referral.id);
            if (result.error) return setError(result.error);
            toast({ title: `Nudge sent to ${referral.firstName}`, tone: "confirm" });
            onClose();
          }),
      }}
    >
      Your reward unlocks once {referral.firstName} completes their first chapter. Nudge them along, or just sit back
      and wait.
    </InviteDialog>
  );
}

function EarnedDialog({
  referral,
  onClose,
  onApplied,
}: {
  referral: Referral;
  onClose: () => void;
  onApplied: (until: string) => void;
}) {
  const [error, setError] = useState<string>();
  const [claiming, startClaiming] = useTransition();

  return (
    <InviteDialog
      title="You earned a reward!"
      onClose={onClose}
      error={error}
      primary={{
        label: "Claim reward",
        loading: claiming,
        onClick: () =>
          startClaiming(async () => {
            const result = await claimReferralReward(referral.id);
            if (result.error || !result.until) return setError(result.error ?? "We couldn't add your reward. Try again.");
            onApplied(result.until);
          }),
      }}
      secondary={{ label: "Maybe later", onClick: onClose }}
    >
      One month of Season Pass, on us — for bringing {referral.firstName} into Grouv.
    </InviteDialog>
  );
}

function AppliedDialog({ until, onClose }: { until: string; onClose: () => void }) {
  const router = useRouter();
  return (
    <InviteDialog
      title="Reward applied"
      onClose={onClose}
      primary={{ label: "View subscription", onClick: () => router.push("/settings/subscription") }}
    >
      One month of Season Pass has been added to your account, active until {longDate(until)}. Enjoy everything
      unlocked.
    </InviteDialog>
  );
}

