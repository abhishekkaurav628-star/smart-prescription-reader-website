import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1f2a63" />
      <g transform="rotate(-40 32 32)">
        <rect x="12" y="22" width="40" height="20" rx="10" fill="#ffffff" />
        <path d="M32 22h10a10 10 0 0 1 0 20H32z" fill="#2dd4bf" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-navy-900"}`}>
        Medi<span className="text-teal-500">Scan</span>
      </span>
    </Link>
  );
}
