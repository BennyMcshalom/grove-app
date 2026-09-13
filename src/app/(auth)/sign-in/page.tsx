import { SignInForm } from "@/components/auth/SignInForm";

const OAUTH_ERROR = "Google sign-in didn't finish. Try again, or use your email.";

/** Sign in — Figma 23:125 (desktop) / 585:20020 (mobile). */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error } = await searchParams;

  return (
    <SignInForm
      next={typeof next === "string" ? next : undefined}
      initialError={error ? OAUTH_ERROR : undefined}
    />
  );
}
