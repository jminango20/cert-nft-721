"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import PrivyButton from "@/components/PrivyButton";
import CertificateCard from "@/components/CertificateCard";
import { api, CertificateInfo } from "@/lib/api";

export default function AlunoPage() {
  const { ready, authenticated } = usePrivy();
  const [tokenId, setTokenId] = useState("");
  const [cert, setCert] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCert(null);
    try {
      const result = await api.verify(tokenId);
      setCert(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar el certificado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline mb-1 block">
            Inicio
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Mis Certificados</h1>
          <p className="text-sm text-gray-500">Acceso con email o Google via Privy</p>
        </div>
        <PrivyButton />
      </header>

      {!ready || !authenticated ? (
        <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200">
          <div className="text-4xl mb-3">🎓</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Inicia sesion para ver tus certificados
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Accede con tu email o cuenta de Google
          </p>
          <PrivyButton />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Buscar certificado por Token ID</h2>
            <form onSubmit={handleVerify} className="flex gap-2">
              <input
                type="number"
                min="1"
                placeholder="Token ID"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </form>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {cert && <CertificateCard cert={cert} />}
        </div>
      )}
    </div>
  );
}
