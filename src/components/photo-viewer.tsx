"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { size } from "lodash";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

import { t } from "@/lib/i18n";
import {
  openMealPhotos,
  stepMealPhoto,
  type OpenMealPhotos,
} from "@/lib/photo-viewer";

export function useMealPhotoViewer() {
  const [open, setOpen] = useState<OpenMealPhotos | null>(null);
  const show = useCallback((urls: readonly string[], startIndex: number) => {
    setOpen(openMealPhotos(urls, startIndex));
  }, []);
  const step = useCallback((direction: -1 | 1) => {
    setOpen((current) =>
      current ? stepMealPhoto(current, direction) : current,
    );
  }, []);
  const close = useCallback(() => setOpen(null), []);
  return { open, show, step, close };
}

export function PhotoViewer({
  open,
  onClose,
  onStep,
}: {
  open: OpenMealPhotos | null;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const visible = open !== null;

  useEffect(() => {
    if (!visible) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onStep(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onStep(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, onClose, onStep]);

  if (!open) return null;
  const url = open.urls[open.index];
  if (!url) return null;
  const total = size(open.urls);
  const several = total > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("photo.open")}
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-card text-foreground"
        aria-label={t("photo.close")}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X className="size-5" />
      </button>
      {several ? (
        <button
          type="button"
          className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground disabled:opacity-35"
          aria-label={t("photo.previous")}
          disabled={open.index === 0}
          onClick={(event) => {
            event.stopPropagation();
            onStep(-1);
          }}
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={t("photo.position", {
          current: open.index + 1,
          total,
        })}
        className="max-h-[85vh] max-w-[min(100%,56rem)] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
      {several ? (
        <button
          type="button"
          className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground disabled:opacity-35"
          aria-label={t("photo.next")}
          disabled={open.index === total - 1}
          onClick={(event) => {
            event.stopPropagation();
            onStep(1);
          }}
        >
          <ChevronRight className="size-6" />
        </button>
      ) : null}
      {several ? (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-medium text-card">
          {t("photo.position", { current: open.index + 1, total })}
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
