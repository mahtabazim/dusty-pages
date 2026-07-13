"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Camera-based ISBN barcode scanner (EAN-13). Requires HTTPS or localhost for
 * camera access. Calls onDetected with the raw ISBN string.
 */
export function IsbnScanner({
  onDetected,
  onRawDetected,
  onClose,
  title = "Scan the barcode on the back cover",
}: {
  onDetected: (isbn: string) => void;
  /** Receives every decoded string (e.g. handover QR payloads). */
  onRawDetected?: (text: string) => void;
  onClose: () => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          undefined, // default (rear) camera
          videoRef.current,
          (result) => {
            if (result) {
              const raw = result.getText();
              onRawDetected?.(raw);
              const text = raw.replace(/[^0-9Xx]/g, "");
              if (text.length === 13 || text.length === 10) {
                controls.stop();
                onDetected(text);
              }
            }
          },
        );
        stop = () => controls.stop();
      } catch (err) {
        console.error("[scanner]", err);
        setError(
          "Camera unavailable. Allow camera access (HTTPS required) or type the ISBN below.",
        );
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [onDetected, onRawDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="font-medium">{title}</span>
        <Button variant="ghost" size="icon-sm" className="text-white" onClick={onClose}>
          <X className="size-5" />
        </Button>
      </div>
      {error ? (
        <p className="p-6 text-center text-sm text-white/80">{error}</p>
      ) : (
        <div className="relative flex-1">
          <video ref={videoRef} className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-64 rounded-lg border-2 border-white/80" />
          </div>
        </div>
      )}
    </div>
  );
}
