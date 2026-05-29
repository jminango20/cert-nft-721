"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";

interface ClaimPreview {
  courseTitle: string;
  courseId: string;
  issueDate: string;
  ects: number;
  eqfLevel: number;
  assessmentType: string;
  participationMode: string;
  learningOutcomes: string;
  evidences: { type: string; title: string; url: string; hash?: string }[];
  ipfsCid?: string;
  alreadyClaimed: boolean;
  tokenId?: string;
}

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;

  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");

  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ tokenId: string; txHash: string } | null>(null);
  const [claimError, setClaimError] = useState("");

  useEffect(() => {
    fetch(`/api/claim/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setPreviewError(data.error);
        else setPreview(data as ClaimPreview);
      })
      .catch(() => setPreviewError("Error al cargar el certificado"))
      .finally(() => setLoadingPreview(false));
  }, [token]);

  async function handleClaim() {
    if (!authenticated) {
      login();
      return;
    }

    const wallet = wallets[0];
    if (!wallet) {
      setClaimError("No hay cartera conectada. Por favor, vuelve a iniciar sesion.");
      return;
    }

    setClaiming(true);
    setClaimError("");

    try {
      const walletAddress = wallet.address;

      const res = await fetch(`/api/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al reclamar");

      setClaimResult({ tokenId: data.tokenId, txHash: data.txHash });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setClaiming(false);
    }
  }

  if (loadingPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando certificado...</p>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow border border-red-200 p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Enlace no valido</h2>
          <p className="text-sm text-gray-500">{previewError}</p>
          <p className="text-xs text-gray-400 mt-3">
            El enlace de reclamacion tiene una validez de 48 horas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-lg w-full space-y-4">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Tu Microcredencial</h1>
          <p className="text-sm text-gray-500 mt-1">
            Reclama tu certificado NFT soulbound en la blockchain
          </p>
        </div>

        {/* Certificate preview card */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Microcredencial</p>
            <h2 className="text-xl font-bold text-gray-800">{preview!.courseTitle}</h2>
            <p className="text-sm text-gray-500 font-mono mt-1">{preview!.courseId}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Institucion</dt>
              <dd className="font-medium">ISTER</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Fecha de emision</dt>
              <dd className="font-medium">
                {new Date(preview!.issueDate).toLocaleDateString("es-ES")}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Creditos ECTS</dt>
              <dd className="font-medium">{preview!.ects} ECTS</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Nivel EQF</dt>
              <dd className="font-medium">Nivel {preview!.eqfLevel}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Modalidad</dt>
              <dd className="font-medium">{preview!.participationMode}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Tipo de Evaluacion</dt>
              <dd className="font-medium">{preview!.assessmentType}</dd>
            </div>
          </dl>

          {preview!.learningOutcomes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <dt className="text-gray-500 text-xs mb-1">Resultados de Aprendizaje</dt>
              <dd className="text-sm text-gray-700">{preview!.learningOutcomes}</dd>
            </div>
          )}

          {preview!.evidences && preview!.evidences.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-2">Evidencias ({preview!.evidences.length})</p>
              <ul className="space-y-1">
                {preview!.evidences.map((ev, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      {ev.type}
                    </span>
                    <span className="text-gray-700">{ev.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Claim section */}
        {preview!.alreadyClaimed ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="font-semibold text-green-800">Certificado ya reclamado</p>
            {preview!.tokenId && (
              <p className="text-sm text-gray-600 mt-1">
                Token ID #{preview!.tokenId}
              </p>
            )}
          </div>
        ) : claimResult ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="font-semibold text-green-800 text-lg mb-2">
              Certificado reclamado correctamente
            </p>
            <dl className="text-sm space-y-1 text-left">
              <div className="flex gap-2">
                <dt className="text-gray-600 shrink-0">Token ID:</dt>
                <dd className="font-mono font-bold">{claimResult.tokenId}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-600 shrink-0">TX:</dt>
                <dd className="font-mono text-xs truncate">{claimResult.txHash}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
            {!ready ? (
              <p className="text-sm text-gray-400 text-center">Cargando autenticacion...</p>
            ) : (
              <>
                {!authenticated && (
                  <p className="text-sm text-gray-600 mb-3 text-center">
                    Inicia sesion para vincular tu certificado a tu identidad digital
                  </p>
                )}

                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {claiming
                    ? "Procesando..."
                    : authenticated
                    ? "Reclamar mi certificado"
                    : "Iniciar sesion y reclamar"}
                </button>

                {claimError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {claimError}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3 text-center">
                  Tu certificado quedara vinculado a tu cartera de forma permanente (soulbound).
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
