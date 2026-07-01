"use client";

import { useState } from "react";
import { keccak256 } from "viem";
import { ipfsToHttp } from "@/lib/ipfs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  type: "document" | "image" | "link" | "video";
  title: string;
  url: string;
  /** keccak256 hex digest of the file content, optional */
  hash?: string;
}

interface IntegrityState {
  status: "idle" | "checking" | "ok" | "fail" | "error";
  message?: string;
}

// ---------------------------------------------------------------------------
// Icons — inline SVGs, no extra dep, no wallet code
// ---------------------------------------------------------------------------

function IconDocument() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0 text-red-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0 text-green-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0 text-purple-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function typeIcon(type: EvidenceItem["type"]) {
  switch (type) {
    case "document":
      return <IconDocument />;
    case "image":
      return <IconImage />;
    case "video":
      return <IconVideo />;
    default:
      return <IconLink />;
  }
}

function typeLabel(type: EvidenceItem["type"]) {
  switch (type) {
    case "document":
      return "Documento";
    case "image":
      return "Imagen";
    case "video":
      return "Video";
    default:
      return "Enlace";
  }
}

function openLabel(type: EvidenceItem["type"]) {
  switch (type) {
    case "document":
      return "Ver PDF";
    case "image":
      return "Ver imagen";
    case "video":
      return "Ver video";
    default:
      return "Abrir enlace";
  }
}

// ---------------------------------------------------------------------------
// Integrity check logic
// ---------------------------------------------------------------------------

async function verifyIntegrity(
  url: string,
  storedHash: string
): Promise<{ ok: boolean; message: string }> {
  const resolvedUrl = ipfsToHttp(url);

  const res = await fetch(resolvedUrl);
  if (!res.ok) {
    throw new Error(`Error al obtener el archivo (${res.status})`);
  }

  const buffer = await res.arrayBuffer();
  const computed = keccak256(new Uint8Array(buffer));

  const normalised = storedHash.startsWith("0x") ? storedHash : `0x${storedHash}`;
  const ok = computed.toLowerCase() === normalised.toLowerCase();

  return {
    ok,
    message: ok
      ? `Hash verificado: ${computed.slice(0, 18)}…`
      : `Hash no coincide.\nEsperado: ${normalised.slice(0, 18)}…\nCalculado: ${computed.slice(0, 18)}…`,
  };
}

// ---------------------------------------------------------------------------
// Single evidence card
// ---------------------------------------------------------------------------

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [integrity, setIntegrity] = useState<IntegrityState>({ status: "idle" });

  const resolvedUrl = ipfsToHttp(item.url);

  async function handleVerify() {
    if (!item.hash) return;
    setIntegrity({ status: "checking" });
    try {
      const result = await verifyIntegrity(item.url, item.hash);
      setIntegrity({
        status: result.ok ? "ok" : "fail",
        message: result.message,
      });
    } catch (err) {
      setIntegrity({
        status: "error",
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{typeIcon(item.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm leading-snug truncate">
            {item.title}
          </p>
          <span className="inline-block mt-0.5 text-xs text-gray-400">
            {typeLabel(item.type)}
          </span>
        </div>
      </div>

      {/* Inline image thumbnail 80x80 */}
      {item.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedUrl}
          alt={item.title}
          width={80}
          height={80}
          className="rounded-lg object-cover"
          style={{ width: 80, height: 80 }}
        />
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          {openLabel(item.type)}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        {/* PDF: extra Descargar button with download attribute */}
        {item.type === "document" && (
          <a
            href={resolvedUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Descargar
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        )}

        {item.hash && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={integrity.status === "checking"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {integrity.status === "checking" ? (
              <>
                <svg
                  className="h-3 w-3 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Verificando...
              </>
            ) : (
              "Verificar integridad"
            )}
          </button>
        )}
      </div>

      {/* Integrity result badge */}
      {integrity.status !== "idle" && integrity.status !== "checking" && (
        <div
          className={`rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
            integrity.status === "ok"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <span className="font-bold mr-1">
            {integrity.status === "ok" ? "✓" : "✗"}
          </span>
          {integrity.message}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface EvidenceListProps {
  evidence: EvidenceItem[];
}

export default function EvidenceList({ evidence }: EvidenceListProps) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <section aria-labelledby="evidence-heading">
      <h2
        id="evidence-heading"
        className="text-base font-semibold text-gray-700 mb-3"
      >
        Evidencias adjuntas ({evidence.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {evidence.map((item, idx) => (
          <EvidenceCard key={idx} item={item} />
        ))}
      </div>
    </section>
  );
}
