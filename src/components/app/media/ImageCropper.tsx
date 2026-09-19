"use client";

import { useEffect, useRef, useState } from "react";
import { MediaEditorShell, ToolButton, ToolChips } from "@/components/app/media/MediaEditorShell";

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Original", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

/**
 * Crop, zoom and rotate a picture.
 *
 * The frame holds still and the picture moves under it — the gesture every
 * phone camera roll uses — with a rule-of-thirds grid and corner brackets
 * while you're framing, so it's clear what will be kept. Applying redraws
 * only what the frame shows onto a canvas, so the upload is the crop.
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
  const [framing, setFraming] = useState(false);
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());

  // The stage is whatever room the shell leaves between its bars.
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setStage({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = new window.Image();
    element.onload = () => setImage(element);
    element.src = file.previewUrl;
  }, [file.previewUrl]);

  /** Any change to the frame re-centres the picture in it. */
  const reframe = (change: () => void) => {
    change();
    setOffset({ x: 0, y: 0 });
  };

  const turned = rotation % 180 !== 0;
  const naturalWidth = image ? (turned ? image.naturalHeight : image.naturalWidth) : 1;
  const naturalHeight = image ? (turned ? image.naturalWidth : image.naturalHeight) : 1;
  const frameAspect = aspect ?? naturalWidth / naturalHeight;

  const onPointerDown = (event: React.PointerEvent) => {
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    setFraming(true);
    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
      return;
    }
    drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinch.current && points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(clamp(pinch.current.zoom * (distance / pinch.current.distance)));
      return;
    }
    if (drag.current) {
      setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    points.current.delete(event.pointerId);
    if (points.current.size < 2) pinch.current = null;
    if (points.current.size === 0) {
      drag.current = null;
      setFraming(false);
    }
  };

  const apply = () => {
    const frame = frameRef.current;
    if (!image || !frame) return;
    setSaving(true);

    // What the frame shows, in frame pixels…
    const box = frame.getBoundingClientRect();
    const cover = Math.max(box.width / naturalWidth, box.height / naturalHeight) * zoom;
    const left = (box.width - naturalWidth * cover) / 2 + offset.x;
    const top = (box.height - naturalHeight * cover) / 2 + offset.y;

    // …mapped back onto the original picture.
    const scale = 1 / cover;
    const sourceX = -left * scale;
    const sourceY = -top * scale;
    const sourceWidth = box.width * scale;
    const sourceHeight = box.height * scale;

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
    const halfWidth = (turned ? canvas.height : canvas.width) / 2;
    const halfHeight = (turned ? canvas.width : canvas.height) / 2;
    context.drawImage(
      image,
      turned ? sourceY : sourceX,
      turned ? sourceX : sourceY,
      turned ? sourceHeight : sourceWidth,
      turned ? sourceWidth : sourceHeight,
      -halfWidth,
      -halfHeight,
      halfWidth * 2,
      halfHeight * 2,
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

  // Fit the frame inside the stage, whichever way round it is.
  const frameHeight = Math.max(0, Math.min(stage.height, stage.width / frameAspect));
  const frameWidth = frameHeight * frameAspect;

  const untouched = zoom === 1 && rotation === 0 && aspect === null && offset.x === 0 && offset.y === 0;

  return (
    <MediaEditorShell
      title="Edit photo"
      onCancel={onCancel}
      onDone={apply}
      doneDisabled={!image}
      busy={saving}
      toolbar={
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <div className="flex items-center gap-3">
            <ZoomIcon className="size-4 shrink-0 text-white/50" />
            <input
              type="range"
              aria-label="Zoom"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-1 flex-1 accent-primary-500"
            />
            <ZoomIcon className="size-6 shrink-0 text-white/50" />
          </div>

          <div className="flex items-center gap-2">
            <ToolChips options={ASPECTS} value={aspect} onChange={(next) => reframe(() => setAspect(next))} label="Aspect ratio" />
            <div className="ml-auto flex shrink-0 gap-2">
              <ToolButton label="Rotate" onClick={() => reframe(() => setRotation((r) => (r + 90) % 360))}>
                <RotateIcon className="size-5" />
              </ToolButton>
              <ToolButton
                label="Reset"
                onClick={() =>
                  reframe(() => {
                    setAspect(null);
                    setZoom(1);
                    setRotation(0);
                  })
                }
              >
                <ResetIcon className="size-5" />
              </ToolButton>
            </div>
          </div>
        </div>
      }
    >
      <div ref={stageRef} className="grid size-full place-items-center py-2">
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(event) => setZoom((z) => clamp(z - event.deltaY * 0.002))}
        style={{ width: frameWidth || undefined, height: frameHeight || undefined }}
        className="relative cursor-grab touch-none overflow-hidden rounded-xl bg-black/40 active:cursor-grabbing"
      >
        {image && (
          /* eslint-disable-next-line @next/next/no-img-element -- a local object URL, drawn to canvas on apply */
          <img
            src={file.previewUrl}
            alt=""
            draggable={false}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})` }}
            className="absolute inset-0 size-full object-cover select-none"
          />
        )}

        {/* Rule of thirds, while the picture is being moved. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${framing ? "opacity-100" : "opacity-0"}`}
        >
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
        </div>

        {/* Corner brackets: the frame is fixed, so these mark it rather than resize it. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute top-2 left-2 size-6 rounded-tl-md border-t-2 border-l-2 border-white/80" />
          <span className="absolute top-2 right-2 size-6 rounded-tr-md border-t-2 border-r-2 border-white/80" />
          <span className="absolute bottom-2 left-2 size-6 rounded-bl-md border-b-2 border-l-2 border-white/80" />
          <span className="absolute right-2 bottom-2 size-6 rounded-br-md border-r-2 border-b-2 border-white/80" />
        </div>

        {untouched && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-sans text-xs text-white/60">
            Drag to reposition · pinch or scroll to zoom
          </p>
        )}
      </div>
      </div>
    </MediaEditorShell>
  );
}

const clamp = (zoom: number) => Math.min(4, Math.max(1, zoom));

function ZoomIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 18 9 11l4 5 3-3 4 5H4Z" fill="currentColor" />
      <circle cx="8" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 9a8 8 0 1 1 1.6 6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 4v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 5h14v14H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
