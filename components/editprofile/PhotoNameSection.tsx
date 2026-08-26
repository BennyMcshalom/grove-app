"use client";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import type { AuraKey } from "@/lib/types";
import { Section } from "./Section";
import { fieldStyle, focusStyle, blurStyle } from "./fieldStyle";

export function PhotoNameSection({
  name,
  setName,
  location,
  setLocation,
  aura,
  avatarUrl,
  uploading,
  locating,
  onPickPhoto,
  onDetectLocation,
  userName,
}: {
  name: string;
  setName: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  aura: AuraKey;
  avatarUrl: string | null | undefined;
  uploading: boolean;
  locating: boolean;
  onPickPhoto: () => void;
  onDetectLocation: () => void;
  userName: string;
}) {
  return (
    <Section label="Photo & name">
      <div style={{ display: "flex", alignItems: "center", gap: "1.1rem" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            name={name || userName}
            size={76}
            aura={aura}
            avatarUrl={avatarUrl}
          />
          <button
            onClick={onPickPhoto}
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--ember)",
              border: "2px solid var(--white)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            {uploading ? (
              <Spinner size={12} color="#fff" />
            ) : (
              <Icon name="image" size={14} stroke="#fff" />
            )}
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            style={fieldStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
          <div
            style={{
              display: "flex",
              gap: ".7rem",
              alignItems: "center",
              marginTop: ".5rem",
            }}
          >
            <button
              onClick={onPickPhoto}
              style={{
                fontSize: ".8rem",
                color: "var(--ember)",
                fontWeight: 500,
              }}
            >
              Upload a photo
            </button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <div
          style={{
            fontSize: ".78rem",
            fontWeight: 600,
            color: "var(--ink-3)",
            marginBottom: ".35rem",
          }}
        >
          Location
        </div>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <Icon name="pin" size={16} stroke="var(--ink-4)" />
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, country"
            style={{
              ...fieldStyle,
              paddingLeft: "2.3rem",
              paddingRight: "2.6rem",
            }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
          <button
            type="button"
            onClick={onDetectLocation}
            disabled={locating}
            title="Use current location"
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: locating ? "default" : "pointer",
            }}
          >
            {locating ? (
              <Spinner size={14} color="var(--ember)" />
            ) : (
              <Icon name="locate" size={16} stroke="var(--ember)" />
            )}
          </button>
        </div>
        <div
          style={{
            fontSize: ".74rem",
            color: "var(--ink-4)",
            marginTop: ".4rem",
          }}
        >
          Used only to surface people in your chapter nearby. Never shared
          precisely. Tap the target icon to detect it automatically.
        </div>
      </div>
    </Section>
  );
}
