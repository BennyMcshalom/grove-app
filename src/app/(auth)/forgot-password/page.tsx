import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

/** "Forgot password?" from sign-in. No Figma frame; built from the sign-in and OTP screens. */
export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { email } = await searchParams;
  return <ForgotPasswordForm initialEmail={typeof email === "string" ? email : undefined} />;
}
