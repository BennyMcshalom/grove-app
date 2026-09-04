"use client";

import Image from "next/image";
import { useState } from "react";
import { PostMenu } from "@/components/app/PostMenu";
import { cn } from "@/lib/cn";

/**
 * Post — Figma component set 90:1354.
 *
 * Variants in Figma are "Post", "Post with video", "Comment with photo" and
 * "Grouv"; here the media is a prop since the chrome is identical across them.
 */
export interface Post {
  id: string;
  author: string;
  avatar: string;
  badge?: string;
  time: string;
  title?: string;
  body: string;
  media?: { src: string; kind: "photo" | "video" };
  roots: number;
  comments: number;
}

export function PostCard({ post }: { post: Post }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="flex gap-4 rounded-2xl bg-white p-5 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
        <Image
          src={post.avatar}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex items-start justify-between gap-2">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="font-sans text-lg font-semibold text-ink-700">
                {post.author}
              </span>
              {post.badge && (
                <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 font-sans text-xs font-semibold text-primary-500">
                  <BriefcaseIcon className="size-3" />
                  {post.badge}
                </span>
              )}
            </div>
            <span className="font-sans text-base text-ink-300">
              {post.time}
            </span>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Post options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded p-1 text-ink-400 transition-colors hover:bg-ivory-200"
            >
              <DotsIcon className="size-6" />
            </button>
            {menuOpen && <PostMenu onClose={() => setMenuOpen(false)} />}
          </div>
        </header>

        <div className="flex flex-col gap-1 py-2">
          {post.title && (
            <h2 className="font-sans text-xl font-semibold text-ink-700">
              {post.title}
            </h2>
          )}
          <p className="font-sans text-base text-ink-400">{post.body}</p>
        </div>

        {post.media && (
          <div className="relative aspect-[589/332] w-full overflow-hidden rounded-2xl">
            <Image
              src={post.media.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 589px, 100vw"
              className="object-cover"
            />
            {post.media.kind === "video" && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                  <PlayIcon className="size-6" />
                </span>
              </span>
            )}
          </div>
        )}

        <hr className="border-ink-50" />

        <footer className="flex flex-wrap gap-5 py-3">
          <Action
            icon={<PlantIcon className="size-6" />}
            label={`Root ${post.roots}`}
            tone="root"
          />
          <Action
            icon={<ChatIcon className="size-6" />}
            label={`Comment ${post.comments}`}
            tone="muted"
          />
          <Action
            icon={<ShareIcon className="size-6" />}
            label="Share"
            tone="outline"
          />
        </footer>
      </div>
    </article>
  );
}

function Action({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "root" | "muted" | "outline";
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 font-sans text-sm transition-colors",
        tone === "root" && "bg-primary-50 text-primary-500 hover:bg-primary-100",
        tone === "muted" && "bg-ivory-400 text-ink-400 hover:bg-ivory-500",
        tone === "outline" &&
          "border-[1.3px] border-ink-400 text-ink-400 hover:bg-ivory-200",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M1.5 4h9v6h-9V4ZM4.25 4V3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75v1"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlantIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21v-7m0 0c0-3.3 2.7-6 6-6h2v1a6 6 0 0 1-6 6h-2Zm0 0c0-2.8-2.2-5-5-5H5v1a5 5 0 0 0 5 5h2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.3A7.9 7.9 0 0 1 4 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="18" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18" cy="12" r="1.8" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}
