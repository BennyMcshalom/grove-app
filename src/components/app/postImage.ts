import {
  PALETTE,
  LOGO_SRC,
  downscale,
  drawCover,
  fit,
  fontFamily,
  loadImage,
  wrapLines,
} from "@/components/app/wrapped/exportCard";
import { getChapter } from "@/lib/chapters";
import { progressLabel, type Post } from "@/lib/posts";

/**
 * A post as a PNG to promote it elsewhere — the card as Home draws it (Space,
 * author, title, words, first photo) with the Grouv wordmark under it. Plain
 * canvas like the Wrapped share card, and always the light palette.
 */
const WIDTH = 1080;
const PAD = 64;
const INNER = WIDTH - PAD * 2;
const CARD_PAD = 56;
const TEXT = INNER - CARD_PAD * 2;
const AVATAR = 96;
// A long post is cut so the image stays a sensible shape for a feed.
const MAX_TITLE_LINES = 6;
const MAX_BODY_LINES = 14;

function clampLines(ctx: CanvasRenderingContext2D, lines: string[], max: number, width: number) {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = fit(ctx, `${kept[max - 1]}…`, width);
  return kept;
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function renderPost(post: Post): Promise<Blob> {
  await document.fonts?.ready;
  const sans = fontFamily("--font-figtree", "system-ui, sans-serif");
  const display = fontFamily("--font-outfit", sans);
  const photoSrc = post.media.find((m) => m.kind === "photo")?.src;
  const [logo, avatar, photo] = await Promise.all([
    loadImage(LOGO_SRC),
    post.avatar && !post.anonymous ? loadImage(post.avatar) : Promise.resolve(null),
    photoSrc ? loadImage(photoSrc) : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.textBaseline = "top";

  const space = getChapter(post.chapterSlug)?.name;
  const badge = progressLabel(post.progress);
  const titleFont = `600 50px ${display}`;
  const bodyFont = `400 36px ${sans}`;
  ctx.font = titleFont;
  const titleLines = post.title ? clampLines(ctx, wrapLines(ctx, post.title, TEXT), MAX_TITLE_LINES, TEXT) : [];
  ctx.font = bodyFont;
  const bodyLines = post.body ? clampLines(ctx, wrapLines(ctx, post.body, TEXT), MAX_BODY_LINES, TEXT) : [];
  const photoHeight = photo
    ? Math.round(TEXT * Math.min(5 / 4, Math.max(9 / 16, photo.height / photo.width)))
    : 0;

  // Measure first so the canvas is exactly as tall as what's on it.
  const pillHeight = space ? 56 : 0;
  const authorHeight = AVATAR;
  const titleHeight = titleLines.length * 64;
  const bodyHeight = bodyLines.length * 52;
  const blocks = [pillHeight, authorHeight, titleHeight, bodyHeight, photoHeight].filter(Boolean);
  const cardHeight = CARD_PAD * 2 + blocks.reduce((a, b) => a + b, 0) + (blocks.length - 1) * 36;
  const footerHeight = 72;
  const height = PAD + cardHeight + 48 + footerHeight + PAD;

  canvas.width = WIDTH;
  canvas.height = height;
  ctx.fillStyle = PALETTE.page;
  ctx.fillRect(0, 0, WIDTH, height);

  // The card, in the warm wash posts carry.
  const top = PAD;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(PAD, top, INNER, cardHeight, 48);
  ctx.clip();
  const warm = ctx.createLinearGradient(PAD, top, PAD + INNER, top + cardHeight);
  warm.addColorStop(0, PALETTE.warmTo);
  warm.addColorStop(1, PALETTE.warmVia);
  ctx.fillStyle = warm;
  ctx.fillRect(PAD, top, INNER, cardHeight);
  ctx.restore();

  const x = PAD + CARD_PAD;
  let y = top + CARD_PAD;

  if (space) {
    ctx.font = `600 28px ${sans}`;
    const pillWidth = ctx.measureText(space).width + 48;
    ctx.fillStyle = PALETTE.eyebrow;
    ctx.beginPath();
    ctx.roundRect(x, y, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(space, x + 24, y + 13);
    y += pillHeight + 36;
  }

  // Author: photo (or initial), name, then stage and date.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + AVATAR / 2, y + AVATAR / 2, AVATAR / 2, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    drawCover(ctx, avatar, x, y, AVATAR, AVATAR);
  } else {
    ctx.fillStyle = PALETTE.warmFrom;
    ctx.fillRect(x, y, AVATAR, AVATAR);
    ctx.fillStyle = PALETTE.eyebrow;
    ctx.font = `600 44px ${sans}`;
    ctx.textAlign = "center";
    ctx.fillText((post.author.trim()[0] ?? "G").toUpperCase(), x + AVATAR / 2, y + 24);
    ctx.textAlign = "left";
  }
  ctx.restore();
  const nameX = x + AVATAR + 28;
  const nameWidth = TEXT - AVATAR - 28;
  ctx.fillStyle = PALETTE.title;
  ctx.font = `600 38px ${sans}`;
  ctx.fillText(fit(ctx, post.author, nameWidth), nameX, y + 6);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `400 28px ${sans}`;
  ctx.fillText(fit(ctx, [badge, dateLabel(post.createdAt)].filter(Boolean).join(" · "), nameWidth), nameX, y + 56);
  y += authorHeight + 36;

  if (titleLines.length) {
    ctx.fillStyle = PALETTE.title;
    ctx.font = titleFont;
    for (const line of titleLines) {
      ctx.fillText(line, x, y);
      y += 64;
    }
    y += 36;
  }

  if (bodyLines.length) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = bodyFont;
    for (const line of bodyLines) {
      ctx.fillText(line, x, y);
      y += 52;
    }
    y += 36;
  }

  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, TEXT, photoHeight, 32);
    ctx.clip();
    drawCover(ctx, photo, x, y, TEXT, photoHeight);
    ctx.restore();
  }

  // Footer: the wordmark, and where to find more.
  const footerTop = top + cardHeight + 48;
  if (logo) {
    const logoWidth = Math.round((logo.width / logo.height) * 60);
    ctx.drawImage(downscale(logo, logoWidth * 2), PAD, footerTop + 6, logoWidth, 60);
  }
  ctx.fillStyle = PALETTE.eyebrow;
  ctx.font = `600 30px ${sans}`;
  ctx.textAlign = "right";
  ctx.fillText("grouv.app", WIDTH - PAD, footerTop + 20);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png"),
  );
}

/** The post as a PNG file, named for its date. */
export async function postImage(post: Post): Promise<File> {
  const blob = await renderPost(post);
  return new File([blob], `grouv-post-${post.createdAt.slice(0, 10)}.png`, { type: "image/png" });
}
