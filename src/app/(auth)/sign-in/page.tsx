import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";
import { TeamSignInForm } from "@/components/auth/TeamSignInForm";
import { teamSignInMode } from "@/lib/auth/team-sign-in";

const OAUTH_ERROR = "Google sign-in didn't finish. Try again, or use your email.";

/**
 * Sign in. On staging (grouv-staging.vercel.app) the team-key form comes
 * first, since that's how the team gets in there; ?with=email shows the
 * normal email and password form. grouv.app and localhost are unchanged.
 */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error, with: method } = await searchParams;

  if ((await teamSignInMode()) === "staging" && method !== "email") {
    return (
      <TeamSignInForm
        needsKey
        footer={
          <Link href="/sign-in?with=email" className="font-semibold text-primary-500 hover:underline">
            Use email and password instead
          </Link>
        }
      />
    );
  }

  return (
    <SignInForm
      next={typeof next === "string" ? next : undefined}
      initialError={error ? OAUTH_ERROR : undefined}
    />
  );
}
