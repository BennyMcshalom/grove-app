"use client";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";

export function SigninForm({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loading,
  onSubmit,
}: {
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  const router = useRouter();

  return (
    <>
      <Field
        label="Email address"
        type="email"
        value={loginEmail}
        onChange={setLoginEmail}
        placeholder="you@email.com"
      />
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: ".35rem",
          }}
        >
          <span
            style={{
              fontSize: ".78rem",
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            Password
          </span>
          <button
            type="button"
            onClick={() => router.push("/forgot")}
            style={{
              fontSize: ".78rem",
              color: "var(--ember)",
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            Forgot password?
          </button>
        </div>
        <Field
          type="password"
          value={loginPassword}
          onChange={setLoginPassword}
          placeholder="Your password"
        />
      </div>
      <button
        className="btn btn-primary btn-block"
        disabled={loading}
        onClick={onSubmit}
        style={{ fontSize: "1rem", padding: ".85rem", marginBottom: "1rem" }}
      >
        {loading ? "Signing in…" : "Continue →"}
      </button>
    </>
  );
}
