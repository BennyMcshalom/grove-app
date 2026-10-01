import { momentDateLabel, wrapRangeLabel, type ShareCardData } from "@/lib/wrapped";

/**
 * Renders the share card to a PNG in the browser and saves it — the PRD's
 * "preview a safe share card, export it". Plain canvas, no extra library.
 *
 * An exported image leaves the app, so it always uses the light palette
 * (the same values as the primary / ink / ivory tokens in globals.css)
 * whatever theme the member has on.
 */
const PALETTE = {
  card: "#ffffff",
  eyebrow: "#dd661b", // primary-600
  muted: "#676666", // ink-300
  text: "#141312", // ink-700
  photo: "#0f0f0e", // ink-800
};

const WIDTH = 1080;
const PAD = 96;
const INNER = WIDTH - PAD * 2;

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

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

async function renderCard(card: ShareCardData): Promise<Blob> {
  const sans = fontFamily("--font-figtree", "system-ui, sans-serif");
  const [logo, photo] = await Promise.all([
    loadImage("/images/logo-sidebar.png"),
    card.photoUrl ? loadImage(card.photoUrl) : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Measure the quote first so the canvas is exactly as tall as the card.
  ctx.font = `400 40px ${sans}`;
  const lines = card.body ? wrapLines(ctx, card.body, INNER) : [];
  const photoHeight = photo ? Math.round((INNER * 260) / 596) : 0;
  const height =
    PAD + 100 + 48 + 40 + 40 + (photo ? photoHeight + 32 : 0) + 36 + (lines.length ? 56 + lines.length * 58 : 0) + PAD;

  canvas.width = WIDTH;
  canvas.height = height;
  ctx.fillStyle = PALETTE.card;
  ctx.fillRect(0, 0, WIDTH, height);

  let y = PAD;
  if (logo) {
    const h = 100;
    ctx.drawImage(logo, PAD, y, (logo.width / logo.height) * h, h);
  }
  y += 100 + 48;

  ctx.textBaseline = "top";
  ctx.fillStyle = PALETTE.eyebrow;
  ctx.font = `500 28px ${sans}`;
  ctx.fillText(
    (card.sharerName ? `Moment from ${card.sharerName}’s Life Wrapped` : "A moment from a Life Wrapped").toUpperCase(),
    PAD,
    y,
  );
  y += 40;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `400 30px ${sans}`;
  ctx.fillText(wrapRangeLabel(card.range, card.startsOn, card.endsOn), PAD, y);
  y += 40;

  if (photo) {
    y += 8;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(PAD, y, INNER, photoHeight, 32);
    ctx.clip();
    ctx.fillStyle = PALETTE.photo;
    ctx.fillRect(PAD, y, INNER, photoHeight);
    drawCover(ctx, photo, PAD, y, INNER, photoHeight);
    ctx.restore();
    y += photoHeight + 24;
  }

  ctx.fillStyle = PALETTE.muted;
  ctx.font = `400 26px ${sans}`;
  ctx.fillText(`From ${card.sharerName ? `${card.sharerName}’s` : "a"} Grouv Log · ${momentDateLabel(card.date)}`, PAD, y);
  y += 36;

  if (lines.length) {
    y += 16;
    ctx.fillStyle = PALETTE.eyebrow;
    ctx.font = `700 56px Georgia, serif`;
    ctx.fillText("“", PAD, y - 8);
    y += 40;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 40px ${sans}`;
    for (const line of lines) {
      ctx.fillText(line, PAD, y);
      y += 58;
    }
  }

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
