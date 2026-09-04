"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleButton, OrDivider } from "@/components/ui/GoogleButton";
import { ArrowRight } from "@/components/ui/ArrowRight";

/** Sign in — Figma 23:125 (desktop) / 585:20020 (mobile). */
export default function SignInPage() {
  const router = useRouter();

  return (
    <AuthSplitLayout>
      <form
        className="flex flex-col gap-5 lg:gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/verify");
        }}
      >
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-2xl leading-[1.04] font-semibold sm:text-3xl lg:text-4xl xl:text-5xl text-[#1F2937] ">
            Welcome back
          </h1>
          <p className="font-sans text-sm text-ink-300 lg:text-base">
            New here?{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-primary-500 hover:underline"
            >
              Create account
            </Link>
          </p>
        </header>

        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="johndoe@email.com"
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </div>

          <Button type="submit" size="md" fullWidth iconRight={<ArrowRight />}>
            Continue
          </Button>
        </div>

        <OrDivider />
        <GoogleButton />
      </form>
    </AuthSplitLayout>
  );
}
