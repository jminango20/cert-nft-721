"use client";

import { useState } from "react";
import { api, MintResult } from "@/lib/api";

export default function MintForm() {
  const [form, setForm] = useState({
    studentWallet: "",
    courseName: "",
    studentIdHash: "",
    courseId: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.mint({
        ...form,
        issuedAt: new Date().toISOString(),
      });
      setResult(res);
      setForm({ studentWallet: "", courseName: "", studentIdHash: "", courseId: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Emitir Certificado</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Carteira do Aluno
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={form.studentWallet}
            onChange={(e) => setForm({ ...form, studentWallet: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Curso
          </label>
          <input
            type="text"
            placeholder="Ex: Desenvolvimento Web"
            value={form.courseName}
            onChange={(e) => setForm({ ...form, courseName: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID do Curso
          </label>
          <input
            type="text"
            placeholder="Ex: CS-2024-001"
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID do Aluno (hash)
          </label>
          <input
            type="text"
            placeholder="Hash opaco — sem dados pessoais"
            value={form.studentIdHash}
            onChange={(e) => setForm({ ...form, studentIdHash: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Use um hash do ID interno — nunca dados pessoais reais
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Emitindo..." : "Emitir Certificado"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
          <p className="font-medium text-green-800 mb-2">Certificado emitido com sucesso!</p>
          <dl className="space-y-1">
            <div className="flex gap-2">
              <dt className="text-gray-600 shrink-0">Token ID:</dt>
              <dd className="font-mono font-bold">{result.tokenId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-600 shrink-0">TX:</dt>
              <dd className="font-mono text-xs truncate">{result.txHash}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-600 shrink-0">IPFS CID:</dt>
              <dd className="font-mono text-xs truncate">{result.ipfsCid}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
