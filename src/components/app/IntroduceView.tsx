"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { introducePeople } from "@/lib/bond-actions";

interface Side {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Introduce two people in your circle. Both hear who introduced them and
 * why; each can then connect with the other if it feels right.
 */
export function IntroduceView({ a, b }: { a: Side; b: Side }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [sending, startSending] = useTransition();

  const send = () => {
    setError(undefined);
    startSending(async () => {
      const result = await introducePeople(a.id, b.id, note);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
      toast({ title: `Introduced ${a.name} and ${b.name}` });
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Introduce" back="/home" />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto p-4 lg:p-8">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 rounded-3xl bg-surface p-6 lg:p-8">
          <div className="flex items-center justify-center gap-4">
            <Person side={a} />
            <span aria-hidden="true" className="h-px w-10 bg-ink-100" />
            <Person side={b} />
          </div>

          <div className="flex flex-col gap-1 text-center">
            <h1 className="font-display text-2xl font-semibold text-ink-600">
              {a.name} and {b.name} are in a similar chapter
            </h1>
            <p className="font-sans text-sm text-ink-300">
              They don&apos;t know each other yet. If you think they should, say why in your own words.
            </p>
          </div>

          {sent ? (
            <p className="text-center font-sans text-base text-ink-500">
              Sent. They&apos;ll each hear it came from you.
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="font-sans text-sm font-medium tracking-wide text-ink-500 uppercase">
                  A note to both · Optional
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder={`Why ${a.name} and ${b.name} should talk`}
                  className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
                />
              </label>
              <FormError message={error} />
              <Button onClick={send} loading={sending} fullWidth>
                Introduce them
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Person({ side }: { side: Side }) {
  return (
    <span className="flex flex-col items-center gap-2">
      <Avatar src={side.avatarUrl} name={side.name} className="size-14" />
      <span className="font-sans text-sm font-medium text-ink-600">{side.name}</span>
    </span>
  );
}
