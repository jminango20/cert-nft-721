import Link from "next/link";
import { CertificateInfo } from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-2xl w-full space-y-4">
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

            {/* Status badge */}
            <div
              className={`rounded-xl p-4 text-center font-semibold text-lg ${
                cert.isRevoked
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : "bg-green-100 text-green-800 border border-green-300"
              }`}
            >
              {cert.isRevoked ? "Revocado" : "Valido"}
            </div>

            {/* Certificate data */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {getAttribute(cert.metadata, "Microcredencial") !== "—"
                  ? getAttribute(cert.metadata, "Microcredencial")
                  : `Certificado #${cert.tokenId}`}
              </h2>
              <p className="text-sm text-gray-500 font-mono mb-4">
                {getAttribute(cert.metadata, "Course ID")}
              </p>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500 text-xs">Fecha de emision</dt>
                  <dd className="font-medium">
                    {getAttribute(cert.metadata, "Fecha de emision") !== "—"
                      ? new Date(getAttribute(cert.metadata, "Fecha de emision")).toLocaleDateString("es-ES")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Creditos ECTS</dt>
                  <dd className="font-medium">{getAttribute(cert.metadata, "Creditos ECTS")}</dd>
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
                  <dd className="font-medium">{getAttribute(cert.metadata, "Tipo de Evaluacion")}</dd>
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

            {/* Blockchain proof */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Prueba Blockchain</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray-500 shrink-0 w-32">Token ID</dt>
                  <dd className="font-mono font-bold">#{cert.tokenId}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 shrink-0 w-32">Propietario</dt>
                  <dd className="font-mono text-xs truncate">{cert.owner}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 shrink-0 w-32">Red</dt>
                  <dd>Sepolia</dd>
                </div>
                {CONTRACT_ADDRESS && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 shrink-0 w-32">Contrato</dt>
                    <dd>
                      <a
                        href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-brand-600 hover:underline truncate block"
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

            {/* Evidence section */}
            {Array.isArray((cert.metadata as Record<string, unknown> | null)?.evidence) &&
              ((cert.metadata as { evidence: EvidenceItem[] }).evidence).length > 0 && (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-3">Evidencias</h3>
                <ul className="space-y-3">
                  {((cert.metadata as { evidence: EvidenceItem[] }).evidence).map((ev, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {ev.type}
                        </span>
                        <span className="text-gray-700">{ev.title}</span>
                        {ev.hash && (
                          <span
                            className="text-xs text-gray-400 font-mono hidden sm:block"
                            title={`SHA-256: ${ev.hash}`}
                          >
                            SHA-256: {ev.hash.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                      {ev.url && ev.url.startsWith("ipfs://") && (
                        <a
                          href={ipfsToHttp(ev.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline shrink-0"
                        >
                          Descargar
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
