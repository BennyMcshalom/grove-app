import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/VerifyForm";
import { getPendingEmail } from "@/lib/auth/actions";

/** OTP Verification — Figma 127:21282. No mobile frame exists; this reflows. */
export default async function VerifyPage() {
  const email = await getPendingEmail();
  // Nothing is waiting on a code (cookie expired or page opened directly).
  if (!email) redirect("/sign-up");

  return <VerifyForm email={email} />;
}
