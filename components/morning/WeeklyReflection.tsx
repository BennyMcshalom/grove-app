"use client";
import { Icon } from "@/components/ui/Icon";

export function WeeklyReflection({
  weeklyQ,
  ans,
  setAns,
  saved,
  setSaved,
  onSave,
}: {
  weeklyQ: string;
  ans: string;
  setAns: (v: string) => void;
  saved: boolean;
  setSaved: (v: boolean) => void;
  onSave: (shared: boolean) => void;
}) {
  return (
    <div className="card" style={{ padding: "1.6rem" }}>
      <div
        className="label-mono"
        style={{ color: "var(--sage)", marginBottom: ".6rem" }}
      >
        This week&apos;s question
      </div>
      <p
        className="serif"
        style={{
          fontSize: "1.3rem",
          fontStyle: "italic",
          marginBottom: "1.1rem",
          lineHeight: 1.45,
          color: "var(--ink)",
        }}
      >
        {weeklyQ}
      </p>

      {/* Saved indicator */}
      {saved && !ans && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".4rem",
            fontSize: ".82rem",
            color: "var(--sage)",
            marginBottom: ".8rem",
          }}
        >
          <Icon name="check" size={13} stroke="var(--sage)" sw={2.5} />
          Reflected today
        </div>
      )}

      <textarea
        value={ans}
        onChange={(e) => {
          setAns(e.target.value);
          setSaved(false);
        }}
        placeholder="Your honest answer…"
        style={{
          width: "100%",
          minHeight: 100,
          padding: ".9rem 1rem",
          background: "var(--surf-high)",
          border: "1.5px solid var(--border-2)",
          borderRadius: "var(--r-md)",
          fontSize: ".97rem",
          lineHeight: 1.65,
          resize: "vertical",
          marginBottom: "1rem",
          color: "var(--ink)",
          transition: "border .15s, box-shadow .15s, background .15s",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--sage)";
          e.target.style.boxShadow = "0 0 0 3px rgba(78,125,94,.15)";
          e.target.style.background = "var(--white)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border-2)";
          e.target.style.boxShadow = "none";
          e.target.style.background = "var(--surf-high)";
        }}
      />

      <div style={{ display: "flex", gap: ".6rem" }}>
        <button
          onClick={() => onSave(false)}
          className="btn"
          style={{ background: "var(--sage)", color: "#fff", flex: 1 }}
        >
          {saved ? "Update reflection" : "Save privately"}
        </button>
        <button
          onClick={() => onSave(true)}
          className="btn btn-ghost"
          style={{ flex: 1 }}
        >
          Share to my space
        </button>
      </div>
    </div>
  );
}
