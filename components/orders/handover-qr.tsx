"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Seller-side handover QR; the buyer scans it to release escrow. */
export function HandoverQr({
  orderId,
  token,
}: {
  orderId: string;
  token: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(`bb:handover:${orderId}:${token}`, {
      width: 480,
      margin: 2,
    }).then(setSrc);
  }, [orderId, token]);

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 text-center">
      <p className="text-sm font-medium">Show this QR to the buyer at the meetup</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Handover QR code" className="mx-auto w-56 rounded-lg" />
      ) : (
        <div className="mx-auto h-56 w-56 animate-pulse rounded-lg bg-muted" />
      )}
      <p className="text-xs text-muted-foreground">
        When they scan it, the escrowed coins are released to you instantly.
      </p>
    </div>
  );
}
