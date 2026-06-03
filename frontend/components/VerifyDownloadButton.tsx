"use client";

/**
 * Thin client wrapper that lazy-loads CertificateDownloadButton
 * so the SSR verify page can include a PDF download link without
 * breaking server-side rendering.
 */

import dynamic from "next/dynamic";

const CertificateDownloadButton = dynamic(
  () => import("@/components/CertificateDownloadButton"),
  { ssr: false }
);

interface Attribute {
  trait_type: string;
  value: string;
}

interface Props {
  tokenId: string;
  attributes: Attribute[];
}

export default function VerifyDownloadButton({ tokenId, attributes }: Props) {
  return (
    <CertificateDownloadButton
      tokenId={tokenId}
      attributes={attributes}
      studentName="Participante"
      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
    />
  );
}
