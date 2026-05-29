"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";

interface CertEntry {
  tokenId: string;
  to: string;
  txHash: string;
}

async function fetchIssuedCerts(): Promise<CertEntry[]> {
  const results: CertEntry[] = [];
  const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

  if (!CONTRACT || !RPC_URL) return results;

  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const ABI = [
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    ];
    const contract = new ethers.Contract(CONTRACT, ABI, provider);
    const filter = contract.filters.Transfer(ethers.constants.AddressZero);
    const logs = await contract.queryFilter(filter, -5000);

    for (const log of logs) {
      const parsed = contract.interface.parseLog(log);
      results.push({
        tokenId: parsed.args.tokenId.toString(),
        to: parsed.args.to as string,
        txHash: log.transactionHash,
      });
    }
  } catch (err) {
    console.warn("[CertDashboard] fetchIssuedCerts failed:", err);
  }

  return results;
}

export default function CertDashboard() {
  const [certs, setCerts] = useState<CertEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssuedCerts()
      .then(setCerts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Certificados Emitidos</h2>

      {loading && (
        <p className="text-sm text-gray-500">Cargando certificados...</p>
      )}

      {!loading && certs.length === 0 && (
        <p className="text-sm text-gray-400">
          No se encontraron certificados, o las variables de entorno del contrato no estan configuradas.
        </p>
      )}

      {!loading && certs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 pr-4">Token ID</th>
                <th className="pb-2 pr-4">Destinatario</th>
                <th className="pb-2 pr-4">TX Hash</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((cert) => (
                <tr key={cert.tokenId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono font-bold">#{cert.tokenId}</td>
                  <td className="py-2 pr-4 font-mono text-xs truncate max-w-[120px]" title={cert.to}>
                    {cert.to.slice(0, 6)}...{cert.to.slice(-4)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs truncate max-w-[140px]" title={cert.txHash}>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${cert.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      {cert.txHash.slice(0, 10)}...
                    </a>
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/verify/${cert.tokenId}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Verificar
                    </Link>
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
