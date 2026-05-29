import Link from "next/link";
import { CertificateInfo } from "@/lib/api";
import QRCodeSection from "@/components/QRCodeSection";
import EvidenceList from "@/components/EvidenceList";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const EXPLORER_BASE = "https://sepolia.etherscan.io";

interface EvidenceItem {
  type: string;
  title: string;
  url: string;
  hash?: string;
  mimeType?: string;
}

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

function getAttribute(metadata: Record<string, unknown> | null, trait: string): string {
  if (!metadata) return "—";
  const attrs = metadata.attributes as Array<{ trait_type: string; value: string }> | undefined;
  return attrs?.find((a) => a.trait_type === trait)?.value ?? "—";
}

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace("ipfs://", "")}`;
  }
  return uri;
}

export default async function VerifyTokenPage({
  params,
}: {
  params: { tokenId: string };
}) {
  const cert = await getCert(params.tokenId);
  const verifyUrl = `${APP_URL}/verify/${params.tokenId}`;

  return (
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

            {/* Estado del Certificado */}
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
                  {getAttribute(cert.metadata, "Nombre del Participante") !== "—" && (
                    <p className="text-base mt-1 opacity-90">
                      {getAttribute(cert.metadata, "Nombre del Participante")}
                    </p>
                  )}
                  <p className="text-sm opacity-80 mt-0.5">
                    {getAttribute(cert.metadata, "Microcredencial") !== "—"
                      ? getAttribute(cert.metadata, "Microcredencial")
                      : `Certificado #${cert.tokenId}`}
                    {" — "}
                    {getAttribute(cert.metadata, "Institucion") !== "—"
                      ? getAttribute(cert.metadata, "Institucion")
                      : "ISTER"}
                  </p>
                </div>
                <span className="text-5xl" aria-hidden="true">
                  {cert.isRevoked ? "✗" : "✓"}
                </span>
              </div>
            </div>

            {/* Detalles Academicos */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Detalles Academicos
              </h2>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500 text-xs">Fecha de emision</dt>
                  <dd className="font-medium">
                    {getAttribute(cert.metadata, "Fecha de emisión") !== "—"
                      ? new Date(getAttribute(cert.metadata, "Fecha de emisión")).toLocaleDateString("es-ES")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Creditos ECTS</dt>
                  <dd className="font-medium">{getAttribute(cert.metadata, "Créditos ECTS")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Nivel EQF</dt>
                  <dd className="font-medium">{getAttribute(cert.metadata, "Nivel EQF")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Modalidad</dt>
                  <dd className="font-medium">{getAttribute(cert.metadata, "Modalidad")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Tipo de Evaluacion</dt>
                  <dd className="font-medium">{getAttribute(cert.metadata, "Tipo de Evaluación")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Soulbound</dt>
                  <dd className="font-medium">{cert.isLocked ? "Si" : "No"}</dd>
                </div>
              </dl>

              {getAttribute(cert.metadata, "Resultados de Aprendizaje") !== "—" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <dt className="text-gray-500 text-xs mb-1">Resultados de Aprendizaje</dt>
                  <dd className="text-sm text-gray-700">
                    {getAttribute(cert.metadata, "Resultados de Aprendizaje")}
                  </dd>
                </div>
              )}
            </div>

            {/* Prueba Blockchain */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Prueba Blockchain</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray-500 shrink-0 w-32">Token ID</dt>
                  <dd className="font-mono font-bold">#{cert.tokenId}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 shrink-0 w-32">Red</dt>
                  <dd>Sepolia Testnet</dd>
                </div>
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

            {/* Evidencias */}
            {Array.isArray((cert.metadata as Record<string, unknown> | null)?.evidence) &&
              ((cert.metadata as { evidence: EvidenceItem[] }).evidence).length > 0 && (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <EvidenceList
                  evidence={
                    (cert.metadata as { evidence: EvidenceItem[] }).evidence.map((ev) => ({
                      type: ev.type?.toLowerCase() === "pdf" || ev.type?.toLowerCase() === "documento"
                        ? "document"
                        : ev.type?.toLowerCase() === "imagen" || ev.type?.toLowerCase() === "image"
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

            {/* QR Code */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Codigo QR de Verificacion</h3>
              <p className="text-xs text-gray-500 mb-4">
                Escanea para verificar la autenticidad de este certificado
              </p>
              <QRCodeSection url={verifyUrl} tokenId={params.tokenId} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
