"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import styles from "./PostFab.module.css";

// ── Floating "create a post" button — appears once the feed is scrolled
// down a bit, so composing isn't stuck all the way back at the top.
export function PostFab({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Create a post"
      className={clsx(styles.fab, visible && styles.visible)}
    >
      <Icon name="plus" size={24} stroke="#fff" sw={2.2} />
    </button>
  );
}
