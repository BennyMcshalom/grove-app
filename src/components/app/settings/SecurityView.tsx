"use client";

import { useState, useTransition } from "react";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { Card, Row, SectionLabel } from "@/components/app/settings/SettingsView";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { PinInput } from "@/components/ui/PinInput";
import { confirmTwoStepSetup, signOutOtherDevices, startTwoStepSetup, turnOffTwoStep } from "@/lib/auth/two-step";

type Setup = { factorId: string; qrCode: string; secret: string };

/** Settings → Security. No Figma frame; built from the other settings screens. */
export function SecurityView({ initialEnabled }: { initialEnabled: boolean }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [turningOff, setTurningOff] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [signingOut, startSignOut] = useTransition();

  const close = () => {
    setSetup(null);
    setTurningOff(false);
    setCode("");
    setError(undefined);
  };

  const begin = () =>
    start(async () => {
      const result = await startTwoStepSetup();
      if ("error" in result) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      setSetup(result);
    });

  const confirm = () =>
    start(async () => {
      if (!setup) return;
      const result = await confirmTwoStepSetup(setup.factorId, code);
      if (result.error) {
        setError(result.error);
        setCode("");
        return;
      }
      setEnabled(true);
      close();
      toast({ title: "Two-step verification is on", description: "You'll enter a code from your app when you sign in.", tone: "confirm" });
    });

  const disable = () =>
    start(async () => {
      const result = await turnOffTwoStep(code);
      if (result.error) {
        setError(result.error);
        setCode("");
        return;
      }
      setEnabled(false);
      close();
      toast({ title: "Two-step verification is off", tone: "confirm" });
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Security" back="/settings" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-4 pb-10">
          <Card>
            <SectionLabel>Two-step verification</SectionLabel>
            <p className="font-sans text-sm text-ink-400">
              {enabled
                ? "On. When you sign in, you'll enter your password and then a code from your authenticator app. Someone who learns your password still can't get in."
                : "Add a second step when you sign in: a 6-digit code from an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password. Someone who learns your password still can't get in."}
            </p>
            <div>
              {enabled ? (
                <Button variant="secondary" size="sm" onClick={() => setTurningOff(true)}>
                  Turn off
                </Button>
              ) : (
                <Button size="sm" loading={pending && !setup} onClick={begin}>
                  Turn on
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <SectionLabel>Your devices</SectionLabel>
            <Row
              title="Sign out everywhere else"
              body="Signs out every other phone, tablet and browser. You stay signed in here."
              onClick={() =>
                startSignOut(async () => {
                  const result = await signOutOtherDevices();
                  toast(
                    result.error
                      ? { title: result.error, tone: "danger" }
                      : { title: "Signed out of your other devices", tone: "confirm" },
                  );
                })
              }
            />
            {signingOut && <p className="font-sans text-xs text-ink-300">Signing out your other devices…</p>}
          </Card>

          <p className="font-sans text-xs text-ink-300">
            Lost the phone with your authenticator app? Email support@grouv.app from your account&rsquo;s email address and
            we&rsquo;ll help you back in after checking it&rsquo;s you.
          </p>
        </div>
      </div>

      {setup && (
        <Modal width="max-w-[480px]" onClose={close} label="Turn on two-step verification">
          <ModalHeader title="Turn on two-step verification" onClose={close} />
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) confirm();
            }}
          >
            <p className="font-sans text-sm text-ink-400">
              1. Scan this QR code with your authenticator app, or type in the key below.
            </p>
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- an SVG data URI from Supabase */}
              <img src={setup.qrCode} alt="QR code for your authenticator app" className="size-44" />
              <code className="font-mono text-xs tracking-wider break-all text-ink-700 select-all">{setup.secret}</code>
            </div>
            <p className="font-sans text-sm text-ink-400">2. Enter the 6-digit code the app shows for Grouv.</p>
            <FormError message={error} />
            <PinInput length={6} value={code} onChange={setCode} label="Authenticator code" />
            <Button type="submit" size="md" fullWidth loading={pending} disabled={code.length !== 6}>
              Turn on
            </Button>
          </form>
        </Modal>
      )}

      {turningOff && (
        <Modal width="max-w-[480px]" onClose={close} label="Turn off two-step verification">
          <ModalHeader title="Turn off two-step verification?" onClose={close} />
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) disable();
            }}
          >
            <p className="font-sans text-sm text-ink-400">
              Your account will only be protected by your password. Enter a code from your authenticator app to confirm.
            </p>
            <FormError message={error} />
            <PinInput length={6} value={code} onChange={setCode} label="Authenticator code" />
            <Button type="submit" variant="secondary" size="md" fullWidth loading={pending} disabled={code.length !== 6}>
              Turn off
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
