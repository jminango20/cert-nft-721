import Link from "next/link";
import CertificateCard from "@/components/CertificateCard";
import { CertificateInfo } from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

async function getCert(tokenId: string): Promise<CertificateInfo | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/verify/${tokenId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function VerifyTokenPage({
  params,
}: {
  params: { tokenId: string };
}) {
  const cert = await getCert(params.tokenId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <Link href="/verify" className="text-sm text-brand-600 hover:underline mb-4 block">
          ← Verificar outro
        </Link>

        {!cert ? (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Certificado não encontrado
            </h2>
            <p className="text-sm text-gray-500">
              Token #{params.tokenId} não existe ou está inacessível.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`rounded-xl p-4 text-center font-semibold text-lg ${
                cert.isRevoked
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : "bg-green-100 text-green-800 border border-green-300"
              }`}
            >
              {cert.isRevoked
                ? "CERTIFICADO REVOGADO"
                : "CERTIFICADO VÁLIDO"}
            </div>
            <CertificateCard cert={cert} />
          </div>
        )}
      </div>
    </div>
  );
}
