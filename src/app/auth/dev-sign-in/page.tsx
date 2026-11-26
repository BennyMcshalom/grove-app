import { notFound } from "next/navigation";
import { TeamSignInForm } from "@/components/auth/TeamSignInForm";
import { teamSignInMode } from "@/lib/auth/team-sign-in";

/** Team sign-in: local development, and staging with the team key. Off on grouv.app. */
export default async function TeamSignInPage() {
  const mode = await teamSignInMode();
  if (mode === "off") notFound();
  return <TeamSignInForm needsKey={mode === "staging"} />;
}
