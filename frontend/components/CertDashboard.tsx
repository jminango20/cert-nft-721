"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { contractAbi } from "@/lib/contractAbi";

const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "";
const EXPLORER = "https://sepolia.etherscan.io";

interface CertEntry {
  tokenId: string;
  to: string;
  txHash: string;
  course?: string;
  isRevoked?: boolean;
}

async function fetchIssuedCerts(): Promise<CertEntry[]> {
  if (!CONTRACT || !RPC_URL) return [];

  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    });

    const logs = await client.getLogs({
      address: CONTRACT,
      event: parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
      ),
      args: { from: "0x0000000000000000000000000000000000000000" },
      fromBlock: BigInt(0),
      toBlock: "latest",
    });

    return logs.map((log) => ({
      tokenId: log.args.tokenId?.toString() ?? "",
      to: (log.args.to as string) ?? "",
      txHash: log.transactionHash ?? "",
    }));
  } catch (err) {
    console.warn("[CertDashboard] fetchIssuedCerts failed:", err);
    return [];
  }
}

async function fetchCertStatus(
  tokenId: string
): Promise<{ course: string; isRevoked: boolean } | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/api/verify/${tokenId}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const attrs =
      (data.metadata?.attributes as Array<{ trait_type: string; value: string }>) ?? [];
    const course =
      attrs.find((a) => a.trait_type === "Microcredencial")?.value ?? `#${tokenId}`;
    return { course, isRevoked: data.isRevoked ?? false };
  } catch {
    return null;
  }
}

export default function CertDashboard() {
  const [certs, setCerts] = useState<CertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<"all" | "valid" | "revoked">("all");
  const [revokeTokenId, setRevokeTokenId] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState(false);

  const { writeContract, data: revokeTxHash, isPending: revokeLoading, error: revokeError } =
    useWriteContract();

  const { isSuccess: revokeSuccess } = useWaitForTransactionReceipt({ hash: revokeTxHash });

  useEffect(() => {
    setLoading(true);
    fetchIssuedCerts()
      .then(async (entries) => {
        // Enrich with status from backend (batched)
        const enriched = await Promise.all(
          entries.map(async (cert) => {
            const status = await fetchCertStatus(cert.tokenId);
            return {
              ...cert,
              course: status?.course,
              isRevoked: status?.isRevoked,
            };
          })
        );
        setCerts(enriched);
      })
      .finally(() => setLoading(false));
  }, [revokeSuccess]);

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      const matchSearch =
        search === "" ||
        c.tokenId.includes(search) ||
        c.to.toLowerCase().includes(search.toLowerCase()) ||
        (c.course ?? "").toLowerCase().includes(search.toLowerCase());

      const matchState =
        filterState === "all" ||
        (filterState === "valid" && !c.isRevoked) ||
        (filterState === "revoked" && c.isRevoked);

      return matchSearch && matchState;
    });
  }, [certs, search, filterState]);

  function handleRevokeClick(tokenId: string) {
    if (revokeTokenId === tokenId && revokeConfirm) {
      writeContract({
        address: CONTRACT,
        abi: contractAbi,
        functionName: "revoke",
        args: [BigInt(tokenId)],
      });
      setRevokeConfirm(false);
      setRevokeTokenId(null);
    } else {
      setRevokeTokenId(tokenId);
      setRevokeConfirm(true);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Certificados Emitidos</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por wallet, curso o Token ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex gap-2">
          {(["all", "valid", "revoked"] as const).map((state) => (
            <button
              key={state}
              onClick={() => setFilterState(state)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                filterState === state
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {state === "all" ? "Todos" : state === "valid" ? "Validos" : "Revocados"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Cargando certificados desde la blockchain...</p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-400">
          {certs.length === 0
            ? "No se encontraron certificados. Verifica que las variables de entorno del contrato esten configuradas."
            : "No hay resultados para los filtros actuales."}
        </p>
      )}

      {revokeConfirm && revokeTokenId && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800 flex items-center justify-between gap-4">
          <span>
            Confirmar revocacion del certificado #{revokeTokenId}? Esta accion es irreversible.
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleRevokeClick(revokeTokenId)}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
            >
              Confirmar
            </button>
            <button
              onClick={() => { setRevokeConfirm(false); setRevokeTokenId(null); }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {revokeError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Error al revocar: {revokeError.message}
        </div>
      )}

      {revokeSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Certificado revocado correctamente.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 text-xs">
                <th className="pb-2 pr-4 font-medium">Token ID</th>
                <th className="pb-2 pr-4 font-medium">Destinatario</th>
                <th className="pb-2 pr-4 font-medium">Curso</th>
                <th className="pb-2 pr-4 font-medium">Estado</th>
                <th className="pb-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert) => (
                <tr key={cert.tokenId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono font-bold">#{cert.tokenId}</td>
                  <td className="py-2 pr-4 font-mono text-xs truncate max-w-[120px]" title={cert.to}>
                    {cert.to ? `${cert.to.slice(0, 6)}...${cert.to.slice(-4)}` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-xs truncate max-w-[160px]" title={cert.course}>
                    {cert.course ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        cert.isRevoked === true
                          ? "bg-red-100 text-red-700"
                          : cert.isRevoked === false
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {cert.isRevoked === true
                        ? "Revocado"
                        : cert.isRevoked === false
                        ? "Valido"
                        : "—"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-3 items-center">
                      <Link
                        href={`/verify/${cert.tokenId}`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Ver
                      </Link>
                      {cert.txHash && (
                        <a
                          href={`${EXPLORER}/tx/${cert.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:underline"
                        >
                          TX
                        </a>
                      )}
                      {!cert.isRevoked && (
                        <button
                          onClick={() => handleRevokeClick(cert.tokenId)}
                          disabled={revokeLoading}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          Revocar
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
