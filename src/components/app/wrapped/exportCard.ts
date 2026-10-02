import { momentDateLabel, type ShareCardData } from "@/lib/wrapped";

/**
 * Renders the share card to a PNG in the browser and saves it — the PRD's
 * "preview a safe share card, export it". Plain canvas, no extra library.
 * Same layout as ShareCard.tsx: "Shared by" header with the logo, then the
 * 3:4 Log-style card (photo with the words over a dark fade, or a warm
 * words-only card).
 *
 * An exported image leaves the app, so it always uses the light palette
 * (the same values as the primary / ink / ivory tokens in globals.css)
 * whatever theme the member has on.
 */
const PALETTE = {
  page: "#faf9f7", // ivory-100
  eyebrow: "#dd661b", // primary-600
  title: "#0f0f0e", // ink-800
  text: "#141312", // ink-700
  muted: "#494948", // ink-400
  photo: "#0f0f0e", // ink-800
  warmFrom: "#fbd3b9", // primary-100
  warmVia: "#faf9f7", // ivory-100
  warmTo: "#fef1e9", // primary-50
};

// 1080px wide: well over 2x the ~420px the card is shown at on a phone.
const WIDTH = 1080;
const PAD = 64;
const INNER = WIDTH - PAD * 2;
const CARD_PAD = 56;
const RADIUS = 56;
const LOGO_HEIGHT = 72;
// The high-resolution wordmark (2565x720), not the 572px sidebar export.
const LOGO_SRC = "/images/logo-wordmark-36814b.png";

function fontFamily(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Word-wraps `text` to `width`, keeping the member's own line breaks. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Cuts `text` with an ellipsis so it fits `width`. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > width) out = out.slice(0, -1);
  return `${out}…`;
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/**
 * A big image squeezed in one drawImage comes out jagged; halving step by
 * step keeps the wordmark's outline smooth.
 */
function downscale(img: HTMLImageElement, targetWidth: number): CanvasImageSource {
  let source: HTMLImageElement | HTMLCanvasElement = img;
  let w = img.width;
  let h = img.height;
  while (w / 2 >= targetWidth) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    const step = document.createElement("canvas");
    step.width = w;
    step.height = h;
    const sctx = step.getContext("2d");
    if (!sctx) return source;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(source, 0, 0, w, h);
    source = step;
  }
  return source;
}

async function renderCard(card: ShareCardData): Promise<Blob> {
  // Webfonts must be ready or the first export falls back to system fonts.
  await document.fonts?.ready;
  const sans = fontFamily("--font-figtree", "system-ui, sans-serif");
  const display = fontFamily("--font-outfit", sans);
  const [logo, photo] = await Promise.all([
    loadImage(LOGO_SRC),
    card.photoUrl ? loadImage(card.photoUrl) : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const name = card.sharerName;
  const meta = `From ${name ? `${name}’s` : "a"} Grouv Log · ${momentDateLabel(card.date)}`;
  const textWidth = INNER - CARD_PAD * 2;

  // Measure the words first so the canvas is exactly as tall as the card.
  const bodyFont = photo ? `600 40px ${sans}` : `400 52px ${display}`;
  const lineHeight = photo ? 54 : 70;
  ctx.font = bodyFont;
  const lines = card.body ? wrapLines(ctx, card.body, textWidth) : [];
  const words = lines.length * lineHeight;
  // Photo: fade + words + meta at the bottom. Words-only: quote mark, words,
  // and the meta pinned under them.
  const content = photo
    ? 240 + words + (lines.length ? 20 : 0) + 34 + CARD_PAD
    : CARD_PAD + 56 + 28 + words + 64 + 34 + CARD_PAD;
  const cardHeight = Math.max(Math.round((INNER * 4) / 3), content);
  const headerHeight = 112;
  const height = PAD + headerHeight + 40 + cardHeight + PAD;

  canvas.width = WIDTH;
  canvas.height = height;
  ctx.fillStyle = PALETTE.page;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "top";

  // Header: who shared it, with the logo at its native 2565:720 ratio.
  let logoWidth = 0;
  if (logo) {
    logoWidth = Math.round((logo.width / logo.height) * LOGO_HEIGHT);
    ctx.drawImage(downscale(logo, logoWidth * 2), WIDTH - PAD - logoWidth, PAD, logoWidth, LOGO_HEIGHT);
  }
  const headerText = INNER - (logoWidth ? logoWidth + 32 : 0);
  ctx.fillStyle = PALETTE.title;
  ctx.font = `500 44px ${sans}`;
  ctx.fillText(fit(ctx, name ? `Shared by ${name}` : "Shared from Grouv", headerText), PAD, PAD + 2);
  ctx.fillStyle = PALETTE.eyebrow;
  ctx.font = `500 26px ${sans}`;
  ctx.fillText(
    fit(ctx, (name ? `Moment from ${name}’s Life Wrapped` : "A moment from a Life Wrapped").toUpperCase(), headerText),
    PAD,
    PAD + 66,
  );

  // The card.
  const top = PAD + headerHeight + 40;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(PAD, top, INNER, cardHeight, RADIUS);
  ctx.clip();

  if (photo) {
    ctx.fillStyle = PALETTE.photo;
    ctx.fillRect(PAD, top, INNER, cardHeight);
    drawCover(ctx, photo, PAD, top, INNER, cardHeight);
    const fadeTop = top + cardHeight - content;
    const fade = ctx.createLinearGradient(0, fadeTop, 0, top + cardHeight);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(0.45, "rgba(0,0,0,0.45)");
    fade.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = fade;
    ctx.fillRect(PAD, fadeTop, INNER, content);

    let y = top + cardHeight - CARD_PAD - 34 - (lines.length ? words + 20 : 0);
    ctx.fillStyle = "#ffffff";
    ctx.font = bodyFont;
    for (const line of lines) {
      ctx.fillText(line, PAD + CARD_PAD, y + 4);
      y += lineHeight;
    }
    if (lines.length) y += 20;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `500 28px ${sans}`;
    ctx.fillText(fit(ctx, meta, textWidth), PAD + CARD_PAD, y);
  } else {
    const warm = ctx.createLinearGradient(PAD, top, PAD + INNER, top + cardHeight);
    warm.addColorStop(0, PALETTE.warmFrom);
    warm.addColorStop(0.5, PALETTE.warmVia);
    warm.addColorStop(1, PALETTE.warmTo);
    ctx.fillStyle = warm;
    ctx.fillRect(PAD, top, INNER, cardHeight);

    let y = top + CARD_PAD;
    ctx.fillStyle = PALETTE.eyebrow;
    ctx.font = `700 96px Georgia, serif`;
    ctx.fillText("“", PAD + CARD_PAD - 4, y - 12);
    y += 56 + 28;
    ctx.fillStyle = PALETTE.text;
    ctx.font = bodyFont;
    for (const line of lines) {
      ctx.fillText(line, PAD + CARD_PAD, y);
      y += lineHeight;
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 28px ${sans}`;
    ctx.fillText(fit(ctx, meta, textWidth), PAD + CARD_PAD, top + cardHeight - CARD_PAD - 34);
  }
  ctx.restore();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png"),
  );
}

/** Saves the card as `grouv-moment-<date>.png`. Throws when it can't. */
export async function exportShareCard(card: ShareCardData) {
  const blob = await renderCard(card);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `grouv-moment-${card.date}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
