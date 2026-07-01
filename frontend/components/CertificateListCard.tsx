"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { OwnedCertificate } from "@/lib/api";
import { getAttribute } from "@/lib/attributeHelper";
import LinkedInButton from "@/components/LinkedInButton";

// Loaded client-side only — @react-pdf/renderer is incompatible with SSR
const CertificateDownloadButton = dynamic(
  () => import("@/components/CertificateDownloadButton"),
  { ssr: false }
);

interface Props {
  cert: OwnedCertificate;
  /** Student display name shown in the PDF. Never the wallet address. */
  studentName?: string;
}

function getAttrs(
  metadata: Record<string, unknown> | null
): Array<{ trait_type: string; value: string }> {
  if (!metadata) return [];
  return (
    (metadata.attributes as Array<{ trait_type: string; value: string }> | undefined) ?? []
  );
}

function formatDateEs(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export default function CertificateListCard({ cert, studentName }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState(`/verify/${cert.tokenId}`);
  const router = useRouter();

  useEffect(() => {
    setVerifyUrl(`${window.location.origin}/verify/${cert.tokenId}`);
  }, [cert.tokenId]);

  const attrs = getAttrs(cert.metadata);
  const title = getAttribute(attrs, "microcredencial");
  const institution = getAttribute(attrs, "institucion");
  const rawDate = getAttribute(attrs, "fecha");
  const ects = getAttribute(attrs, "ects");

  const displayTitle = title !== "—" ? title : "Certificado";
  const displayInstitution = institution !== "—" ? institution : "ISTER";
  const displayDate = rawDate !== "—" ? formatDateEs(rawDate) : "—";

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  function handlePresent() {
    // Navigate to present mode; VerifyPresentMode will request fullscreen on mount via useEffect.
    router.push(`/verify/${cert.tokenId}?present=true`);
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-lg text-gray-800 leading-snug truncate">
              {displayTitle}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{displayInstitution}</p>
          </div>
          <span
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
              cert.isRevoked
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {cert.isRevoked ? "Revocado" : "Valido"}
          </span>
        </div>

        {/* Meta row */}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Fecha de emision</dt>
            <dd className="font-medium">{displayDate}</dd>
          </div>
          {ects !== "—" && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Creditos ECTS</dt>
              <dd className="font-medium">{ects}</dd>
            </div>
          )}
        </dl>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/verify/${cert.tokenId}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Ver certificado completo
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? "Enlace copiado" : "Compartir"}
          </button>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Codigo QR
          </button>
          {!cert.isRevoked && (
            <button
              type="button"
              onClick={handlePresent}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Presentar
            </button>
          )}
          {!cert.isRevoked && (
            <CertificateDownloadButton
              tokenId={cert.tokenId}
              attributes={attrs}
              studentName={studentName ?? "Participante"}
              txHash={cert.txHash}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            />
          )}
          {!cert.isRevoked && (
            <LinkedInButton
              certTitle={displayTitle}
              issueDate={rawDate}
              tokenId={cert.tokenId}
              certUrl={verifyUrl}
            />
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Codigo QR de verificacion"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4 max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-800 text-center">
              Verificar certificado
            </h2>
            <QRCodeSVG
              value={verifyUrl}
              size={192}
              bgColor="#ffffff"
              fgColor="#1e3a5f"
              level="M"
              includeMargin={false}
              aria-label="Codigo QR de verificacion"
            />
            <p className="text-xs text-gray-400 font-mono break-all text-center">
              {verifyUrl}
            </p>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className="mt-1 text-sm text-gray-500 hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
