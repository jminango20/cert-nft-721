import { Suspense } from "react";
import Link from "next/link";
import { CertificateInfo, EvidenceItem } from "@/lib/api";
import { getAttribute, Attribute } from "@/lib/attributeHelper";
import { ipfsToHttp } from "@/lib/ipfs";
import QRCodeSection from "@/components/QRCodeSection";
import EvidenceList from "@/components/EvidenceList";
import VerifyDownloadButton from "@/components/VerifyDownloadButton";
import VerifyPresentMode from "@/components/VerifyPresentMode";
import LinkedInButton from "@/components/LinkedInButton";
import BlockchainProofHeading from "@/components/BlockchainProofHeading";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const EXPLORER_BASE = "https://sepolia.etherscan.io";

async function getCert(tokenId: string): Promise<CertificateInfo | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/verify/${tokenId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getAttrs(metadata: Record<string, unknown> | null): Attribute[] {
  if (!metadata) return [];
  return (metadata.attributes as Attribute[] | undefined) ?? [];
}

export default async function VerifyTokenPage({
  params,
}: {
  params: { tokenId: string };
}) {
  const cert = await getCert(params.tokenId);
  const verifyUrl = `${APP_URL}/verify/${params.tokenId}`;

  // Precompute attribute array once — reused throughout the page
  const certAttrs = cert ? getAttrs(cert.metadata) : [];
  const presentTitle = getAttribute(certAttrs, "microcredencial");
  const presentInstitution = getAttribute(certAttrs, "institucion");
  const presentRawDate = getAttribute(certAttrs, "fecha");
  const presentDisplayDate =
    presentRawDate !== "—"
      ? new Date(presentRawDate).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";

  return (
    <>
      {/* Fullscreen presentation overlay — only mounts when ?present=true */}
      {cert && (
        <Suspense fallback={null}>
          <VerifyPresentMode
            tokenId={params.tokenId}
            isRevoked={cert.isRevoked}
            title={presentTitle}
            institution={presentInstitution}
            displayDate={presentDisplayDate}
            ects={getAttribute(certAttrs, "ects")}
            eqf={getAttribute(certAttrs, "eqf")}
            modalidad={getAttribute(certAttrs, "modalidad")}
            evaluac={getAttribute(certAttrs, "evaluac")}
            isLocked={cert.isLocked}
            verifyUrl={verifyUrl}
            attrs={certAttrs}
          />
        </Suspense>
      )}
    <div className="min-h-screen flex flex-col items-center p-6 bg-gray-50">
      <div className="max-w-2xl w-full space-y-4 py-6">
        <Link href="/verify" className="text-sm text-brand-600 hover:underline block">
          Verificar otro certificado
        </Link>

        {!cert ? (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Certificado no encontrado
            </h2>
            <p className="text-sm text-gray-500">
              Token #{params.tokenId} no existe o no es accesible.
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── 1. Estado del Certificado ── */}
            <div
              className={`rounded-xl p-5 border ${
                cert.isRevoked
                  ? "bg-red-50 text-red-800 border-red-300"
                  : "bg-green-50 text-green-800 border-green-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
                    Estado del Certificado
                  </p>
                  <p className="text-2xl font-bold">
                    {cert.isRevoked ? "Revocado" : "Valido"}
                  </p>
                  <p className="text-base mt-1 opacity-90 font-medium">
                    {getAttribute(certAttrs, "microcredencial") !== "—"
                      ? getAttribute(certAttrs, "microcredencial")
                      : `Certificado #${cert.tokenId}`}
                  </p>
                  <p className="text-sm opacity-80 mt-0.5">
                    {getAttribute(certAttrs, "institucion") !== "—"
                      ? getAttribute(certAttrs, "institucion")
                      : "ISTER"}
                    {getAttribute(certAttrs, "fecha") !== "—" && (
                      <>
                        {" · "}
                        {new Date(getAttribute(certAttrs, "fecha")).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </p>
                </div>
                <span className="text-5xl" aria-hidden="true">
                  {cert.isRevoked ? "✗" : "✓"}
                </span>
              </div>
            </div>

            {/* ── 2. Detalles Academicos ── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Detalles Academicos
              </h2>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500 text-xs">Fecha de emision</dt>
                  <dd className="font-medium">
                    {getAttribute(certAttrs, "fecha") !== "—"
                      ? new Date(getAttribute(certAttrs, "fecha")).toLocaleDateString("es-ES")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Creditos ECTS</dt>
                  <dd className="font-medium">{getAttribute(certAttrs, "ects")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Nivel EQF</dt>
                  <dd className="font-medium">{getAttribute(certAttrs, "eqf")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Modalidad</dt>
                  <dd className="font-medium">{getAttribute(certAttrs, "modalidad")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Tipo de Evaluacion</dt>
                  <dd className="font-medium">{getAttribute(certAttrs, "evaluac")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Soulbound</dt>
                  <dd className="font-medium">{cert.isLocked ? "Si" : "No"}</dd>
                </div>
              </dl>

              {getAttribute(certAttrs, "aprendizaje") !== "—" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <dt className="text-gray-500 text-xs mb-1">Resultados de Aprendizaje</dt>
                  <dd className="text-sm text-gray-700">
                    {getAttribute(certAttrs, "aprendizaje")}
                  </dd>
                </div>
              )}
            </div>

            {/* ── 3. Evidencias ── */}
            {Array.isArray((cert.metadata as Record<string, unknown> | null)?.evidence) &&
              ((cert.metadata as { evidence: EvidenceItem[] }).evidence).length > 0 && (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <EvidenceList
                  evidence={
                    (cert.metadata as { evidence: EvidenceItem[] }).evidence.map((ev) => ({
                      type:
                        ev.type?.toLowerCase() === "pdf" ||
                        ev.type?.toLowerCase() === "documento"
                          ? "document"
                          : ev.type?.toLowerCase() === "imagen" ||
                            ev.type?.toLowerCase() === "image"
                          ? "image"
                          : ev.type?.toLowerCase() === "video"
                          ? "video"
                          : "link",
                      title: ev.title,
                      url: ev.url,
                      hash: ev.hash,
                    }))
                  }
                />
              </div>
            )}

            {/* ── 4. Prueba Blockchain ── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <BlockchainProofHeading />
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray-500 shrink-0 w-32">Token ID</dt>
                  <dd className="font-mono font-bold">#{cert.tokenId}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 shrink-0 w-32">Red</dt>
                  <dd>Sepolia Testnet</dd>
                </div>
                {cert.txHash && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 shrink-0 w-32">TX Hash</dt>
                    <dd>
                      <a
                        href={`${EXPLORER_BASE}/tx/${cert.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-brand-600 hover:underline"
                      >
                        {cert.txHash.slice(0, 10)}...{cert.txHash.slice(-6)}
                      </a>
                    </dd>
                  </div>
                )}
                {CONTRACT_ADDRESS && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 shrink-0 w-32">Contrato</dt>
                    <dd>
                      <a
                        href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-brand-600 hover:underline"
                      >
                        {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
                      </a>
                    </dd>
                  </div>
                )}
                {cert.tokenURI && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 shrink-0 w-32">Metadatos IPFS</dt>
                    <dd>
                      <a
                        href={ipfsToHttp(cert.tokenURI)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Ver en IPFS
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* ── 5. QR Code ── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Codigo QR de Verificacion</h3>
              <p className="text-xs text-gray-500 mb-4">
                Escanea para verificar la autenticidad de este certificado
              </p>
              <QRCodeSection url={verifyUrl} tokenId={params.tokenId} />
            </div>

            {/* ── 6. Descargar PDF ── */}
            {!cert.isRevoked && (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800">Descargar Certificado</h3>
                <p className="text-xs text-gray-500">
                  Descarga una copia en PDF de este certificado con codigo QR de verificacion.
                </p>
                <VerifyDownloadButton
                  tokenId={params.tokenId}
                  attributes={certAttrs}
                  txHash={cert.txHash}
                />
              </div>
            )}

            {/* ── 7. Añadir a LinkedIn ── */}
            {!cert.isRevoked && (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800">Compartir en LinkedIn</h3>
                <p className="text-xs text-gray-500">
                  Añade este certificado a tu perfil de LinkedIn para compartirlo con empleadores.
                </p>
                <LinkedInButton
                  certTitle={
                    getAttribute(certAttrs, "microcredencial") !== "—"
                      ? getAttribute(certAttrs, "microcredencial")
                      : `Certificado #${cert.tokenId}`
                  }
                  issueDate={getAttribute(certAttrs, "fecha")}
                  tokenId={params.tokenId}
                  certUrl={verifyUrl}
                />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
    </>
  );
}
