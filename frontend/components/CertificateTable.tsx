"use client";

import { useEffect, useState, useMemo } from "react";

export interface AdminCertificate {
  id: number;
  tokenId: string | null;
  txHash: string | null;
  recipientName: string | null;
  courseTitle: string | null;
  issuedAt: string | null;
  revokedAt: string | null;
  claimedAt: string | null;
  claimedBy: string | null;
  ownerAddress: string | null;
  ipfsCid: string | null;
  estado: "valido" | "pendente" | "revogado";
}

type FilterEstado = "all" | "valido" | "pendente" | "revogado";

function EstadoBadge({ estado }: { estado: AdminCertificate["estado"] }) {
  if (estado === "revogado") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <span aria-hidden="true">&#10007;</span> Revogado
      </span>
    );
  }
  if (estado === "pendente") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <span aria-hidden="true">&#9203;</span> Pendente claim
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span aria-hidden="true">&#10003;</span> Valido
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function CertificateTable() {
  const [certs, setCerts] = useState<AdminCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<FilterEstado>("all");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string>("");
  const [confirmTokenId, setConfirmTokenId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/api/admin/certificates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCerts(data as AdminCertificate[]);
        } else {
          setError(data.error ?? "Error al cargar certificados");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      const name = (c.recipientName ?? "").toLowerCase();
      const matchSearch = search === "" || name.includes(search.toLowerCase());
      const matchEstado = filterEstado === "all" || c.estado === filterEstado;
      return matchSearch && matchEstado;
    });
  }, [certs, search, filterEstado]);

  async function handleRevoke(tokenId: string) {
    if (confirmTokenId !== tokenId) {
      setConfirmTokenId(tokenId);
      return;
    }

    setConfirmTokenId(null);
    setRevoking(tokenId);
    setRevokeError("");

    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: parseInt(tokenId, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al revocar");

      // Update local state without page reload
      setCerts((prev) =>
        prev.map((c) =>
          c.tokenId === tokenId
            ? { ...c, estado: "revogado", revokedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setRevoking(null);
    }
  }

  function cancelConfirm() {
    setConfirmTokenId(null);
  }

  const filterLabels: Record<FilterEstado, string> = {
    all: "Todos",
    valido: "Validos",
    pendente: "Pendentes de claim",
    revogado: "Revogados",
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Certificados Emitidos
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filtered.length}{filtered.length !== certs.length ? ` de ${certs.length}` : ""})
            </span>
          )}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as FilterEstado)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {(Object.keys(filterLabels) as FilterEstado[]).map((key) => (
            <option key={key} value={key}>
              {filterLabels[key]}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Revoke error */}
      {revokeError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {revokeError}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmTokenId && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800 flex items-center justify-between gap-4">
          <span>
            Revocar certificado #{confirmTokenId}? Esta accion es irreversible.
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleRevoke(confirmTokenId)}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
            >
              Confirmar
            </button>
            <button
              onClick={cancelConfirm}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-gray-500 py-8 text-center">
          Cargando certificados...
        </p>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">
          {certs.length === 0
            ? "No hay certificados registrados aun."
            : "Ninguno coincide con los filtros actuales."}
        </p>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 text-xs">
                <th className="pb-2 pr-4 font-medium">Nombre</th>
                <th className="pb-2 pr-4 font-medium">Curso</th>
                <th className="pb-2 pr-4 font-medium">Emision</th>
                <th className="pb-2 pr-4 font-medium">Estado</th>
                <th className="pb-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert) => (
                <tr
                  key={cert.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    cert.estado === "revogado" ? "bg-red-50 hover:bg-red-50" : ""
                  }`}
                >
                  <td className="py-2.5 pr-4 font-medium text-gray-800">
                    {cert.recipientName ?? "—"}
                  </td>
                  <td
                    className="py-2.5 pr-4 text-gray-600 truncate max-w-[160px]"
                    title={cert.courseTitle ?? undefined}
                  >
                    {cert.courseTitle ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                    {formatDate(cert.issuedAt)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <EstadoBadge estado={cert.estado} />
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-3 items-center">
                      {cert.tokenId ? (
                        <a
                          href={`/verify/${cert.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                          title="Ver certificado"
                        >
                          Ver
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">Ver</span>
                      )}
                      {cert.estado !== "revogado" && cert.tokenId && (
                        <button
                          onClick={() => handleRevoke(cert.tokenId!)}
                          disabled={revoking === cert.tokenId}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                          title="Revogar certificado"
                        >
                          {revoking === cert.tokenId ? "Revogando..." : "Revogar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
