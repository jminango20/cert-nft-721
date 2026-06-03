"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Attribute {
  trait_type: string;
  value: string;
}

interface Props {
  tokenId: string;
  isRevoked: boolean;
  title: string;
  institution: string;
  displayDate: string;
  ects: string;
  eqf: string;
  modalidad: string;
  evaluac: string;
  isLocked: boolean;
  verifyUrl: string;
  attrs: Attribute[];
}

export default function VerifyPresentMode({
  tokenId,
  isRevoked,
  title,
  institution,
  displayDate,
  ects,
  eqf,
  modalidad,
  evaluac,
  isLocked,
  verifyUrl,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPresenting = searchParams.get("present") === "true";

  // Request fullscreen when entering present mode
  useEffect(() => {
    if (!isPresenting) return;

    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Fullscreen may be denied if not triggered directly from user gesture
      });
    }
  }, [isPresenting]);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    // Remove ?present=true from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("present");
    router.replace(url.pathname + (url.search !== "?" ? url.search : ""));
  }, [router]);

  // Exit on Escape key
  useEffect(() => {
    if (!isPresenting) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPresenting, handleExit]);

  if (!isPresenting) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8">
      {/* Exit button */}
      <button
        type="button"
        onClick={handleExit}
        className="fixed top-4 right-4 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors shadow"
      >
        Salir
      </button>

      {/* Status badge */}
      <div
        className={`mb-6 px-6 py-2 rounded-full text-sm font-semibold tracking-wide ${
          isRevoked
            ? "bg-red-100 text-red-700"
            : "bg-green-100 text-green-700"
        }`}
      >
        {isRevoked ? "Revocado" : "Valido"}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-2 max-w-2xl">
        {title !== "—" ? title : `Certificado #${tokenId}`}
      </h1>

      {/* Institution */}
      <p className="text-xl text-gray-600 mb-1">
        {institution !== "—" ? institution : "ISTER"}
      </p>

      {/* Date */}
      {displayDate !== "—" && (
        <p className="text-base text-gray-500 mb-8">{displayDate}</p>
      )}

      {/* Academic fields */}
      <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-gray-700">
        {ects !== "—" && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-0.5">Creditos ECTS</p>
            <p className="font-semibold text-base">{ects}</p>
          </div>
        )}
        {eqf !== "—" && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-0.5">Nivel EQF</p>
            <p className="font-semibold text-base">{eqf}</p>
          </div>
        )}
        {modalidad !== "—" && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-0.5">Modalidad</p>
            <p className="font-semibold text-base">{modalidad}</p>
          </div>
        )}
        {evaluac !== "—" && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-0.5">Evaluacion</p>
            <p className="font-semibold text-base">{evaluac}</p>
          </div>
        )}
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-0.5">Soulbound</p>
          <p className="font-semibold text-base">{isLocked ? "Si" : "No"}</p>
        </div>
      </div>

      {/* QR code */}
      <div className="flex flex-col items-center gap-3">
        <QRCodeSVG
          value={verifyUrl || `/verify/${tokenId}`}
          size={200}
          bgColor="#ffffff"
          fgColor="#1e3a5f"
          level="M"
          includeMargin={false}
          aria-label={`Codigo QR para verificar certificado #${tokenId}`}
        />
        <p className="text-xs text-gray-400 font-mono break-all text-center max-w-xs">
          {verifyUrl}
        </p>
      </div>
    </div>
  );
}
