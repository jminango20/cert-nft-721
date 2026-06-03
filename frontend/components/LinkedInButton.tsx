"use client";

interface Props {
  certTitle: string;
  issueDate: string; // ISO date string or "—"
  tokenId: string | number;
  certUrl: string;
  organizationName?: string;
  className?: string;
}

function buildLinkedInUrl({
  certTitle,
  issueDate,
  tokenId,
  certUrl,
  organizationName = "ISTER",
}: Props): string {
  const params = new URLSearchParams();
  params.set("startTask", "CERTIFICATION_NAME");
  params.set("name", certTitle);
  params.set("organizationName", organizationName);

  if (issueDate && issueDate !== "—") {
    try {
      const d = new Date(issueDate);
      if (!isNaN(d.getTime())) {
        params.set("issueYear", String(d.getFullYear()));
        params.set("issueMonth", String(d.getMonth() + 1));
      }
    } catch {
      // skip date params if parsing fails
    }
  }

  if (certUrl) params.set("certUrl", certUrl);
  params.set("certId", String(tokenId));

  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export default function LinkedInButton({
  certTitle,
  issueDate,
  tokenId,
  certUrl,
  organizationName,
  className,
}: Props) {
  const href = buildLinkedInUrl({
    certTitle,
    issueDate,
    tokenId,
    certUrl,
    organizationName,
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0077b5] text-[#0077b5] text-sm font-medium hover:bg-[#0077b5] hover:text-white transition-colors"
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
      Añadir a LinkedIn
    </a>
  );
}
