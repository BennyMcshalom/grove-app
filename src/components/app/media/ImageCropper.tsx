"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const ASPECTS = [
  { label: "Original", value: null },
  { label: "Square", value: 1 },
  { label: "Portrait", value: 4 / 5 },
  { label: "Wide", value: 16 / 9 },
] as const;

/**
 * Crop, zoom and rotate a picture before it is posted.
 *
 * The frame stays still and the picture moves inside it: drag to reposition,
 * the slider zooms, and rotation turns in quarters. Applying redraws just the
 * visible part onto a canvas, so what is uploaded is exactly what was framed.
 */
export function ImageCropper({
  file,
  onCancel,
  onApply,
}: {
  file: { name: string; previewUrl: string };
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = new window.Image();
    element.onload = () => setImage(element);
    element.src = file.previewUrl;
  }, [file.previewUrl]);

  /** Changing the frame re-centres the picture inside it. */
  const reframe = (change: () => void) => {
    change();
    setOffset({ x: 0, y: 0 });
  };

  const turned = rotation % 180 !== 0;
  const naturalWidth = image ? (turned ? image.naturalHeight : image.naturalWidth) : 1;
  const naturalHeight = image ? (turned ? image.naturalWidth : image.naturalHeight) : 1;
  const frameAspect = aspect ?? naturalWidth / naturalHeight;

  const onPointerDown = (event: React.PointerEvent) => {
    dragging.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current) return;
    setOffset({ x: event.clientX - dragging.current.x, y: event.clientY - dragging.current.y });
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  const apply = () => {
    const frame = frameRef.current;
    if (!image || !frame) return;
    setSaving(true);

    // What the frame shows, in frame pixels…
    const frameBox = frame.getBoundingClientRect();
    const cover = Math.max(frameBox.width / naturalWidth, frameBox.height / naturalHeight) * zoom;
    const drawnWidth = naturalWidth * cover;
    const drawnHeight = naturalHeight * cover;
    const left = (frameBox.width - drawnWidth) / 2 + offset.x;
    const top = (frameBox.height - drawnHeight) / 2 + offset.y;

    // …mapped back onto the original picture.
    const scale = 1 / cover;
    const sourceX = -left * scale;
    const sourceY = -top * scale;
    const sourceWidth = frameBox.width * scale;
    const sourceHeight = frameBox.height * scale;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth);
    canvas.height = Math.round(sourceHeight);
    const context = canvas.getContext("2d");
    if (!context) {
      setSaving(false);
      return;
    }
    context.imageSmoothingQuality = "high";
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotation * Math.PI) / 180);
    // After rotating, the source rectangle is measured in the turned frame.
    const halfW = (turned ? canvas.height : canvas.width) / 2;
    const halfH = (turned ? canvas.width : canvas.height) / 2;
    context.drawImage(
      image,
      turned ? sourceY : sourceX,
      turned ? sourceX : sourceY,
      turned ? sourceHeight : sourceWidth,
      turned ? sourceWidth : sourceHeight,
      -halfW,
      -halfH,
      halfW * 2,
      halfH * 2,
    );

    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onApply(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/60 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${file.name}`}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-surface p-5"
      >
        <h2 className="font-display text-lg font-semibold text-ink-700">Edit photo</h2>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ aspectRatio: String(frameAspect) }}
          className="relative w-full cursor-grab touch-none overflow-hidden rounded-xl bg-ivory-300 active:cursor-grabbing"
        >
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element -- a local object URL, drawn to canvas on apply */
            <img
              src={file.previewUrl}
              alt=""
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
              }}
              className="absolute inset-0 size-full object-cover select-none"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => reframe(() => setAspect(option.value))}
              className={cn(
                "rounded-full px-3 py-1.5 font-sans text-sm transition-colors",
                aspect === option.value ? "bg-primary-500 text-white" : "bg-ivory-200 text-ink-500 hover:bg-ivory-300",
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => reframe(() => setRotation((r) => (r + 90) % 360))}
            className="ml-auto rounded-full bg-ivory-200 px-3 py-1.5 font-sans text-sm text-ink-500 transition-colors hover:bg-ivory-300"
          >
            Rotate
          </button>
        </div>

        <label className="flex items-center gap-3">
          <span className="font-sans text-sm text-ink-400">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1 flex-1 accent-primary-500"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="tertiary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" loading={saving} disabled={!image} onClick={apply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
