import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "EduCert — Certificados NFT",
  description: "Microcredenciales educativas como NFTs soulbound en blockchain",
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#2563eb" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
