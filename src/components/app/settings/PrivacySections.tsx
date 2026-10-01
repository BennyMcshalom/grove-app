"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { Card, Row, SectionLabel, Toggle } from "@/components/app/settings/SettingsView";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { updatePrivacy } from "@/app/(app)/settings/actions";
import { unblockUser } from "@/lib/bond-actions";

/**
 * Settings → Privacy & AI and Blocked accounts (PRD §12, §13). Figma has no
 * frame for either card; they reuse the Settings card, row and toggle. The
 * unblock confirmation is the PRD catalog's "Cross: Unblock confirmation".
 * None of this is ever behind the Season Pass.
 */
export interface PrivacySettings {
  /** "Show me in suggestions" — honoured by match_candidates. */
  discoverable: boolean;
  /** "Learn from my activity" — honoured by the interaction log. */
  activityMatching: boolean;
}

export interface BlockedAccount {
  userId: string;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export function PrivacyAiCard({ initial }: { initial: PrivacySettings }) {
  const toast = useToast();
  const [privacy, setPrivacy] = useState(initial);
  const [exporting, setExporting] = useState(false);

  // Optimistic, like the other Settings toggles.
  const save = async (patch: Partial<PrivacySettings>) => {
    const previous = privacy;
    setPrivacy({ ...privacy, ...patch });
    const result = await updatePrivacy(patch);
    if (result.error) {
      setPrivacy(previous);
      toast({ title: result.error, tone: "danger" });
    }
  };

  // "Export requested": the file is built on demand and saved straight away.
  const download = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/export", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const name =
        /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "grouv-data.json";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Your data is downloading", tone: "confirm" });
    } catch {
      toast({ title: "We couldn't put your data together. Try again.", tone: "danger" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <SectionLabel>Privacy &amp; AI</SectionLabel>
      <Row
        title="Show me in suggestions"
        body="Let people in your chapters find you in matches and People you may know. Off, only people you reach out to will see you."
        divider
        trailing={
          <Toggle
            label="Show me in suggestions"
            on={privacy.discoverable}
            onChange={() => save({ discoverable: !privacy.discoverable })}
          />
        }
      />
      <Row
        title="Learn from my activity"
        body="Let who you talk to, and how often, shape your Bonds. Off, Grouv stops learning from anything new you do."
        divider
        trailing={
          <Toggle
            label="Learn from my activity"
            on={privacy.activityMatching}
            onChange={() => save({ activityMatching: !privacy.activityMatching })}
          />
        }
      />
      <Row
        title="Download my data"
        body="Your profile, chapters, posts, Grouv Log, the messages you sent and your connections, as one file."
        trailing={
          <Button variant="secondary" size="sm" loading={exporting} onClick={() => void download()}>
            Download
          </Button>
        }
      />
    </Card>
  );
}

export function BlockedAccountsCard({ initial }: { initial: BlockedAccount[] }) {
  const toast = useToast();
  const [blocked, setBlocked] = useState(initial);
  const [confirming, setConfirming] = useState<BlockedAccount | null>(null);
  const [pending, startPending] = useTransition();

  const unblock = (person: BlockedAccount) =>
    startPending(async () => {
      const result = await unblockUser(person.userId);
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      setBlocked((prev) => prev.filter((b) => b.userId !== person.userId));
      setConfirming(null);
      toast({ title: `${person.name} is unblocked` });
    });

  return (
    <section id="blocked" className="w-full scroll-mt-6">
      <Card>
        <SectionLabel>Blocked accounts</SectionLabel>
        {blocked.length === 0 ? (
          <p className="pb-4 font-sans text-sm text-ink-300">
            You haven&rsquo;t blocked anyone. People you block can&rsquo;t message you or find you, and
            they&rsquo;ll show up here.
          </p>
        ) : (
          <ul className="flex flex-col">
            {blocked.map((person, i) => (
              <li
                key={person.userId}
                className={
                  i < blocked.length - 1
                    ? "flex items-center gap-3 border-b border-ink-50 py-3"
                    : "flex items-center gap-3 pt-3 pb-4"
                }
              >
                <Avatar src={person.avatarUrl} name={person.name} sizes="40px" className="size-10" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-sans text-base font-semibold text-ink-600">{person.name}</span>
                  <span className="font-sans text-sm text-ink-300" suppressHydrationWarning>
                    Blocked {new Date(person.blockedAt).toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConfirming(person)}>
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirming && (
        <Modal
          label={`Unblock ${confirming.name}?`}
          onClose={() => setConfirming(null)}
          width="max-w-[480px]"
          className="gap-4"
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-semibold text-ink-800">Unblock {confirming.name}?</h2>
            <p className="font-sans text-sm text-ink-300">
              They&rsquo;ll be able to message and find you again. You can always block them a second
              time if you need to.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" fullWidth loading={pending} onClick={() => unblock(confirming)}>
              Unblock
            </Button>
            <Button variant="tertiary" size="sm" fullWidth onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
