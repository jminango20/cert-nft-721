import { CertificateInfo } from "@/lib/api";
import Link from "next/link";

interface Props {
  cert: CertificateInfo;
}

function getAttribute(metadata: Record<string, unknown> | null, trait: string): string {
  if (!metadata) return "—";
  const attrs = metadata.attributes as Array<{ trait_type: string; value: string }> | undefined;
  return attrs?.find((a) => a.trait_type === trait)?.value ?? "—";
}

export default function CertificateCard({ cert }: Props) {
  const courseTitle = getAttribute(cert.metadata, "Microcredencial");
  const issueDate = getAttribute(cert.metadata, "Fecha de emision");
  const ects = getAttribute(cert.metadata, "Creditos ECTS");
  const eqfLevel = getAttribute(cert.metadata, "Nivel EQF");
  const modalidad = getAttribute(cert.metadata, "Modalidad");

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-800">
            {courseTitle !== "—" ? courseTitle : `Certificado #${cert.tokenId}`}
          </h3>
          <p className="text-sm text-gray-500">Token #{cert.tokenId}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            cert.isRevoked
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {cert.isRevoked ? "Revocado" : "Valido"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div>
          <dt className="text-gray-500 text-xs">Fecha de emision</dt>
          <dd>{issueDate !== "—" ? new Date(issueDate).toLocaleDateString("es-ES") : "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Creditos ECTS</dt>
          <dd>{ects}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Nivel EQF</dt>
          <dd>{eqfLevel}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Modalidad</dt>
          <dd>{modalidad}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Soulbound</dt>
          <dd>{cert.isLocked ? "Si" : "No"}</dd>
        </div>
      </dl>

      <Link
        href={`/verify/${cert.tokenId}`}
        className="inline-block text-xs text-brand-600 hover:underline"
      >
        Ver certificado completo
      </Link>
    </div>
  );
}
