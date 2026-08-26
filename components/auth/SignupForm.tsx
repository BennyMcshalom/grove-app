"use client";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { PasswordChecklist } from "@/components/ui/PasswordChecklist";

export function SignupForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  agree,
  setAgree,
  loading,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  const router = useRouter();

  return (
    <>
      <Field
        label="First name"
        value={name}
        onChange={setName}
        placeholder="What we'll call you"
        autoComplete="given-name"
      />
      <Field
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@email.com"
        autoComplete="email"
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        autoComplete="new-password"
      />
      <PasswordChecklist password={password} />
      <label
        style={{
          display: "flex",
          gap: ".6rem",
          alignItems: "flex-start",
          fontSize: ".82rem",
          color: "var(--ink-2)",
          margin: ".4rem 0 1.4rem",
          cursor: "pointer",
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          style={{
            marginTop: 2,
            accentColor: "var(--ember)",
            width: 15,
            height: 15,
            flexShrink: 0,
          }}
        />
        <span>
          I agree to Grouv&apos;s{" "}
          <a
            onClick={() => router.push("/legal")}
            style={{ color: "var(--ember)", cursor: "pointer" }}
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            onClick={() => router.push("/legal")}
            style={{ color: "var(--ember)", cursor: "pointer" }}
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>
      <button
        className="btn btn-primary btn-block"
        disabled={!agree || loading}
        onClick={onSubmit}
        style={{ fontSize: "1rem", padding: ".85rem", marginBottom: "1rem" }}
      >
        {loading ? "Creating account…" : "Begin your chapter →"}
      </button>
    </>
  );
}
