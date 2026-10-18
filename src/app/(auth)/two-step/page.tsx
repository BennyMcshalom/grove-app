import { TwoStepForm } from "@/components/auth/TwoStepForm";

/** Sign-in step two for accounts with two-step verification. The proxy only lets aal1 sessions here. */
export default async function TwoStepPage({ searchParams }: PageProps<"/two-step">) {
  const { next } = await searchParams;
  return <TwoStepForm next={typeof next === "string" ? next : undefined} />;
}
