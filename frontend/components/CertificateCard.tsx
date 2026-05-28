import { CertificateInfo } from "@/lib/api";

interface Props {
  cert: CertificateInfo;
}

function getAttribute(metadata: Record<string, unknown> | null, trait: string): string {
  if (!metadata) return "—";
  const attrs = metadata.attributes as Array<{ trait_type: string; value: string }> | undefined;
  return attrs?.find((a) => a.trait_type === trait)?.value ?? "—";
}

export default function CertificateCard({ cert }: Props) {
  const courseName = getAttribute(cert.metadata, "Curso");
  const issuedAt = getAttribute(cert.metadata, "Emitido em");
  const courseId = getAttribute(cert.metadata, "Course ID");

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-800">
            {courseName !== "—" ? courseName : `Certificado #${cert.tokenId}`}
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
          {cert.isRevoked ? "Revogado" : "Válido"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-gray-500">Proprietário</dt>
          <dd className="font-mono text-xs truncate">{cert.owner}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Emitido em</dt>
          <dd>{issuedAt !== "—" ? new Date(issuedAt).toLocaleDateString("pt-BR") : "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Curso ID</dt>
          <dd>{courseId}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Soulbound</dt>
          <dd>{cert.isLocked ? "Sim" : "Não"}</dd>
        </div>
      </dl>

      {cert.tokenURI && (
        <a
          href={cert.tokenURI.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs text-brand-600 hover:underline"
        >
          Ver metadados no IPFS
        </a>
      )}
    </div>
  );
}
