import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-brand-700 mb-3">EduCert</h1>
        <p className="text-gray-600 mb-10 text-lg">
          Microcredenciales educativas como NFTs soulbound en la blockchain
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/admin"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-200 hover:border-brand-500 transition-all"
          >
            <div className="text-3xl mb-2">🏛️</div>
            <h2 className="font-semibold text-gray-800 mb-1">Administrador</h2>
            <p className="text-sm text-gray-500">Emitir y revocar certificados</p>
          </Link>

          <Link
            href="/alumno"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-200 hover:border-brand-500 transition-all"
          >
            <div className="text-3xl mb-2">🎓</div>
            <h2 className="font-semibold text-gray-800 mb-1">Mis Certificados</h2>
            <p className="text-sm text-gray-500">Ver tus microcredenciales</p>
          </Link>

          <Link
            href="/verify"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-200 hover:border-brand-500 transition-all"
          >
            <div className="text-3xl mb-2">🔍</div>
            <h2 className="font-semibold text-gray-800 mb-1">Verificar</h2>
            <p className="text-sm text-gray-500">Verificar autenticidad de un certificado</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
