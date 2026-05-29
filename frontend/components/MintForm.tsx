"use client";

import { useState, useRef } from "react";

interface EvidenceEntry {
  type: string;
  title: string;
  file: File | null;
  url: string;
}

interface MintResult {
  tokenId?: string;
  txHash?: string;
  ipfsCid: string;
  claimToken?: string;
  flow: "direct-mint" | "claim-by-email";
}

const EVIDENCE_TYPES = ["PDF", "Imagen", "Enlace", "Video"];
const EQF_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const PAISES = ["Espana", "Portugal"];
const MODALIDADES = ["Presencial", "Online", "Hibrido"];

const emptyEvidence = (): EvidenceEntry => ({
  type: "PDF",
  title: "",
  file: null,
  url: "",
});

export default function MintForm() {
  const [destinatarioMode, setDestinatarioMode] = useState<"wallet" | "email">("wallet");

  const [form, setForm] = useState({
    recipientName: "",
    recipientEmail: "",
    walletAddress: "",
    courseTitle: "",
    courseId: "",
    country: "Espana",
    issueDate: new Date().toISOString().split("T")[0],
    learningOutcomes: "",
    ects: "1",
    eqfLevel: "5",
    assessmentType: "",
    participationMode: "Online",
    studentIdHash: "",
  });

  const [evidences, setEvidences] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState("");
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addEvidence() {
    setEvidences((prev) => [...prev, emptyEvidence()]);
  }

  function removeEvidence(i: number) {
    setEvidences((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateEvidence(i: number, patch: Partial<EvidenceEntry>) {
    setEvidences((prev) =>
      prev.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const fd = new FormData();

      fd.append("recipientName", form.recipientName);
      fd.append("courseTitle", form.courseTitle);
      fd.append("courseId", form.courseId);
      fd.append("studentIdHash", form.studentIdHash || `hash-${Date.now()}`);
      fd.append("issueDate", form.issueDate);
      fd.append("ects", form.ects);
      fd.append("eqfLevel", form.eqfLevel);
      fd.append("assessmentType", form.assessmentType);
      fd.append("participationMode", form.participationMode);
      fd.append("learningOutcomes", form.learningOutcomes);

      if (destinatarioMode === "email") {
        fd.append("recipientEmail", form.recipientEmail);
      } else {
        fd.append("walletAddress", form.walletAddress);
      }

      const titles: string[] = [];
      const types: string[] = [];

      for (const ev of evidences) {
        if (ev.file) {
          fd.append("evidences", ev.file, ev.file.name);
          titles.push(ev.title || ev.file.name);
          types.push(ev.type);
        }
      }

      if (titles.length > 0) {
        fd.append("evidenceTitles", JSON.stringify(titles));
        fd.append("evidenceTypes", JSON.stringify(types));
      }

      const res = await fetch("/api/mint", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al emitir");

      setResult(data as MintResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-5">Emitir Microcredencial</h2>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* --- Destinatario toggle --- */}
        <div>
          <p className={labelCls}>Metodo de entrega</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDestinatarioMode("wallet")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                destinatarioMode === "wallet"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Wallet directa (0x...)
            </button>
            <button
              type="button"
              onClick={() => setDestinatarioMode("email")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                destinatarioMode === "email"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Enlace de reclamacion por email
            </button>
          </div>
        </div>

        {/* --- Nombre del participante --- */}
        <div>
          <label className={labelCls}>Nombre del participante *</label>
          <input
            type="text"
            placeholder="Juan Garcia Lopez"
            value={form.recipientName}
            onChange={(e) => setField("recipientName", e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* --- Email (solo si modo email) --- */}
        {destinatarioMode === "email" && (
          <div>
            <label className={labelCls}>Email del participante *</label>
            <input
              type="email"
              placeholder="participante@ejemplo.com"
              value={form.recipientEmail}
              onChange={(e) => setField("recipientEmail", e.target.value)}
              className={inputCls}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Se enviara un enlace de reclamacion con validez de 48 horas
            </p>
          </div>
        )}

        {/* --- Wallet (solo si modo wallet) --- */}
        {destinatarioMode === "wallet" && (
          <div>
            <label className={labelCls}>Direccion de cartera *</label>
            <input
              type="text"
              placeholder="0x..."
              value={form.walletAddress}
              onChange={(e) => setField("walletAddress", e.target.value)}
              className={inputCls}
              required
            />
          </div>
        )}

        {/* --- Titulo de la microcredencial --- */}
        <div>
          <label className={labelCls}>Titulo de la Microcredencial *</label>
          <input
            type="text"
            placeholder="Desarrollo Web Avanzado"
            value={form.courseTitle}
            onChange={(e) => setField("courseTitle", e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* --- ID del curso --- */}
        <div>
          <label className={labelCls}>ID del Curso *</label>
          <input
            type="text"
            placeholder="ISTER-DW-2024-001"
            value={form.courseId}
            onChange={(e) => setField("courseId", e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* --- Institucion Emisora (fijo) --- */}
        <div>
          <label className={labelCls}>Institucion Emisora</label>
          <input
            type="text"
            value="ISTER"
            readOnly
            className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
          />
        </div>

        {/* --- Pais --- */}
        <div>
          <label className={labelCls}>Pais</label>
          <select
            value={form.country}
            onChange={(e) => setField("country", e.target.value)}
            className={inputCls}
          >
            {PAISES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* --- Fecha de emision --- */}
        <div>
          <label className={labelCls}>Fecha de emision *</label>
          <input
            type="date"
            value={form.issueDate}
            onChange={(e) => setField("issueDate", e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* --- Resultados de Aprendizaje --- */}
        <div>
          <label className={labelCls}>Resultados de Aprendizaje *</label>
          <textarea
            rows={3}
            placeholder="El participante sera capaz de..."
            value={form.learningOutcomes}
            onChange={(e) => setField("learningOutcomes", e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* --- ECTS + EQF --- */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Creditos ECTS *</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="5"
              value={form.ects}
              onChange={(e) => setField("ects", e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Nivel EQF *</label>
            <select
              value={form.eqfLevel}
              onChange={(e) => setField("eqfLevel", e.target.value)}
              className={inputCls}
            >
              {EQF_LEVELS.map((n) => (
                <option key={n} value={n}>Nivel {n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- Tipo de Evaluacion --- */}
        <div>
          <label className={labelCls}>Tipo de Evaluacion *</label>
          <input
            type="text"
            placeholder="Proyecto final, Examen practico..."
            value={form.assessmentType}
            onChange={(e) => setField("assessmentType", e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* --- Modalidad --- */}
        <div>
          <label className={labelCls}>Modalidad *</label>
          <select
            value={form.participationMode}
            onChange={(e) => setField("participationMode", e.target.value)}
            className={inputCls}
          >
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* --- Student ID Hash (avanzado) --- */}
        <div>
          <label className={labelCls}>ID Alumno (hash interno)</label>
          <input
            type="text"
            placeholder="Hash opaco del ID interno (sin datos personales)"
            value={form.studentIdHash}
            onChange={(e) => setField("studentIdHash", e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Se genera automaticamente si se deja vacio. Nunca uses datos personales reales.
          </p>
        </div>

        {/* --- Evidencias --- */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className={labelCls}>Evidencias</p>
            <button
              type="button"
              onClick={addEvidence}
              className="text-sm text-brand-600 hover:underline font-medium"
            >
              + Agregar Evidencia
            </button>
          </div>

          {evidences.length === 0 && (
            <p className="text-sm text-gray-400">Sin evidencias adjuntas</p>
          )}

          <div className="space-y-4">
            {evidences.map((ev, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Evidencia {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeEvidence(i)}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Eliminar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                    <select
                      value={ev.type}
                      onChange={(e) => updateEvidence(i, { type: e.target.value })}
                      className={inputCls}
                    >
                      {EVIDENCE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Titulo</label>
                    <input
                      type="text"
                      placeholder="Descripcion de la evidencia"
                      value={ev.title}
                      onChange={(e) => updateEvidence(i, { title: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>

                {(ev.type === "PDF" || ev.type === "Imagen") ? (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Archivo ({ev.type === "PDF" ? "PDF" : "PDF o imagen"})
                    </label>
                    <input
                      type="file"
                      accept={ev.type === "PDF" ? "application/pdf" : "application/pdf,image/*"}
                      ref={(el) => { fileRefs.current[i] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        updateEvidence(i, { file });
                      }}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={ev.url}
                      onChange={(e) => updateEvidence(i, { url: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* --- Submit --- */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Emitiendo..." : "Emitir Microcredencial"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
          {result.flow === "claim-by-email" ? (
            <>
              <p className="font-medium text-green-800 mb-2">
                Microcredencial creada. Enlace de reclamacion enviado por email.
              </p>
              <dl className="space-y-1">
                <div className="flex gap-2">
                  <dt className="text-gray-600 shrink-0">Token de reclamacion:</dt>
                  <dd className="font-mono text-xs truncate">{result.claimToken}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-600 shrink-0">IPFS CID:</dt>
                  <dd className="font-mono text-xs truncate">{result.ipfsCid}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <p className="font-medium text-green-800 mb-2">
                Certificado emitido correctamente.
              </p>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
