"use client";

/**
 * Client-only PDF download button.
 * Imported via `next/dynamic` with `{ ssr: false }` to avoid
 * @react-pdf/renderer SSR incompatibility.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PDFDownloadLink } from "@react-pdf/renderer";
import QRCode from "qrcode";
import CertificatePDF from "@/components/CertificatePDF";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

interface Attribute {
  trait_type: string;
  value: string;
}

export interface CertificateDownloadButtonProps {
  tokenId: string;
  attributes: Attribute[];
  /** Student display name shown in PDF (never wallet address) */
  studentName: string;
  txHash?: string | null;
  className?: string;
}

function CertificateDownloadButtonInner({
  tokenId,
  attributes,
  studentName,
  txHash,
  className,
}: CertificateDownloadButtonProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const verifyUrl = `https://educert.vercel.app/verify/${tokenId}`;
    QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 200,
      color: { dark: "#1e3a5f", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => {
        // fallback: blank transparent PNG data url
        setQrDataUrl(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        );
      });
  }, [tokenId]);

  const baseClass =
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors";
  const defaultClass =
    "bg-brand-600 text-white hover:bg-brand-700";
  const buttonClass = className ?? `${baseClass} ${defaultClass}`;

  if (!qrDataUrl) {
    return (
      <button type="button" disabled className={`${buttonClass} opacity-50 cursor-not-allowed`}>
        Preparando PDF...
      </button>
    );
  }

  const pdfDoc = (
    <CertificatePDF
      tokenId={tokenId}
      attributes={attributes}
      studentName={studentName}
      contractAddress={CONTRACT_ADDRESS}
      txHash={txHash}
      qrDataUrl={qrDataUrl}
    />
  );

  const fileName = `certificado-${tokenId}-ISTER.pdf`;

  return (
    <PDFDownloadLink document={pdfDoc} fileName={fileName}>
      {({ loading }) => (
        <span className={buttonClass}>
          {loading ? "Generando PDF..." : "Descargar PDF"}
        </span>
      )}
    </PDFDownloadLink>
  );
}

// Export the component wrapped so it can also be consumed directly
// (the dynamic import happens at the call-sites to guarantee ssr:false).
export default CertificateDownloadButtonInner;
