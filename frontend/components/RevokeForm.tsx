"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function RevokeForm() {
  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txHash: string; tokenId: number } | null>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.revoke(parseInt(tokenId, 10));
      setResult(res);
      setTokenId("");
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Revocar Certificado</h2>
      <p className="text-sm text-red-600 mb-4">
        Atencion: la revocacion es permanente e irreversible.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token ID
          </label>
          <input
            type="number"
            min="1"
            placeholder="Ej: 42"
            value={tokenId}
            onChange={(e) => { setTokenId(e.target.value); setConfirmed(false); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            required
          />
        </div>

        {confirmed && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800">
            Confirmar revocacion del certificado #{tokenId}? Esta accion no se puede deshacer.
            Haz clic de nuevo para confirmar.
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !tokenId}
          className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Revocando..." : confirmed ? "Confirmar Revocacion" : "Revocar Certificado"}
        </button>

        {confirmed && (
          <button
            type="button"
            onClick={() => setConfirmed(false)}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        )}
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
          <p className="font-medium text-green-800 mb-2">Certificado #{result.tokenId} revocado.</p>
          <p className="font-mono text-xs truncate text-gray-600">{result.txHash}</p>
        </div>
      )}
    </div>
  );
}
