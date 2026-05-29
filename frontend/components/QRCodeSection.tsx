"use client";

import { QRCodeSVG } from "qrcode.react";

interface Props {
  url: string;
  tokenId: string;
}

export default function QRCodeSection({ url, tokenId }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeSVG
        value={url || `Token #${tokenId}`}
        size={160}
        bgColor="#ffffff"
        fgColor="#1e3a5f"
        level="M"
        includeMargin={false}
        aria-label={`Codigo QR para verificar certificado #${tokenId}`}
      />
      <p className="text-xs text-gray-400 font-mono break-all text-center max-w-[280px]">
        {url || `/verify/${tokenId}`}
      </p>
    </div>
  );
}
